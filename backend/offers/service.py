from offers.exceptions import OfferNotFoundError
from offers.models import Offer
from offers.repository import OfferRepository


class OfferService:
    def __init__(self, repository: OfferRepository):
        self.repository = repository

    def list_offers(self) -> list[Offer]:
        return self.repository.list_active_offers()

    def get_offer_detail(self, offer_id: int) -> Offer:
        offer = self.repository.get_offer_by_id(offer_id)

        if offer is None:
            raise OfferNotFoundError(offer_id)

        return offer
