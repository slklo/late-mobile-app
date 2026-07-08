from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from categories import models as category_models  # noqa: F401
from core.config import settings
from offers import models as offer_models  # noqa: F401
from restaurants import models as restaurant_models  # noqa: F401
from api.router import api_router

app = FastAPI(
    title=settings.app_name
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
