import logging

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from redis.exceptions import RedisError

from core.lifespan import lifespan


class FakeRedis:
    def __init__(self, *, fail_ping: bool = False):
        self.fail_ping = fail_ping
        self.ping_called = False
        self.closed = False

    async def ping(self) -> bool:
        self.ping_called = True

        if self.fail_ping:
            raise RedisError("connection refused")

        return True

    async def aclose(self) -> None:
        self.closed = True


def test_redis_ping_runs_on_startup(monkeypatch: pytest.MonkeyPatch) -> None:
    redis = FakeRedis()
    monkeypatch.setattr(
        "core.lifespan.create_redis_client",
        lambda: redis,
    )
    app = FastAPI(lifespan=lifespan)

    with TestClient(app):
        assert redis.ping_called is True

    assert redis.closed is True


def test_redis_outage_is_logged_and_shutdown_still_closes_client(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    redis = FakeRedis(fail_ping=True)
    monkeypatch.setattr(
        "core.lifespan.create_redis_client",
        lambda: redis,
    )
    app = FastAPI(lifespan=lifespan)

    with caplog.at_level(logging.WARNING, logger="core.lifespan"):
        with TestClient(app):
            pass

    assert "Redis is unavailable" in caplog.text
    assert redis.closed is True
