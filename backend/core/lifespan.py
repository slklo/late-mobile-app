import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from redis.exceptions import RedisError

from core.redis import create_redis_client

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    redis_client = create_redis_client()
    app.state.redis = redis_client

    try: 
        try:
            await redis_client.ping()
            logger.info("Redis connection established")
        except RedisError:
            logger.warning(
                "Redis is unavailable; authentication features are disabled",
                exc_info=True,
            )
        yield
    finally:
        await redis_client.aclose()

