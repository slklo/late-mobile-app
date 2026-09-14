import pytest

from offers.exceptions import OfferNotFoundError
from saved_offers.models import SavedOffer
from saved_offers.service import SavedOfferService


class FakeDb:
    def __init__(self) -> None:
        self.flush_calls = 0
        self.commit_calls = 0
        self.rollback_calls = 0

    def flush(self) -> None:
        self.flush_calls += 1

    def commit(self) -> None:
        self.commit_calls += 1

    def rollback(self) -> None:
        self.rollback_calls += 1


class StubSavedOfferRepository:
    def __init__(self) -> None:
        self.saved_offer: SavedOffer | None = None
        self.list_result: list[SavedOffer] = []
        self.added: SavedOffer | None = None
        self.deleted: SavedOffer | None = None
        self.lookups: list[tuple[int, int]] = []

    def list_by_user_id(self, user_id: int) -> list[SavedOffer]:
        return self.list_result

    def get_by_user_and_offer(
        self,
        *,
        user_id: int,
        offer_id: int,
    ) -> SavedOffer | None:
        self.lookups.append((user_id, offer_id))
        return self.saved_offer

    def add(self, saved_offer: SavedOffer) -> SavedOffer:
        self.added = saved_offer
        self.saved_offer = saved_offer
        return saved_offer

    def delete(self, saved_offer: SavedOffer) -> None:
        self.deleted = saved_offer
        self.saved_offer = None


class StubOfferRepository:
    def __init__(self, offer: object | None = object()) -> None:
        self.offer = offer
        self.requested_offer_id: int | None = None

    def get_offer_by_id(self, offer_id: int) -> object | None:
        self.requested_offer_id = offer_id
        return self.offer


def create_service(
    *,
    saved_offers: StubSavedOfferRepository | None = None,
    offers: StubOfferRepository | None = None,
    db: FakeDb | None = None,
) -> tuple[SavedOfferService, FakeDb, StubSavedOfferRepository, StubOfferRepository]:
    db = db or FakeDb()
    saved_offers = saved_offers or StubSavedOfferRepository()
    offers = offers or StubOfferRepository()
    return (
        SavedOfferService(
            db=db,  # type: ignore[arg-type]
            saved_offers=saved_offers,  # type: ignore[arg-type]
            offers=offers,  # type: ignore[arg-type]
        ),
        db,
        saved_offers,
        offers,
    )


def test_list_saved_offers_returns_current_users_saved_offers() -> None:
    existing = SavedOffer(user_id=1, offer_id=42)
    service, _, saved_offers, _ = create_service()
    saved_offers.list_result = [existing]

    result = service.list_saved_offers(user_id=1)

    assert result == [existing]


def test_save_offer_returns_existing_saved_offer_idempotently() -> None:
    existing = SavedOffer(user_id=1, offer_id=42)
    saved_offers = StubSavedOfferRepository()
    saved_offers.saved_offer = existing
    service, db, saved_offers, offers = create_service(
        saved_offers=saved_offers,
    )

    result = service.save_offer(user_id=1, offer_id=42)

    assert result is existing
    assert saved_offers.added is None
    assert offers.requested_offer_id is None
    assert db.commit_calls == 0


def test_save_offer_creates_when_offer_exists() -> None:
    service, db, saved_offers, offers = create_service()

    result = service.save_offer(user_id=1, offer_id=42)

    assert result is saved_offers.added
    assert result.user_id == 1
    assert result.offer_id == 42
    assert offers.requested_offer_id == 42
    assert db.flush_calls == 1
    assert db.commit_calls == 1


def test_save_offer_raises_clean_404_when_offer_is_unknown() -> None:
    service, db, saved_offers, offers = create_service(
        offers=StubOfferRepository(offer=None),
    )

    with pytest.raises(OfferNotFoundError):
        service.save_offer(user_id=1, offer_id=404)

    assert offers.requested_offer_id == 404
    assert saved_offers.added is None
    assert db.commit_calls == 0


def test_remove_saved_offer_deletes_existing_saved_offer() -> None:
    existing = SavedOffer(user_id=1, offer_id=42)
    saved_offers = StubSavedOfferRepository()
    saved_offers.saved_offer = existing
    service, db, saved_offers, _ = create_service(saved_offers=saved_offers)

    service.remove_saved_offer(user_id=1, offer_id=42)

    assert saved_offers.deleted is existing
    assert db.commit_calls == 1


def test_remove_saved_offer_is_idempotent_when_not_saved() -> None:
    service, db, saved_offers, _ = create_service()

    service.remove_saved_offer(user_id=1, offer_id=42)

    assert saved_offers.deleted is None
    assert db.commit_calls == 0
