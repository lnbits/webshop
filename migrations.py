
empty_dict: dict[str, str] = {}

async def m002_shop(db):
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
            wallet TEXT NOT NULL,
            inventory_id TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT {db.timestamp_now},
            updated_at TIMESTAMP NOT NULL DEFAULT {db.timestamp_now}
        );
    """
    )


async def m006_create_client_data(db):
    """
    Orders table (client data).
    """

    columns = await db.fetchall("PRAGMA table_info('webshop.client_data');")
    if columns:
        return

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
            created_at TIMESTAMP NOT NULL DEFAULT {db.timestamp_now},
            updated_at TIMESTAMP NOT NULL DEFAULT {db.timestamp_now}
        );
    """
    )


async def m007_add_payment_flags(db):
    """
    Add allow_bitcoin and allow_fiat flags to shop.
    """

    columns = await db.fetchall("PRAGMA table_info('webshop.shop');")
    existing = {col["name"] for col in columns}

    if "allow_bitcoin" not in existing:
        await db.execute(
            """
            ALTER TABLE webshop.shop
            ADD COLUMN allow_bitcoin BOOLEAN NOT NULL DEFAULT 1
            """
        )

    if "allow_fiat" not in existing:
        await db.execute(
            """
            ALTER TABLE webshop.shop
            ADD COLUMN allow_fiat BOOLEAN NOT NULL DEFAULT 1
            """
        )
