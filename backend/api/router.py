from fastapi import APIRouter

from offers.routes import router as offers_router

api_router = APIRouter(prefix="/api")

api_router.include_router(offers_router, prefix="/offers", tags=["Offers"])