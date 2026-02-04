import json

import httpx
from lnbits.core.models import CreateInvoice, Payment
from lnbits.core.services import create_payment_request
from lnbits.helpers import create_access_token
from lnbits.settings import settings
from loguru import logger

from .crud import get_shop_by_id
from .models import (
    ClientDataPaymentRequest,
    OrdersCreatePayload,
    PublicClientDataRequest,
    Shop,
)


def _parse_required_info(raw: str | list[str] | None) -> list[str]:
    if not raw:
        return []
    if isinstance(raw, list):
        return [str(x).strip().lower() for x in raw if str(x).strip()]
    return [part.strip().lower() for part in str(raw).split(",") if part.strip()]


def _validate_required_fields(required: list[str], data: PublicClientDataRequest) -> None:
    def _empty(val: str | None) -> bool:
        return val is None or str(val).strip() == ""

    missing = []
    if "address" in required and _empty(data.address):
        missing.append("address")
    if "email" in required and _empty(data.email):
        missing.append("email")
    if "number" in required and _empty(data.number):
        missing.append("number")
    if missing:
        raise ValueError(f"Missing required customer info: {', '.join(missing)}.")

def _normalize_items(items: list | str | None) -> list[dict]:
    if not items:
        return []
    if isinstance(items, str):
        items = json.loads(items)
    normalized: list[dict] = []
    for entry in items or []:
        data = entry.dict() if hasattr(entry, "dict") else entry or {}
        if not isinstance(data, dict):
            continue
        normalized.append(
            {
                "id": data.get("id"),
                "name": data.get("name"),
                "quantity": data.get("quantity"),
                "price": data.get("price"),
                "weight_grams": data.get("weight_grams"),
            }
        )
    return normalized


async def payment_request_for_client_data(
    shop_id: str,
    data: PublicClientDataRequest,
    payment_method: str | None = None,
    fiat_provider: str | None = None,
    base_url: str | None = None,
) -> ClientDataPaymentRequest:

    shop = await get_shop_by_id(shop_id)
    if not shop:
        raise ValueError("Invalid shop ID.")

    required_info = _parse_required_info(getattr(shop, "required_customer_info", None))
    _validate_required_fields(required_info, data)

    # Calculate invoice amount in the shop currency (defaults to sat)
    amount: float = 0.0
    currency = getattr(shop, "currency", None) or "sat"

    raw_items = data.items
    if isinstance(raw_items, str):
        raw_items = json.loads(raw_items)
    if raw_items:

        def _to_float(value, default=0.0):
            try:
                return float(value)
            except Exception:
                return float(default)

        for entry in raw_items:
            as_dict = entry.dict() if hasattr(entry, "dict") else entry
            if isinstance(as_dict, dict):
                price_val = as_dict.get("price")
                qty_val = as_dict.get("quantity")
            else:
                price_val = getattr(entry, "price", None)
                qty_val = getattr(entry, "quantity", None)
            price = _to_float(price_val, 0.0)
            qty = _to_float(qty_val, 1.0)
            amount += price * qty

    amount = float(amount or 0.0)

    providers = settings.get_fiat_providers_for_user(shop.user_id)
    chosen_fiat_provider = None
    unit = currency
    if payment_method == "fiat" and getattr(shop, "allow_fiat", True):
        chosen_fiat_provider = fiat_provider or (providers[0] if providers else None)
        if chosen_fiat_provider and str(unit).lower() == "sat":
            unit = getattr(settings, "denomination", "USD")

    invoice = await create_payment_request(
        wallet_id=shop.wallet,
        invoice_data=CreateInvoice(
            out=False,
            amount=amount,
            unit=unit,
            fiat_provider=chosen_fiat_provider,
            memo=f"Webshop order for {data.product}",
            extra={
                "tag": "webshop",
                "shop_id": shop_id,
                "items": _normalize_items(data.items),
            },
        ),
    )
    logger.debug(invoice)
    orders_id = await _create_orders_order(shop, data, invoice, base_url=base_url)
    fiat_link = getattr(invoice, "extra", {}).get("fiat_payment_request")

    client_data_resp = ClientDataPaymentRequest(
        client_data_id=orders_id,
        payment_request=getattr(invoice, "bolt11", None),
        payment_hash=getattr(invoice, "payment_hash", None),
        fiat_payment_request=fiat_link or getattr(invoice, "extra", {}).get("fiat_payment_request"),
        fiat_provider=getattr(invoice, "fiat_provider", None) or chosen_fiat_provider,
        is_fiat=bool(getattr(invoice, "fiat_provider", None) or chosen_fiat_provider),
    )
    logger.debug(client_data_resp)
    return client_data_resp


