import json

from lnbits.core.models import Payment
from lnbits.core.services import create_invoice
from loguru import logger

from .crud import (
    create_client_data,
    get_client_data_by_id,
    get_shop_by_id,
    update_client_data,
)
from .models import (
    ClientDataPaymentRequest,  #
    CreateClientData,
)


async def payment_request_for_client_data(
    shop_id: str,
    data: CreateClientData,
) -> ClientDataPaymentRequest:

    shop = await get_shop_by_id(shop_id)
    if not shop:
        raise ValueError("Invalid shop ID.")

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

    invoice = await create_invoice(
        wallet_id=shop.wallet,
        amount=amount,
        currency=currency,
        memo=f"Webshop order {client_data.id} for {data.product}",
        extra={"tag": "webshop", "client_data_id": client_data.id},
    )
    client_data_resp = ClientDataPaymentRequest(
        client_data_id=client_data.id,
        payment_request=getattr(invoice, "bolt11", None),
        payment_hash=getattr(invoice, "checking_id", None),
    )
    return client_data_resp


async def payment_received_for_client_data(payment: Payment) -> bool:
    """
    Mark an order as paid when invoice is settled.
    Expect payment.extra to carry {"tag": "webshop", "client_data_id": "..."}.
    """
    try:
        if payment.extra.get("tag") != "webshop":
            return False
        client_data_id = payment.extra.get("client_data_id")
        if not client_data_id:
            return False
        client_data = await get_client_data_by_id(client_data_id)
        if not client_data:
            return False
        if client_data.paid:
            return True
        client_data.paid = True
        await update_client_data(client_data)
        logger.info(f"Order {client_data_id} marked paid.")
        return True
    except Exception as exc:  # pragma: no cover
        logger.error(f"Error marking order paid: {exc}")
        return False
