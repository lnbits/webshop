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

    logger.info("Payment logic generation is disabled. Client data created without payment.")
    client_data_resp = ClientDataPaymentRequest(client_data_id=client_data.id)
    return client_data_resp


async def payment_received_for_client_data(payment: Payment) -> bool:
    logger.info("Payment receive logic generation is disabled.")
    return True


