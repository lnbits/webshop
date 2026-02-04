from http import HTTPStatus
from typing import Any

import httpx
from fastapi import APIRouter, Depends, Request
from fastapi.exceptions import HTTPException
from lnbits.core.models import SimpleStatus, User
from lnbits.db import Filters, Page
from lnbits.decorators import (
    check_user_exists,
    parse_filters,
)
from lnbits.helpers import create_access_token, generate_filter_params_openapi
from lnbits.settings import settings

from .crud import (
    create_shop,
    delete_shop,
    get_shop,
    get_shop_ids_by_user,
    get_shop_paginated,
    update_shop,
)
from .models import (
    ClientDataPaymentRequest,  #
    CreateShop,
    PublicClientDataRequest,
    Shop,
    ShopFilters,
)
from .services import (
    payment_request_for_client_data,  #
)

shop_filters = parse_filters(ShopFilters)
webshop_api_router = APIRouter()


def _to_csv(value: list[str] | str | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        cleaned = value.strip()
        return cleaned or None
    cleaned_values = [str(item).strip() for item in value if str(item).strip()]
    return ",".join(cleaned_values) if cleaned_values else None


def _from_csv(value: str | list[str] | None) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    parts = [part.strip() for part in str(value).split(",")]
    return [part for part in parts if part]


def _inventory_available_for_user(user: User | None) -> bool:
    return bool(user and "inventory" in (user.extensions or []))


async def _get_default_inventory(user_id: str) -> dict[str, Any] | None:
    access = create_access_token({"sub": "", "usr": user_id}, token_expire_minutes=1)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            url=f"http://{settings.host}:{settings.port}/inventory/api/v1",
            headers={"Authorization": f"Bearer {access}"},
        )
        inventory = resp.json()
    if not inventory:
        return None
    if isinstance(inventory, list):
        inventory = inventory[0] if inventory else None
    if not isinstance(inventory, dict):
        return None
    inventory["tags"] = _from_csv(inventory.get("tags"))
    inventory["omit_tags"] = _from_csv(inventory.get("omit_tags"))
    return inventory


async def _prepare_shop_payload(data: CreateShop, user: User) -> CreateShop:
    payload = data.dict()
    payload["allowed_tags"] = _to_csv(payload.get("allowed_tags"))
    payload["omit_tags"] = _to_csv(payload.get("omit_tags"))
    payload["required_customer_info"] = _to_csv(payload.get("required_customer_info"))
    if _inventory_available_for_user(user):
        inventory = await _get_default_inventory(user.id)
        if inventory and not payload.get("inventory_id"):
            payload["inventory_id"] = inventory.get("id")
    return CreateShop(**payload)


@webshop_api_router.get("/api/v1/inventory/status", status_code=HTTPStatus.OK)
async def api_inventory_status(
    user: User = Depends(check_user_exists),
) -> dict[str, Any]:
    if not _inventory_available_for_user(user):
        return {
            "enabled": False,
            "inventory_id": None,
            "tags": [],
            "omit_tags": [],
            "currency": None,
        }
    inventory = await _get_default_inventory(user.id)
    return {
        "enabled": True,
        "inventory_id": inventory.get("id") if inventory else None,
        "tags": inventory.get("tags") if inventory else [],
        "omit_tags": inventory.get("omit_tags") if inventory else [],
        "currency": inventory.get("currency") if inventory else None,
    }


############################# Shop #############################
@webshop_api_router.post("/api/v1/shop", status_code=HTTPStatus.CREATED)
async def api_create_shop(
    data: CreateShop,
    user: User = Depends(check_user_exists),
) -> Shop:
    shop_payload = await _prepare_shop_payload(data, user)
    shop = await create_shop(user.id, shop_payload)
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
    shop_payload = await _prepare_shop_payload(data, user)
    shop = await update_shop(Shop(**{**shop.dict(), **shop_payload.dict()}))
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


############################# Client Data (Orders) #############################
@webshop_api_router.put(
    "/api/v1/client_data/public/{shop_id}",
    name="Submit new Client Data",
    summary="Submit new client data for the specified shop." "This is a public endpoint.",
    response_description="The created client data.",
    response_model=ClientDataPaymentRequest | None,
)
async def api_submit_public_client_data(
    shop_id: str,
    data: PublicClientDataRequest,
    request: Request,
    base_url: str | None = None,
) -> ClientDataPaymentRequest | None:

    try:
        return await payment_request_for_client_data(
            shop_id,
            data,
            data.payment_method,
            data.fiat_provider,
            base_url=base_url or str(request.base_url),
        )
    except ValueError as exc:
        raise HTTPException(status_code=HTTPStatus.BAD_REQUEST, detail=str(exc)) from exc
