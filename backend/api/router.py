from fastapi import APIRouter

from auth.routes import router as auth_router
from offers.routes import router as offers_router

api_router = APIRouter(prefix="/api")

api_router.include_router(offers_router, prefix="/offers", tags=["offers"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
