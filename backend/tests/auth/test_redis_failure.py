from fastapi import FastAPI
from fastapi.testclient import TestClient
from redis.exceptions import RedisError

from auth.challenge_repository import ChallengeRepository
from auth.dependencies import get_auth_service
from auth.routes import router
from auth.service import AuthService, AuthServiceConfig
from core.exception_handlers import register_exception_handlers


class FailingRedis:
    async def set(self, *args, **kwargs):
        raise RedisError("Redis is unavailable")


class NeverCalledUserRepository:
    def get_by_email(self, email: str):
        raise AssertionError("User lookup must not run after Redis failure")


class NeverCalledUserService:
    def create_user(self, data):
        raise AssertionError("User creation was not expected")


def test_redis_failure_during_email_request_returns_503() -> None:
    service = AuthService(
        users=NeverCalledUserRepository(),  # type: ignore[arg-type]
        user_service=NeverCalledUserService(),  # type: ignore[arg-type]
        challenges=ChallengeRepository(FailingRedis()),  # type: ignore[arg-type]
        config=AuthServiceConfig(
            challenge_secret=(
                "test-challenge-secret-with-at-least-32-characters"
            ),
            challenge_ttl_seconds=600,
            resend_cooldown_seconds=60,
            magic_link_token_bytes=32,
            code_max_attempts=5,
        ),
    )
    app = FastAPI()
    register_exception_handlers(app)
    app.include_router(router, prefix="/api/auth")
    app.dependency_overrides[get_auth_service] = lambda: service

    with TestClient(app) as client:
        response = client.post(
            "/api/auth/email/request",
            json={"email": "redis-failure@example.com"},
        )

    assert response.status_code == 503
    assert response.json() == {
        "error": {
            "code": "AUTHENTICATION_SERVICE_UNAVAILABLE",
            "message": "Authentication is temporarily unavailable",
        }
    }
