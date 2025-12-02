import json

# Description: This file contains the CRUD operations for talking to the database.
from lnbits.db import Database, Filters, Page
from lnbits.helpers import urlsafe_short_hash

from .models import ClientData, ClientDataFilters, CreateClientData, CreateShop, Shop, ShopFilters

db = Database("ext_webshop")


########################### Shop ############################
async def create_shop(user_id: str, data: CreateShop) -> Shop:
    shop = Shop(**data.dict(), id=urlsafe_short_hash(), user_id=user_id)
    await db.insert("webshop.shop", shop)
    return shop


async def get_shop(
    user_id: str,
    shop_id: str,
) -> Shop | None:
    return await db.fetchone(
        """
            SELECT * FROM webshop.shop
            WHERE id = :id AND user_id = :user_id
        """,
        {"id": shop_id, "user_id": user_id},
        Shop,
    )


async def get_shop_by_id(
    shop_id: str,
) -> Shop | None:
    return await db.fetchone(
        """
            SELECT * FROM webshop.shop
            WHERE id = :id
        """,
        {"id": shop_id},
        Shop,
    )


async def get_shop_ids_by_user(
    user_id: str,
) -> list[str]:
    rows: list[dict] = await db.fetchall(
        """
            SELECT DISTINCT id FROM webshop.shop
            WHERE user_id = :user_id
        """,
        {"user_id": user_id},
    )

    return [row["id"] for row in rows]


async def get_shop_paginated(
    user_id: str | None = None,
    filters: Filters[ShopFilters] | None = None,
) -> Page[Shop]:
    where = []
    values = {}
    if user_id:
        where.append("user_id = :user_id")
        values["user_id"] = user_id

    return await db.fetch_page(
        "SELECT * FROM webshop.shop",
        where=where,
        values=values,
        filters=filters,
        model=Shop,
    )


async def update_shop(data: Shop) -> Shop:
    await db.update("webshop.shop", data)
    return data


async def delete_shop(user_id: str, shop_id: str) -> None:
    await db.execute(
        """
            DELETE FROM webshop.shop
            WHERE id = :id AND user_id = :user_id
        """,
        {"id": shop_id, "user_id": user_id},
    )


################################# Client Data ###########################


async def create_client_data(shop_id: str, data: CreateClientData) -> ClientData:
    payload = data.dict()
    # store items as JSON string to avoid insertion issues
    if payload.get("items") is not None:
        payload["items"] = json.dumps(payload["items"])
    client_data = ClientData(**payload, id=urlsafe_short_hash(), shop_id=shop_id)
    await db.insert("webshop.client_data", client_data)
    return client_data


async def get_client_data(
    shop_id: str,
    client_data_id: str,
) -> ClientData | None:
    return await db.fetchone(
        """
            SELECT * FROM webshop.client_data
            WHERE id = :id AND shop_id = :shop_id
        """,
        {"id": client_data_id, "shop_id": shop_id},
        ClientData,
    )


async def get_client_data_by_id(
    client_data_id: str,
) -> ClientData | None:
    return await db.fetchone(
        """
            SELECT * FROM webshop.client_data
            WHERE id = :id
        """,
        {"id": client_data_id},
        ClientData,
    )


async def get_client_data_paginated(
    shop_ids: list[str] | None = None,
    filters: Filters[ClientDataFilters] | None = None,
) -> Page[ClientData]:

    if not shop_ids:
        return Page(data=[], total=0)

    where = []
    values = {}
    id_clause = []
    for i, item_id in enumerate(shop_ids):
        # shop_ids are not user input, but DB entries, so this is safe
        shop_id = f"shop_id__{i}"
        id_clause.append(f"shop_id = :{shop_id}")
        values[shop_id] = item_id
    or_clause = " OR ".join(id_clause)
    where.append(f"({or_clause})")

    return await db.fetch_page(
        "SELECT * FROM webshop.client_data",
        where=where,
        values=values,
        filters=filters,
        model=ClientData,
    )


async def update_client_data(data: ClientData) -> ClientData:
    await db.update("webshop.client_data", data)
    return data


async def delete_client_data(shop_id: str, client_data_id: str) -> None:
    await db.execute(
        """
            DELETE FROM webshop.client_data
            WHERE id = :id AND shop_id = :shop_id
        """,
        {"id": client_data_id, "shop_id": shop_id},
    )


# Order items
