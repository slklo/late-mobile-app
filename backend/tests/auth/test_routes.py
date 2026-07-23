import logging
from datetime import datetime, timezone
from uuid import UUID, uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.challenge_repository import ChallengeKind
from auth.dependencies import get_auth_service
from auth.exceptions import (
    EmailVerificationAttemptsExceededError,
    InvalidEmailVerificationError,
)
from auth.routes import router
from auth.schemas import (
    AuthNextStep,
    AuthSessionResponse,
    EmailChallengeResponse,
)
from auth.service import (
    ChallengeDelivery,
    IssueEmailChallengeResult,
    NEUTRAL_EMAIL_CHALLENGE_MESSAGE,
)
from core.config import settings
from core.exception_handlers import register_exception_handlers
from users.schemas import UserRead


NEW_USER_EMAIL = "new@example.com"
EXISTING_USER_EMAIL = "existing@example.com"
NEW_USER_CODE = "042731"
EXISTING_USER_TOKEN = "a" * 43


class StubAuthService:
    def __init__(self):
        self.last_delivery: ChallengeDelivery | None = None
        self.last_verification: tuple[UUID, str] | None = None

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

    async def verify_email_code(
        self,
        challenge_id: UUID,
        code: str,
    ) -> AuthSessionResponse:
        self.last_verification = challenge_id, code

        if code == "000000":
            raise InvalidEmailVerificationError()

        if code == "999999":
            raise EmailVerificationAttemptsExceededError()

        return AuthSessionResponse(
            access_token="test-access-token",
            user=UserRead(
                id=101,
                email=NEW_USER_EMAIL,
                full_name=None,
                is_active=True,
                created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
            ),
            next_step=AuthNextStep.COMPLETE_PROFILE,
        )


@pytest.fixture
def auth_service() -> StubAuthService:
    return StubAuthService()


@pytest.fixture
def client(auth_service: StubAuthService):
    app = FastAPI()
    register_exception_handlers(app)
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


def test_verify_code_returns_session_without_verification_code(
    client: TestClient,
    auth_service: StubAuthService,
) -> None:
    challenge_id = uuid4()

    response = client.post(
        "/api/auth/email/verify-code",
        json={
            "challenge_id": str(challenge_id),
            "code": "123456",
        },
    )

    assert response.status_code == 200
    assert auth_service.last_verification == (challenge_id, "123456")
    assert set(response.json()) == {
        "access_token",
        "token_type",
        "user",
        "next_step",
    }
    assert "123456" not in response.text
    assert str(challenge_id) not in response.text


@pytest.mark.parametrize(
    ("code", "expected_status", "expected_error"),
    [
        ("000000", 400, "INVALID_EMAIL_VERIFICATION"),
        (
            "999999",
            429,
            "EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED",
        ),
    ],
)
def test_verify_code_maps_business_errors(
    client: TestClient,
    code: str,
    expected_status: int,
    expected_error: str,
) -> None:
    response = client.post(
        "/api/auth/email/verify-code",
        json={
            "challenge_id": str(uuid4()),
            "code": code,
        },
    )

    assert response.status_code == expected_status
    assert response.json()["error"]["code"] == expected_error


def test_verify_code_rejects_malformed_code(client: TestClient) -> None:
    response = client.post(
        "/api/auth/email/verify-code",
        json={
            "challenge_id": str(uuid4()),
            "code": "12345A",
        },
    )

    assert response.status_code == 422
