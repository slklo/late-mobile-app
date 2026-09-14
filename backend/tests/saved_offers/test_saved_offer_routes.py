from collections.abc import Iterator
from datetime import datetime, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.dependencies import get_current_user
from core.exception_handlers import register_exception_handlers
from offers.exceptions import OfferNotFoundError
from saved_offers.dependencies import get_saved_offer_service
from saved_offers.routes import router
from users.schemas import UserRead


def make_offer(offer_id: int = 42) -> dict[str, object]:
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


def make_saved_offer(offer_id: int = 42) -> dict[str, object]:
    return {
        "id": 7,
        "created_at": datetime(2026, 8, 1, tzinfo=timezone.utc),
        "offer": make_offer(offer_id),
    }


class StubSavedOfferService:
    def __init__(self) -> None:
        self.last_list_user_id: int | None = None
        self.last_save: tuple[int, int] | None = None
        self.last_remove: tuple[int, int] | None = None
        self.raise_not_found = False

    def list_saved_offers(self, user_id: int) -> list[dict[str, object]]:
        self.last_list_user_id = user_id
        return [make_saved_offer()]

    def save_offer(self, *, user_id: int, offer_id: int) -> dict[str, object]:
        self.last_save = (user_id, offer_id)

        if self.raise_not_found:
            raise OfferNotFoundError(offer_id)

        return make_saved_offer(offer_id)

    def remove_saved_offer(self, *, user_id: int, offer_id: int) -> None:
        self.last_remove = (user_id, offer_id)


@pytest.fixture
def current_user() -> UserRead:
    return UserRead(
        id=101,
        email="saved-user@example.com",
        full_name=None,
        is_active=True,
        created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        email_verified_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        profile_completed_at=None,
    )


@pytest.fixture
def service() -> StubSavedOfferService:
    return StubSavedOfferService()


@pytest.fixture
def client(
    service: StubSavedOfferService,
    current_user: UserRead,
) -> Iterator[TestClient]:
    app = FastAPI()
    register_exception_handlers(app)
    app.include_router(router, prefix="/api/saved-offers")
    app.dependency_overrides[get_saved_offer_service] = lambda: service
    app.dependency_overrides[get_current_user] = lambda: current_user

    with TestClient(app) as test_client:
        yield test_client


def test_authenticated_user_can_save_offer(
    client: TestClient,
    service: StubSavedOfferService,
) -> None:
    response = client.post("/api/saved-offers/42/")

    assert response.status_code == 200
    assert response.json()["offer"]["id"] == 42
    assert service.last_save == (101, 42)


def test_user_can_list_own_saved_offers(
    client: TestClient,
    service: StubSavedOfferService,
) -> None:
    response = client.get("/api/saved-offers/")

    assert response.status_code == 200
    assert response.json()[0]["offer"]["title"] == "Bakery surprise bag"
    assert response.json()[0]["offer"]["restaurant"]["name"] == "Test Bakery"
    assert service.last_list_user_id == 101


def test_user_can_remove_saved_offer(
    client: TestClient,
    service: StubSavedOfferService,
) -> None:
    response = client.delete("/api/saved-offers/42/")

    assert response.status_code == 204
    assert response.content == b""
    assert service.last_remove == (101, 42)


def test_unknown_offer_when_saving_returns_404(
    client: TestClient,
    service: StubSavedOfferService,
) -> None:
    service.raise_not_found = True

    response = client.post("/api/saved-offers/404/")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "OFFER_NOT_FOUND"


def test_unauthenticated_requests_are_rejected() -> None:
    app = FastAPI()
    register_exception_handlers(app)
    app.include_router(router, prefix="/api/saved-offers")
    app.dependency_overrides[get_saved_offer_service] = (
        lambda: StubSavedOfferService()
    )

    with TestClient(app) as test_client:
        list_response = test_client.get("/api/saved-offers/")
        save_response = test_client.post("/api/saved-offers/42/")
        delete_response = test_client.delete("/api/saved-offers/42/")

    assert list_response.status_code == 401
    assert save_response.status_code == 401
    assert delete_response.status_code == 401
