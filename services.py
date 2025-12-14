import json

import httpx
from lnbits.core.models import CreateInvoice, Payment
from lnbits.core.services import create_payment_request
from lnbits.helpers import create_access_token
from lnbits.settings import settings
from loguru import logger

from .crud import (
    create_client_data,
    get_client_data_by_id,
    get_shop_by_id,
    update_client_data,
)
from .models import (
    ClientDataPaymentRequest,  #
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


async def payment_request_for_client_data(
    shop_id: str,
    data: PublicClientDataRequest,
    payment_method: str | None = None,
    fiat_provider: str | None = None,
) -> ClientDataPaymentRequest:

    shop = await get_shop_by_id(shop_id)
    if not shop:
        raise ValueError("Invalid shop ID.")

    required_info = _parse_required_info(getattr(shop, "required_customer_info", None))
    _validate_required_fields(required_info, data)

    client_data = await create_client_data(shop_id, data)
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
            memo=f"Webshop order {client_data.id} for {data.product}",
            extra={"tag": "webshop", "client_data_id": client_data.id},
        ),
    )
    logger.debug(invoice)
    fiat_link = getattr(invoice, "extra", {}).get("fiat_payment_request")

    client_data_resp = ClientDataPaymentRequest(
        client_data_id=client_data.id,
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
    client_data_id = extra.get("client_data_id")
    if not isinstance(client_data_id, str):
        return False

    try:
        client_data = await get_client_data_by_id(client_data_id)
        if not client_data:
            return False
        if client_data.paid:
            return True
        shop = await get_shop_by_id(client_data.shop_id)
        items_raw = json.loads(client_data.items) if isinstance(client_data.items, str) else client_data.items
        items: list | None = items_raw if isinstance(items_raw, list) else None
        if shop and shop.inventory_id and items:
            await _deduct_inventory_stock(shop, items)
        client_data.paid = True
        await update_client_data(client_data)
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
