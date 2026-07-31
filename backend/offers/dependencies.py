from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from core.database import get_db
from offers.repository import OfferRepository
from offers.service import OfferService


DbSession = Annotated[Session, Depends(get_db)]


def get_offer_repository(db: DbSession) -> OfferRepository:
    return OfferRepository(db)


OfferRepositoryDep = Annotated[
    OfferRepository,
    Depends(get_offer_repository),
]


def get_offer_service(repository: OfferRepositoryDep) -> OfferService:
    return OfferService(repository)


OfferServiceDep = Annotated[
    OfferService,
    Depends(get_offer_service),
]
