import logging
from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.dependencies import get_session_service
from auth.exceptions import (
    AuthenticationServiceUnavailableError,
    InvalidRefreshTokenError,
)
from auth.routes import router
from auth.session_service import AuthSessionTokens
from core.exception_handlers import register_exception_handlers


OLD_REFRESH_TOKEN = "old-refresh-token-" + "a" * 32
NEW_REFRESH_TOKEN = "new-refresh-token-" + "b" * 32
UNKNOWN_REFRESH_TOKEN = "unknown-refresh-token-" + "c" * 32


class StubSessionService:
    def __init__(self) -> None:
        self.last_refresh_token: str | None = None
        self.last_revoked_token: str | None = None
        self.refresh_error: Exception | None = None
        self.revoke_error: Exception | None = None

    def refresh_session(self, refresh_token: str) -> AuthSessionTokens:
        self.last_refresh_token = refresh_token

        if self.refresh_error is not None:
            raise self.refresh_error

        return AuthSessionTokens(
            access_token="new-access-token",
            refresh_token=NEW_REFRESH_TOKEN,
            access_expires_in_seconds=900,
            refresh_expires_in_seconds=2_592_000,
        )

    def revoke_session(self, refresh_token: str) -> None:
        self.last_revoked_token = refresh_token

        if self.revoke_error is not None:
            raise self.revoke_error


@pytest.fixture
def session_service() -> StubSessionService:
    return StubSessionService()


@pytest.fixture
def app(session_service: StubSessionService) -> FastAPI:
    test_app = FastAPI()
    register_exception_handlers(test_app)
    test_app.include_router(router, prefix="/api/auth")
    test_app.dependency_overrides[get_session_service] = (
        lambda: session_service
    )
    return test_app


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


def test_refresh_returns_new_token_pair_without_session_metadata(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/auth/token/refresh",
        json={"refresh_token": OLD_REFRESH_TOKEN},
    )

    assert response.status_code == 200
    assert response.json() == {
        "access_token": "new-access-token",
        "refresh_token": NEW_REFRESH_TOKEN,
        "token_type": "bearer",
        "access_expires_in_seconds": 900,
        "refresh_expires_in_seconds": 2_592_000,
    }
    assert OLD_REFRESH_TOKEN not in response.text
    assert "user" not in response.json()
    assert "next_step" not in response.json()


def test_refresh_passes_token_to_session_service(
    client: TestClient,
    session_service: StubSessionService,
) -> None:
    response = client.post(
        "/api/auth/token/refresh",
        json={"refresh_token": OLD_REFRESH_TOKEN},
    )

    assert response.status_code == 200
    assert session_service.last_refresh_token == OLD_REFRESH_TOKEN


def test_invalid_refresh_token_uses_neutral_401_contract(
    client: TestClient,
    session_service: StubSessionService,
) -> None:
    session_service.refresh_error = InvalidRefreshTokenError()

    response = client.post(
        "/api/auth/token/refresh",
        json={"refresh_token": OLD_REFRESH_TOKEN},
    )

    assert response.status_code == 401
    assert response.json() == {
        "error": {
            "code": "INVALID_REFRESH_TOKEN",
            "message": "Invalid refresh token",
        }
    }
    assert OLD_REFRESH_TOKEN not in response.text


def test_refresh_database_failure_uses_neutral_503_contract(
    client: TestClient,
    session_service: StubSessionService,
) -> None:
    session_service.refresh_error = AuthenticationServiceUnavailableError()

    response = client.post(
        "/api/auth/token/refresh",
        json={"refresh_token": OLD_REFRESH_TOKEN},
    )

    assert response.status_code == 503
    assert response.json() == {
        "error": {
            "code": "AUTHENTICATION_SERVICE_UNAVAILABLE",
            "message": "Authentication is temporarily unavailable",
        }
    }
    assert OLD_REFRESH_TOKEN not in response.text


def test_refresh_failure_does_not_log_token(
    client: TestClient,
    session_service: StubSessionService,
    caplog: pytest.LogCaptureFixture,
) -> None:
    session_service.refresh_error = InvalidRefreshTokenError()

    with caplog.at_level(logging.DEBUG):
        response = client.post(
            "/api/auth/token/refresh",
            json={"refresh_token": OLD_REFRESH_TOKEN},
        )

    assert response.status_code == 401
    assert OLD_REFRESH_TOKEN not in response.text
    assert OLD_REFRESH_TOKEN not in caplog.text


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"refresh_token": ""},
    ],
)
def test_refresh_rejects_missing_or_empty_token(
    client: TestClient,
    payload: dict[str, str],
) -> None:
    response = client.post(
        "/api/auth/token/refresh",
        json=payload,
    )

    assert response.status_code == 422


def test_logout_revokes_token_and_returns_empty_204(
    client: TestClient,
    session_service: StubSessionService,
) -> None:
    response = client.post(
        "/api/auth/logout",
        json={"refresh_token": OLD_REFRESH_TOKEN},
    )

    assert response.status_code == 204
    assert response.content == b""
    assert session_service.last_revoked_token == OLD_REFRESH_TOKEN


def test_logout_is_neutral_for_unknown_token(
    client: TestClient,
    session_service: StubSessionService,
) -> None:
    response = client.post(
        "/api/auth/logout",
        json={"refresh_token": UNKNOWN_REFRESH_TOKEN},
    )

    assert response.status_code == 204
    assert response.content == b""
    assert session_service.last_revoked_token == UNKNOWN_REFRESH_TOKEN


def test_logout_failure_does_not_leak_token(
    client: TestClient,
    session_service: StubSessionService,
) -> None:
    session_service.revoke_error = AuthenticationServiceUnavailableError()

    response = client.post(
        "/api/auth/logout",
        json={"refresh_token": OLD_REFRESH_TOKEN},
    )

    assert response.status_code == 503
    assert response.json()["error"]["code"] == (
        "AUTHENTICATION_SERVICE_UNAVAILABLE"
    )
    assert OLD_REFRESH_TOKEN not in response.text


def test_openapi_contains_refresh_and_logout_endpoints(app: FastAPI) -> None:
    paths = app.openapi()["paths"]

    assert "post" in paths["/api/auth/token/refresh"]
    assert "post" in paths["/api/auth/logout"]
