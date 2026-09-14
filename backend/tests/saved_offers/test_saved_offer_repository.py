from collections.abc import Iterator
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from categories.models import Category
from core.database import Base
from offers.models import Offer
from restaurants.models import Restaurant
from saved_offers.models import SavedOffer
from saved_offers.repository import SavedOfferRepository
from users.models import User


@pytest.fixture
def db_session() -> Iterator[Session]:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(
        engine,
        tables=[
            User.__table__,
            Restaurant.__table__,
            Category.__table__,
            Offer.__table__,
            SavedOffer.__table__,
        ],
    )

    with Session(engine) as session:
        yield session

    engine.dispose()


@pytest.fixture
def repository(db_session: Session) -> SavedOfferRepository:
    return SavedOfferRepository(db_session)


def create_offer_graph(
    db_session: Session,
    *,
    user_email: str = "saved@example.com",
) -> tuple[User, Offer]:
    user = User(email=user_email)
    restaurant = Restaurant(
        name="Test Bakery",
        address="Test Street 1",
        is_active=True,
    )
    category = Category(name="Bakery", slug=f"bakery-{user_email}")
    now = datetime.now(timezone.utc)
    offer = Offer(
        restaurant=restaurant,
        category=category,
        title="Surprise bag",
        description="Mixed baked goods",
        image_url=None,
        original_price=Decimal("12.00"),
        discounted_price=Decimal("4.00"),
        quantity_available=3,
        pickup_start=now + timedelta(hours=1),
        pickup_end=now + timedelta(hours=2),
        is_active=True,
    )
    db_session.add_all([user, offer])
    db_session.flush()
    return user, offer


def test_add_attaches_saved_offer_to_session(
    repository: SavedOfferRepository,
    db_session: Session,
) -> None:
    user, offer = create_offer_graph(db_session)
    saved_offer = SavedOffer(user_id=user.id, offer_id=offer.id)

    result = repository.add(saved_offer)

    assert result is saved_offer
    assert saved_offer in db_session.new


def test_get_by_user_and_offer_finds_only_that_users_saved_offer(
    repository: SavedOfferRepository,
    db_session: Session,
) -> None:
    user, offer = create_offer_graph(db_session)
    other_user = User(email="other@example.com")
    db_session.add(other_user)
    db_session.flush()
    target = SavedOffer(user_id=user.id, offer_id=offer.id)
    other = SavedOffer(user_id=other_user.id, offer_id=offer.id)
    db_session.add_all([target, other])
    db_session.flush()

    result = repository.get_by_user_and_offer(
        user_id=user.id,
        offer_id=offer.id,
    )

    assert result is target
    assert result is not other
    assert result.offer.restaurant.name == "Test Bakery"
    assert result.offer.category.name == "Bakery"


def test_list_by_user_id_returns_only_current_users_saved_offers(
    repository: SavedOfferRepository,
    db_session: Session,
) -> None:
    user, offer = create_offer_graph(db_session)
    other_user, other_offer = create_offer_graph(
        db_session,
        user_email="other-list@example.com",
    )
    target = SavedOffer(user_id=user.id, offer_id=offer.id)
    other = SavedOffer(user_id=other_user.id, offer_id=other_offer.id)
    db_session.add_all([target, other])
    db_session.flush()

    result = repository.list_by_user_id(user.id)

    assert result == [target]
    assert result[0].offer.title == "Surprise bag"


def test_delete_removes_saved_offer(
    repository: SavedOfferRepository,
    db_session: Session,
) -> None:
    user, offer = create_offer_graph(db_session)
    saved_offer = SavedOffer(user_id=user.id, offer_id=offer.id)
    db_session.add(saved_offer)
    db_session.flush()

    repository.delete(saved_offer)
    db_session.flush()

    assert (
        repository.get_by_user_and_offer(
            user_id=user.id,
            offer_id=offer.id,
        )
        is None
    )


def test_unique_constraint_prevents_duplicate_saved_offers(
    db_session: Session,
) -> None:
    user, offer = create_offer_graph(db_session)
    db_session.add_all(
        [
            SavedOffer(user_id=user.id, offer_id=offer.id),
            SavedOffer(user_id=user.id, offer_id=offer.id),
        ],
    )

    with pytest.raises(IntegrityError):
        db_session.flush()
