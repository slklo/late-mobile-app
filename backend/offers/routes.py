from fastapi import APIRouter

from offers.dependencies import OfferServiceDep
from offers.schemas import OfferRead

router = APIRouter()


@router.get("/", response_model=list[OfferRead])
def list_offers(service: OfferServiceDep):
    return service.list_offers()


@router.get("/{offer_id}", response_model=OfferRead)
def read_offer_detail(
    offer_id: int,
    service: OfferServiceDep,
):
    return service.get_offer_detail(offer_id)
