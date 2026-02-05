from __future__ import annotations

from datetime import datetime, timezone

from lnbits.db import FilterModel
from pydantic import BaseModel, EmailStr, Field


########################### Shop ############################
class CreateShop(BaseModel):
    name: str
    primary_color: str
    secondary_color: str
    background_color: str | None = None
    wallet: str
    inventory_id: str | None = None
    currency: str = "sat"
    allowed_tags: str | None = None
    omit_tags: str | None = None
    allow_bitcoin: bool = True
    allow_fiat: bool = True
    required_customer_info: str | None = None


class Shop(BaseModel):
    id: str
    user_id: str
    name: str
    primary_color: str
    wallet: str
    secondary_color: str
    background_color: str | None = None
    inventory_id: str | None = None
    currency: str = "sat"
    allowed_tags: str | None = None
    omit_tags: str | None = None
    allow_bitcoin: bool = True
    allow_fiat: bool = True
    required_customer_info: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PublicShop(BaseModel):
    id: str
    name: str
    primary_color: str
    secondary_color: str
    background_color: str | None = None
    inventory_id: str | None = None
    currency: str = "sat"
    allowed_tags: str | None = None
    omit_tags: str | None = None
    allow_bitcoin: bool = True
    allow_fiat: bool = True
    required_customer_info: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ShopFilters(FilterModel):
    __search_fields__ = [
        "name",
        "primary_color",
        "secondary_color",
        "background_color",
        "wallet",
        "inventory_id",
        "currency",
        "allowed_tags",
        "omit_tags",
        "allow_bitcoin",
        "allow_fiat",
        "required_customer_info",
    ]

    __sort_fields__ = [
        "name",
        "primary_color",
        "secondary_color",
        "background_color",
        "wallet",
        "inventory_id",
        "currency",
        "allowed_tags",
        "omit_tags",
        "allow_bitcoin",
        "allow_fiat",
        "created_at",
        "updated_at",
        "required_customer_info",
    ]

    created_at: datetime | None
    updated_at: datetime | None
    allow_bitcoin: bool | None = None
    allow_fiat: bool | None = None
    currency: str | None = None
    allowed_tags: str | None = None
    omit_tags: str | None = None
    background_color: str | None = None


########################### Orders (Client Data) ############################
class CreateClientDataItem(BaseModel):
    id: str | None = None
    name: str
    quantity: int = Field(ge=1)
    price: float | None = None
    weight_grams: int | None = None


class CreateClientData(BaseModel):
    product: str
    quantity: int = Field(ge=1)
    address: str | None = None
    email: EmailStr | None = None
    number: str | None = None
    shipped: bool = False
    items: list[CreateClientDataItem] | str | None = None


class ClientData(CreateClientData):
    id: str
    shop_id: str
    # stored as serialized json string in DB
    items: str | None = None
    paid: bool = False
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
        "paid",
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
    paid: bool | None
    created_at: datetime | None
    updated_at: datetime | None


class ClientDataPaymentRequest(BaseModel):
    client_data_id: str
    payment_request: str | None = None
    payment_hash: str | None = None
    fiat_payment_request: str | None = None
    fiat_provider: str | None = None
    is_fiat: bool = False


class OrdersCreatePayload(BaseModel):
    source: str
    tpos_id: str | None = None
    tpos_name: str | None = None
    payment_hash: str
    checking_id: str
    amount_msat: int
    fee_msat: int
    memo: str | None = None
    paid_in_fiat: bool = False
    currency: str | None = None
    exchange_rate: float | None = None
    tax_included: bool | None = None
    tax_value: float | None = None
    items: list[dict] = Field(default_factory=list)
    notes: dict | None = None
    address: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    npub: str | None = None
    weight: str | None = None
    paid: bool = False
    shipped: bool = False


class PublicClientDataRequest(CreateClientData):
    payment_method: str | None = None
    fiat_provider: str | None = None
