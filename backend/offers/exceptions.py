from core.exception_handlers import AppError


class OfferNotFoundError(AppError):
    code = "OFFER_NOT_FOUND"

    def __init__(self, offer_id: int):
        self.offer_id = offer_id
        super().__init__(f"Offer with id={offer_id} not found")
