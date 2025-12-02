import asyncio

from fastapi import APIRouter
from lnbits.tasks import create_permanent_unique_task
from loguru import logger

from .crud import db
from .tasks import wait_for_paid_invoices
from .views import webshop_generic_router
from .views_api import webshop_api_router

webshop_ext: APIRouter = APIRouter(prefix="/webshop", tags=["WebShop"])
webshop_ext.include_router(webshop_generic_router)
webshop_ext.include_router(webshop_api_router)


webshop_static_files = [
    {
        "path": "/webshop/static",
        "name": "webshop_static",
    }
]

scheduled_tasks: list[asyncio.Task] = []


def webshop_stop():
    for task in scheduled_tasks:
        try:
            task.cancel()
        except Exception as ex:
            logger.warning(ex)


def webshop_start():
    task = create_permanent_unique_task("ext_webshop", wait_for_paid_invoices)
    scheduled_tasks.append(task)


__all__ = [
    "db",
    "webshop_ext",
    "webshop_start",
    "webshop_static_files",
    "webshop_stop",
]
