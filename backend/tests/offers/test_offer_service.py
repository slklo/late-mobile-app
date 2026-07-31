import pytest

from offers.exceptions import OfferNotFoundError
from offers.service import OfferService


class StubOfferRepository:
    def __init__(self, offers: list[object], offer: object | None) -> None:
        self.offers = offers
        self.offer = offer
        self.requested_offer_id: int | None = None

    def list_active_offers(self) -> list[object]:
        return self.offers

    def get_offer_by_id(self, offer_id: int) -> object | None:
        self.requested_offer_id = offer_id
        return self.offer


def create_service(repository: StubOfferRepository) -> OfferService:
    return OfferService(repository)  # type: ignore[arg-type]


def test_list_offers_returns_repository_result() -> None:
    offers = [object(), object()]
    service = create_service(StubOfferRepository(offers=offers, offer=None))

    result = service.list_offers()

    assert result is offers


def test_get_offer_detail_returns_repository_result() -> None:
    offer = object()
    repository = StubOfferRepository(offers=[], offer=offer)
    service = create_service(repository)

    result = service.get_offer_detail(42)

    assert result is offer
    assert repository.requested_offer_id == 42


def test_get_offer_detail_raises_when_offer_does_not_exist() -> None:
    repository = StubOfferRepository(offers=[], offer=None)
    service = create_service(repository)

    with pytest.raises(OfferNotFoundError):
        service.get_offer_detail(42)

    assert repository.requested_offer_id == 42
