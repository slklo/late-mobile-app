from pydantic import BaseModel, ConfigDict


class RestaurantPreview(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    address: str
    image_url: str | None = None