from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from categories.schemas import CategoryPreview
from restaurants.schemas import RestaurantPreview

class OfferRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None = None
    image_url: str | None = None

    original_price: Decimal
    discounted_price: Decimal

    quantity_available: int

    pickup_start: datetime
    pickup_end: datetime

    is_active: bool

    restaurant: RestaurantPreview
    category: CategoryPreview