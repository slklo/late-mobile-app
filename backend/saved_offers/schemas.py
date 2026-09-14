from datetime import datetime

from pydantic import BaseModel, ConfigDict

from offers.schemas import OfferRead


class SavedOfferRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    offer: OfferRead
