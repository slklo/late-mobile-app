from fastapi import APIRouter

from auth.routes import router as auth_router
from offers.routes import router as offers_router
from saved_offers.routes import router as saved_offers_router

api_router = APIRouter(prefix="/api")

api_router.include_router(offers_router, prefix="/offers", tags=["offers"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(
    saved_offers_router,
    prefix="/saved-offers",
    tags=["saved-offers"],
)
