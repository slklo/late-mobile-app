from fastapi import APIRouter, Depends

from offers.dependencies import get_offer_service
from offers.schemas import OfferRead
from offers.service import OfferService

router = APIRouter()


@router.get("/", response_model=list[OfferRead])
def list_offers(
    service: OfferService = Depends(get_offer_service),
):
    return service.list_offers()


@router.get("/{offer_id}", response_model=OfferRead)
def read_offer_detail(
    offer_id: int,
    service: OfferService = Depends(get_offer_service),
):
    return service.get_offer_detail(offer_id)
