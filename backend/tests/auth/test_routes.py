import logging
from uuid import UUID, uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.challenge_repository import ChallengeKind
from auth.dependencies import get_auth_service
from auth.routes import router
from auth.schemas import EmailChallengeResponse
from auth.service import (
    ChallengeDelivery,
    IssueEmailChallengeResult,
    NEUTRAL_EMAIL_CHALLENGE_MESSAGE,
)
from core.config import settings


NEW_USER_EMAIL = "new@example.com"
EXISTING_USER_EMAIL = "existing@example.com"
NEW_USER_CODE = "042731"
EXISTING_USER_TOKEN = "a" * 43


class StubAuthService:
    def __init__(self):
        self.last_delivery: ChallengeDelivery | None = None

    async def request_email_challenge(
        self,
        email: str,
    ) -> IssueEmailChallengeResult:
        challenge_id = uuid4()

        if email == EXISTING_USER_EMAIL:
            kind = ChallengeKind.EXISTING_USER
            secret = EXISTING_USER_TOKEN
        else:
            kind = ChallengeKind.NEW_USER
            secret = NEW_USER_CODE

        delivery = ChallengeDelivery(
            challenge_id=challenge_id,
            recipient=email,
            kind=kind,
            secret=secret,
        )
        self.last_delivery = delivery

        return IssueEmailChallengeResult(
            response=EmailChallengeResponse(
                challenge_id=challenge_id,
                message=NEUTRAL_EMAIL_CHALLENGE_MESSAGE,
                expires_in_seconds=600,
                resend_after_seconds=60,
            ),
            delivery=delivery,
        )


@pytest.fixture
def auth_service() -> StubAuthService:
    return StubAuthService()


@pytest.fixture
def client(auth_service: StubAuthService):
    app = FastAPI()
    app.include_router(router, prefix="/api/auth")
    app.dependency_overrides[get_auth_service] = lambda: auth_service

    with TestClient(app) as test_client:
        yield test_client


def post_email(client: TestClient, email: str):
    return client.post(
        "/api/auth/email/request",
        json={"email": email},
    )


@pytest.mark.parametrize(
    "email",
    [NEW_USER_EMAIL, EXISTING_USER_EMAIL],
)
def test_email_request_returns_only_neutral_fields(
    client: TestClient,
    auth_service: StubAuthService,
    email: str,
) -> None:
    response = post_email(client, email)

    assert response.status_code == 202
    assert set(response.json()) == {
        "challenge_id",
        "message",
        "expires_in_seconds",
        "resend_after_seconds",
    }
    assert UUID(response.json()["challenge_id"])
    assert response.json()["message"] == NEUTRAL_EMAIL_CHALLENGE_MESSAGE

    assert auth_service.last_delivery is not None
    assert auth_service.last_delivery.secret not in response.text
    assert "user_exists" not in response.text
    assert "kind" not in response.text
    assert "secret" not in response.text
    assert "code" not in response.text
    assert "token" not in response.text


def test_existing_and_new_user_have_same_response_contract(
    client: TestClient,
) -> None:
    new_user_response = post_email(client, NEW_USER_EMAIL)
    existing_user_response = post_email(client, EXISTING_USER_EMAIL)

    new_body = new_user_response.json()
    existing_body = existing_user_response.json()
    new_body.pop("challenge_id")
    existing_body.pop("challenge_id")

    assert new_user_response.status_code == existing_user_response.status_code
    assert new_body == existing_body


def test_invalid_email_is_rejected(client: TestClient) -> None:
    response = post_email(client, "not-an-email")

    assert response.status_code == 422


def test_secret_is_logged_only_in_development(
    client: TestClient,
    auth_service: StubAuthService,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    monkeypatch.setattr(settings, "app_environment", "development")

    with caplog.at_level(logging.WARNING, logger="auth.routes"):
        response = post_email(client, NEW_USER_EMAIL)

    assert response.status_code == 202
    assert auth_service.last_delivery is not None
    assert auth_service.last_delivery.secret in caplog.text


def test_secret_is_not_logged_in_production(
    client: TestClient,
    auth_service: StubAuthService,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    monkeypatch.setattr(settings, "app_environment", "production")

    with caplog.at_level(logging.WARNING, logger="auth.routes"):
        response = post_email(client, EXISTING_USER_EMAIL)

    assert response.status_code == 202
    assert auth_service.last_delivery is not None
    assert auth_service.last_delivery.secret not in caplog.text
