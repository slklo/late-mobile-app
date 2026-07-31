from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

from offers.dependencies import get_offer_service
from offers.routes import router


def make_offer(offer_id: int = 1) -> dict[str, object]:
    return {
        "id": offer_id,
        "title": "Bakery surprise bag",
        "description": "Mixed baked goods",
        "image_url": None,
        "original_price": "12.00",
        "discounted_price": "4.00",
        "quantity_available": 3,
        "pickup_start": datetime(2026, 7, 31, 17, tzinfo=timezone.utc),
        "pickup_end": datetime(2026, 7, 31, 18, tzinfo=timezone.utc),
        "is_active": True,
        "restaurant": {
            "id": 10,
            "name": "Test Bakery",
            "address": "Test Street 1",
            "image_url": None,
        },
        "category": {
            "id": 20,
            "name": "Bakery",
            "slug": "bakery",
        },
    }


class StubOfferService:
    def __init__(self) -> None:
        self.requested_offer_id: int | None = None

    def list_offers(self) -> list[dict[str, object]]:
        return [make_offer()]

    def get_offer_detail(self, offer_id: int) -> dict[str, object]:
        self.requested_offer_id = offer_id
        return make_offer(offer_id)


def create_client(service: StubOfferService) -> TestClient:
    app = FastAPI()
    app.include_router(router, prefix="/api/offers")
    app.dependency_overrides[get_offer_service] = lambda: service
    return TestClient(app)


def test_list_offers_uses_overridden_service() -> None:
    service = StubOfferService()

    with create_client(service) as client:
        response = client.get("/api/offers/")

    assert response.status_code == 200
    assert response.json()[0]["title"] == "Bakery surprise bag"


def test_offer_detail_passes_id_to_overridden_service() -> None:
    service = StubOfferService()

    with create_client(service) as client:
        response = client.get("/api/offers/42")

    assert response.status_code == 200
    assert response.json()["id"] == 42
    assert service.requested_offer_id == 42
