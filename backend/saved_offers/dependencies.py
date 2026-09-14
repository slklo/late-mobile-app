from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from core.database import get_db
from offers.dependencies import OfferRepositoryDep
from saved_offers.repository import SavedOfferRepository
from saved_offers.service import SavedOfferService


DbSession = Annotated[Session, Depends(get_db)]


def get_saved_offer_repository(db: DbSession) -> SavedOfferRepository:
    return SavedOfferRepository(db)


SavedOfferRepositoryDep = Annotated[
    SavedOfferRepository,
    Depends(get_saved_offer_repository),
]


def get_saved_offer_service(
    db: DbSession,
    saved_offers: SavedOfferRepositoryDep,
    offers: OfferRepositoryDep,
) -> SavedOfferService:
    return SavedOfferService(
        db=db,
        saved_offers=saved_offers,
        offers=offers,
    )


SavedOfferServiceDep = Annotated[
    SavedOfferService,
    Depends(get_saved_offer_service),
]
