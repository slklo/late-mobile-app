from fastapi import FastAPI

from core.config import settings
from api.router import api_router

app = FastAPI(
    title=settings.app_name
)

app.include_router(api_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}