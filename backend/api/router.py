from fastapi import APIRouter

from offers.routes import router as offers_router
from users.routes import router as users_router

api_router = APIRouter(prefix="/api")

api_router.include_router(offers_router, prefix="/offers", tags=["offers"])
api_router.include_router(users_router, prefix="/auth", tags=["auth"])