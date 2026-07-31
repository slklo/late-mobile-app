from offers.dependencies import get_offer_repository, get_offer_service
from offers.repository import OfferRepository
from offers.service import OfferService


def test_offer_repository_receives_database_session() -> None:
    db = object()

    repository = get_offer_repository(db)  # type: ignore[arg-type]

    assert isinstance(repository, OfferRepository)
    assert repository.db is db


def test_offer_service_receives_repository() -> None:
    repository = object()

    service = get_offer_service(repository)  # type: ignore[arg-type]

    assert isinstance(service, OfferService)
    assert service.repository is repository
