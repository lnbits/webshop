from datetime import datetime, timezone

from lnbits.db import FilterModel
from pydantic import BaseModel, EmailStr, Field


########################### Shop ############################
class CreateShop(BaseModel):
    name: str
    description: str
    primary_color: str
    secondary_color: str
    wallet: str
    inventory_id: str | None = None
    allow_bitcoin: bool = True
    allow_fiat: bool = True


class Shop(BaseModel):
    id: str
    user_id: str
    name: str
    description: str
    primary_color: str
    wallet: str
    secondary_color: str
    inventory_id: str | None = None
    allow_bitcoin: bool = True
    allow_fiat: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ShopFilters(FilterModel):
    __search_fields__ = [
        "name",
        "description",
        "primary_color",
        "secondary_color",
        "wallet",
        "inventory_id",
        "allow_bitcoin",
        "allow_fiat",
    ]

    __sort_fields__ = [
        "name",
        "description",
        "primary_color",
        "secondary_color",
        "wallet",
        "inventory_id",
        "allow_bitcoin",
        "allow_fiat",
        
        "created_at",
        "updated_at",
    ]

    created_at: datetime | None
    updated_at: datetime | None
    allow_bitcoin: bool | None = None
    allow_fiat: bool | None = None


########################### Orders (Client Data) ############################
class CreateClientData(BaseModel):
    product: str
    quantity: int = Field(ge=1)
    address: str | None = None
    email: EmailStr | None = None
    number: str | None = None
    shipped: bool = False


class ClientData(CreateClientData):
    id: str
    shop_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ClientDataFilters(FilterModel):
    __search_fields__ = [
        "product",
        "address",
        "email",
        "number",
        "shipped",
    ]

    __sort_fields__ = [
        "product",
        "quantity",
        "address",
        "email",
        "number",
        "shipped",
        "created_at",
        "updated_at",
    ]

    shop_id: str | None
    product: str | None
    quantity: int | None
    address: str | None
    email: EmailStr | None
    number: str | None
    shipped: bool | None
    created_at: datetime | None
    updated_at: datetime | None


class ClientDataPaymentRequest(BaseModel):
    client_data_id: str