async def payment_received_for_client_data(payment: Payment) -> bool:
    extra = payment.extra or {}
    if extra.get("tag") != "webshop":
        return False
    shop_id = extra.get("shop_id")
    if not isinstance(shop_id, str):
        return False

    try:
        shop = await get_shop_by_id(shop_id)
        if not shop:
            return False
        items_raw = extra.get("items")
        if isinstance(items_raw, str):
            items_raw = json.loads(items_raw)
        items: list | None = items_raw if isinstance(items_raw, list) else None
        if shop and shop.inventory_id and items:
            await _deduct_inventory_stock(shop, items)
        await _mark_orders_paid(shop.user_id, payment.payment_hash)
        return True
    except Exception as exc:  # pragma: no cover
        logger.error(f"Error marking order paid: {exc}")
        return False
    return False


async def _deduct_inventory_stock(shop: Shop, items: list | None) -> None:

    if not shop.inventory_id:
        return
    ids: list[str] = []
    quantities: list[int] = []
    for raw in items or []:
        data = raw.dict() if hasattr(raw, "dict") else raw or {}
        item_id = data.get("id")
        quantity = int(data.get("quantity") or 0)
        if not item_id or quantity <= 0:
            continue
        ids.append(item_id)
        quantities.append(quantity)

    if not ids:
        return
    # Needed to accomodate admin users, as using user ID is not possible
    access = create_access_token({"sub": "", "usr": shop.user_id}, token_expire_minutes=1)
    try:
        async with httpx.AsyncClient() as client:
            await client.patch(
                url=f"http://{settings.host}:{settings.port}/inventory/api/v1/items/{shop.inventory_id}/quantities",
                headers={"Authorization": f"Bearer {access}"},
                params={"source": "webshop", "ids": ids, "quantities": quantities},
            )
    except Exception as exc:  # pragma: no cover
        logger.error(f"Error notifying inventory extension: {exc}")


async def _create_orders_order(
    shop: Shop,
    data: PublicClientDataRequest,
    invoice: Payment,
    base_url: str | None = None,
) -> str:
    items_payload = _normalize_items(data.items)
    payload = OrdersCreatePayload(
        source="webshop",
        tpos_id=None,
        tpos_name=shop.name,
        payment_hash=invoice.payment_hash,
        checking_id=invoice.checking_id,
        amount_msat=invoice.amount,
        fee_msat=invoice.fee,
        memo=invoice.memo,
        paid_in_fiat=bool(invoice.fiat_provider),
        currency=shop.currency,
        exchange_rate=None,
        tax_included=None,
        tax_value=None,
        items=items_payload,
        notes=None,
        address=data.address,
        email=data.email,
        phone=data.number,
        npub=None,
        paid=False,
        shipped=False,
    ).dict()
    access = create_access_token({"sub": "", "usr": shop.user_id}, token_expire_minutes=1)
    params = {}
    if base_url:
        params["base_url"] = base_url
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                url=f"http://{settings.host}:{settings.port}/orders/api/v1/orders",
                headers={"Authorization": f"Bearer {access}"},
                params=params,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("id")
        except Exception as exc:
            logger.warning(f"webshop: failed to push order to orders: {exc}")
            return ""


async def _mark_orders_paid(user_id: str, payment_hash: str) -> None:
    access = create_access_token({"sub": "", "usr": user_id}, token_expire_minutes=1)
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.put(
                url=f"http://{settings.host}:{settings.port}/orders/api/v1/orders/payment/{payment_hash}/paid",
                headers={"Authorization": f"Bearer {access}"},
                json={"paid": True},
            )
            resp.raise_for_status()
        except Exception as exc:
            logger.warning(f"webshop: failed to mark order paid: {exc}")
