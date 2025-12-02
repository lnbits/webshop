from __future__ import annotations

from lnbits.db import Database


async def m002_shop(db: Database):
    """
    Initial shop table.
    """
    await db.execute(
        f"""
        CREATE TABLE webshop.shop (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            primary_color TEXT NOT NULL,
            secondary_color TEXT NOT NULL,
            background_color TEXT,
            wallet TEXT NOT NULL,
            inventory_id TEXT,
            currency TEXT NOT NULL DEFAULT 'sat',
            allowed_tags TEXT,
            allow_bitcoin BOOLEAN NOT NULL DEFAULT 1,
            allow_fiat BOOLEAN NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT {db.timestamp_now},
            updated_at TIMESTAMP NOT NULL DEFAULT {db.timestamp_now}
        );
        """
    )


async def m006_create_client_data(db: Database):
    """
    Orders table (client data).
    """
    await db.execute(
        f"""
        CREATE TABLE webshop.client_data (
            id TEXT PRIMARY KEY,
            shop_id TEXT NOT NULL,
            product TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            address TEXT,
            email TEXT,
            number TEXT,
            shipped BOOLEAN NOT NULL DEFAULT 0,
            paid BOOLEAN NOT NULL DEFAULT 0,
            items TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT {db.timestamp_now},
            updated_at TIMESTAMP NOT NULL DEFAULT {db.timestamp_now}
        );
        """
    )
