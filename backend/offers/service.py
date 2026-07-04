from sqlalchemy.orm import Session

from offers.models import Offer
from offers.repository import OfferRepository

class OfferNotFoundError(Exception):
    pass

class OfferService:
    def __init__(self, db: Session):
        self.repository = OfferRepository(db)

    def list_offers(self) -> list[Offer]:
        return self.repository.list_active_offers()
    
    def get_offer_detail(self, offer_id: int) -> Offer:
        offer = self.repository.get_offer_by_id(offer_id)

        if offer is None:
            raise OfferNotFoundError(f"Offer with id={offer_id} not found")
        
        return offer