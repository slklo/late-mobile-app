from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from offers.models import Offer

class OfferRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_active_offers(self) -> list[Offer]:
        stmt = (
            select(Offer)
            .options(
                selectinload(Offer.restaurant),
                selectinload(Offer.category),
            )
            .where(Offer.is_active.is_(True))
            .order_by(Offer.pickup_start.asc())
        )

        return list(self.db.scalars(stmt).all())
    
    def get_offer_by_id(self, offer_id: int) -> Offer | None:
        stmt = (
            select(Offer)
            .options(
                selectinload(Offer.restaurant),
                selectinload(Offer.category),
            )
            .where(Offer.id == offer_id)
        )

        return self.db.scalars(stmt).first()
        
