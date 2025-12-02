# Description: Add your page endpoints here.

from http import HTTPStatus

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from lnbits.core.models import User
from lnbits.decorators import check_user_exists
from lnbits.helpers import template_renderer

from .crud import get_shop_by_id

webshop_generic_router = APIRouter()


def webshop_renderer():
    return template_renderer(["webshop/templates"])


#######################################
##### ADD YOUR PAGE ENDPOINTS HERE ####
#######################################


# Backend admin page


@webshop_generic_router.get("/", response_class=HTMLResponse)
async def index(req: Request, user: User = Depends(check_user_exists)):
    return webshop_renderer().TemplateResponse("webshop/index.html", {"request": req, "user": user.json()})


# Frontend shareable page


@webshop_generic_router.get("/{shop_id}")
async def shop_public_page(req: Request, shop_id: str):
    shop = await get_shop_by_id(shop_id)
    if not shop:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Shop does not exist.")

    public_page_name = getattr(shop, "name", "")
    public_page_description = getattr(shop, "description", "")
    shop_data = shop.dict()
    if shop_data.get("created_at"):
        shop_data["created_at"] = shop_data["created_at"].isoformat()
    if shop_data.get("updated_at"):
        shop_data["updated_at"] = shop_data["updated_at"].isoformat()

    return webshop_renderer().TemplateResponse(
        "webshop/public_page.html",
        {
            "request": req,
            "shop_id": shop_id,
            "shop": shop_data,
            "public_page_name": public_page_name,
            "public_page_description": public_page_description,
        },
    )
