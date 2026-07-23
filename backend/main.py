from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.lifespan import lifespan
from core.exception_handlers import register_exception_handlers
from core.logging_config import configure_access_log_filters
from core.model_registry import import_models

import_models()
configure_access_log_filters()

from api.router import api_router  # noqa: E402
from auth.routes import link_router  # noqa: E402

app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan
)

register_exception_handlers(app)

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
app.include_router(link_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
