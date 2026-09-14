from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from offers.models import Offer
from saved_offers.models import SavedOffer


def _saved_offer_detail_options():
    return (
        selectinload(SavedOffer.offer).selectinload(Offer.restaurant),
        selectinload(SavedOffer.offer).selectinload(Offer.category),
    )


class SavedOfferRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_user_id(self, user_id: int) -> list[SavedOffer]:
        stmt = (
            select(SavedOffer)
            .options(*_saved_offer_detail_options())
            .where(SavedOffer.user_id == user_id)
            .order_by(SavedOffer.created_at.desc(), SavedOffer.id.desc())
        )
        return list(self.db.scalars(stmt).all())

    def get_by_user_and_offer(
        self,
        *,
        user_id: int,
        offer_id: int,
    ) -> SavedOffer | None:
        stmt = (
            select(SavedOffer)
            .options(*_saved_offer_detail_options())
            .where(
                SavedOffer.user_id == user_id,
                SavedOffer.offer_id == offer_id,
            )
        )
        return self.db.scalars(stmt).first()

    def add(self, saved_offer: SavedOffer) -> SavedOffer:
        self.db.add(saved_offer)
        return saved_offer

    def delete(self, saved_offer: SavedOffer) -> None:
        self.db.delete(saved_offer)
