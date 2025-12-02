# Description: This file contains the extensions API endpoints.
from http import HTTPStatus

from fastapi import APIRouter, Depends
from fastapi.exceptions import HTTPException
from lnbits.core.models import SimpleStatus, User
from lnbits.db import Filters, Page
from lnbits.decorators import (
    check_user_exists,
    parse_filters,
)
from lnbits.helpers import generate_filter_params_openapi

from .crud import (
    create_client_data,
    create_shop,
    delete_client_data,
    delete_shop,
    get_client_data_by_id,
    get_client_data_paginated,
    get_shop,
    get_shop_ids_by_user,
    get_shop_paginated,
    update_client_data,
    update_shop,
)
from .models import (
    ClientData,
    ClientDataFilters,
    ClientDataPaymentRequest,  #
    CreateClientData,
    CreateShop,
    Shop,
    ShopFilters,
)
from .services import (
    payment_request_for_client_data,  #
)

shop_filters = parse_filters(ShopFilters)
client_data_filters = parse_filters(ClientDataFilters)

webshop_api_router = APIRouter()


############################# Shop #############################
@webshop_api_router.post("/api/v1/shop", status_code=HTTPStatus.CREATED)
async def api_create_shop(
    data: CreateShop,
    user: User = Depends(check_user_exists),
) -> Shop:
    shop = await create_shop(user.id, data)
    return shop


@webshop_api_router.put("/api/v1/shop/{shop_id}", status_code=HTTPStatus.CREATED)
async def api_update_shop(
    shop_id: str,
    data: CreateShop,
    user: User = Depends(check_user_exists),
) -> Shop:
    shop = await get_shop(user.id, shop_id)
    if not shop:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Shop not found.")
    if shop.user_id != user.id:
        raise HTTPException(HTTPStatus.FORBIDDEN, "You do not own this shop.")
    shop = await update_shop(Shop(**{**shop.dict(), **data.dict()}))
    return shop


@webshop_api_router.get(
    "/api/v1/shop/paginated",
    name="Shop List",
    summary="get paginated list of shop",
    response_description="list of shop",
    openapi_extra=generate_filter_params_openapi(ShopFilters),
    response_model=Page[Shop],
)
async def api_get_shop_paginated(
    user: User = Depends(check_user_exists),
    filters: Filters = Depends(shop_filters),
) -> Page[Shop]:

    return await get_shop_paginated(
        user_id=user.id,
        filters=filters,
    )


@webshop_api_router.get(
    "/api/v1/shop/{shop_id}",
    name="Get Shop",
    summary="Get the shop with this id.",
    response_description="An shop or 404 if not found",
    response_model=Shop,
)
async def api_get_shop(
    shop_id: str,
    user: User = Depends(check_user_exists),
) -> Shop:

    shop = await get_shop(user.id, shop_id)
    if not shop:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Shop not found.")

    return shop


@webshop_api_router.delete(
    "/api/v1/shop/{shop_id}",
    name="Delete Shop",
    summary="Delete the shop " "and optionally all its associated client_data.",
    response_description="The status of the deletion.",
    response_model=SimpleStatus,
)
async def api_delete_shop(
    shop_id: str,
    clear_client_data: bool | None = False,
    user: User = Depends(check_user_exists),
) -> SimpleStatus:

    await delete_shop(user.id, shop_id)
    if clear_client_data is True:
        # await delete all client data associated with this shop
        pass
    return SimpleStatus(success=True, message="Shop Deleted")


############################# Client Data #############################
@webshop_api_router.post(
    "/api/v1/client_data/{shop_id}",
    name="Create Client Data",
    summary="Create new client data for the specified shop.",
    response_description="The created client data.",
    response_model=ClientData,
    status_code=HTTPStatus.CREATED,
)
async def api_create_client_data(
    shop_id: str,
    data: CreateClientData,
    user: User = Depends(check_user_exists),
) -> ClientData:
    shop = await get_shop(user.id, shop_id)
    if not shop:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Shop not found.")

    client_data = await create_client_data(shop_id, data)
    return client_data


@webshop_api_router.put(
    "/api/v1/client_data/public/{shop_id}",
    name="Submit new Client Data",
    summary="Submit new client data for the specified shop." "This is a public endpoint.",
    response_description="The created client data.",
    response_model=ClientDataPaymentRequest | None,
)
async def api_submit_public_client_data(
    shop_id: str,
    data: CreateClientData,
) -> ClientDataPaymentRequest | None:

    return await payment_request_for_client_data(shop_id, data)


@webshop_api_router.put(
    "/api/v1/client_data/{client_data_id}",
    name="Update Client Data",
    summary="Update the client_data with this id.",
    response_description="The updated client data.",
    response_model=ClientData,
)
async def api_update_client_data(
    client_data_id: str,
    data: CreateClientData,
    user: User = Depends(check_user_exists),
) -> ClientData:
    client_data = await get_client_data_by_id(client_data_id)
    if not client_data:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Client Data not found.")

    shop = await get_shop(user.id, client_data.shop_id)
    if not shop:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Shop not found.")

    client_data = await update_client_data(ClientData(**{**client_data.dict(), **data.dict()}))
    return client_data


@webshop_api_router.get(
    "/api/v1/client_data/paginated",
    name="Client Data List",
    summary="get paginated list of client_data",
    response_description="list of client_data",
    openapi_extra=generate_filter_params_openapi(ClientDataFilters),
    response_model=Page[ClientData],
)
async def api_get_client_data_paginated(
    user: User = Depends(check_user_exists),
    shop_id: str | None = None,
    filters: Filters = Depends(client_data_filters),
) -> Page[ClientData]:

    shop_ids = await get_shop_ids_by_user(user.id)

    if shop_id:
        if shop_id not in shop_ids:
            raise HTTPException(HTTPStatus.FORBIDDEN, "Not your shop.")
        shop_ids = [shop_id]

    return await get_client_data_paginated(
        shop_ids=shop_ids,
        filters=filters,
    )


@webshop_api_router.get(
    "/api/v1/client_data/{client_data_id}",
    name="Get Client Data",
    summary="Get the client data with this id.",
    response_description="An client data or 404 if not found",
    response_model=ClientData,
)
async def api_get_client_data(
    client_data_id: str,
    user: User = Depends(check_user_exists),
) -> ClientData:

    client_data = await get_client_data_by_id(client_data_id)
    if not client_data:
        raise HTTPException(HTTPStatus.NOT_FOUND, "ClientData not found.")
    shop = await get_shop(user.id, client_data.shop_id)
    if not shop:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Shop deleted for this Client Data.")

    return client_data


@webshop_api_router.delete(
    "/api/v1/client_data/{client_data_id}",
    name="Delete Client Data",
    summary="Delete the client_data",
    response_description="The status of the deletion.",
    response_model=SimpleStatus,
)
async def api_delete_client_data(
    client_data_id: str,
    user: User = Depends(check_user_exists),
) -> SimpleStatus:

    client_data = await get_client_data_by_id(client_data_id)
    if not client_data:
        raise HTTPException(HTTPStatus.NOT_FOUND, "ClientData not found.")
    shop = await get_shop(user.id, client_data.shop_id)
    if not shop:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Shop deleted for this Client Data.")

    await delete_client_data(shop.id, client_data_id)
    return SimpleStatus(success=True, message="Client Data Deleted")
