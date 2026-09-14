from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from offers.exceptions import OfferNotFoundError
from offers.repository import OfferRepository
from saved_offers.models import SavedOffer
from saved_offers.repository import SavedOfferRepository


class SavedOfferService:
    def __init__(
        self,
        db: Session,
        saved_offers: SavedOfferRepository,
        offers: OfferRepository,
    ):
        self.db = db
        self.saved_offers = saved_offers
        self.offers = offers

    def list_saved_offers(self, user_id: int) -> list[SavedOffer]:
        return self.saved_offers.list_by_user_id(user_id)

    def save_offer(self, *, user_id: int, offer_id: int) -> SavedOffer:
        existing = self.saved_offers.get_by_user_and_offer(
            user_id=user_id,
            offer_id=offer_id,
        )

        if existing is not None:
            return existing

        offer = self.offers.get_offer_by_id(offer_id)

        if offer is None:
            raise OfferNotFoundError(offer_id)

        saved_offer = SavedOffer(user_id=user_id, offer_id=offer_id)

        try:
            self.saved_offers.add(saved_offer)
            self.db.flush()
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            existing = self.saved_offers.get_by_user_and_offer(
                user_id=user_id,
                offer_id=offer_id,
            )

            if existing is None:
                raise

            return existing
        except Exception:
            self.db.rollback()
            raise

        return self.saved_offers.get_by_user_and_offer(
            user_id=user_id,
            offer_id=offer_id,
        ) or saved_offer

    def remove_saved_offer(self, *, user_id: int, offer_id: int) -> None:
        existing = self.saved_offers.get_by_user_and_offer(
            user_id=user_id,
            offer_id=offer_id,
        )

        if existing is None:
            return

        try:
            self.saved_offers.delete(existing)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
