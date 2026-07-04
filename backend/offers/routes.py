from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from offers.schemas import OfferRead
from offers.service import OfferService

router = APIRouter()

@router.get("/", response_model=list[OfferRead])
def list_offers(db: Session = Depends(get_db)):
    service = OfferService(db)
    return service.list_offers()

@router.get("/{offer_id}", response_model=OfferRead)
def read_offer_detail(
    offer_id: int,
    db: Session = Depends(get_db),
):
    service = OfferService(db)
    return service.get_offer_detail(offer_id)
    