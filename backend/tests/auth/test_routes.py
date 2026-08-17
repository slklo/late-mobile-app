import logging
from datetime import datetime, timezone
from uuid import UUID, uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.challenge_repository import ChallengeKind
from auth.dependencies import (
    get_auth_service,
    get_current_user,
)
from auth.exceptions import (
    EmailChallengeRateLimitedError,
    EmailVerificationAttemptsExceededError,
    InvalidEmailVerificationError,
    InvalidMagicLinkError,
)
from auth.routes import link_router, router
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
from users.dependencies import get_user_service
from users.schemas import UserRead


NEW_USER_EMAIL = "new@example.com"
EXISTING_USER_EMAIL = "existing@example.com"
NEW_USER_CODE = "042731"
EXISTING_USER_TOKEN = "a" * 43
INVALID_EXISTING_USER_TOKEN = "b" * 43
AUTH_REFRESH_TOKEN = "auth-refresh-token-" + "r" * 32


class StubAuthService:
    def __init__(self):
        self.last_delivery: ChallengeDelivery | None = None
        self.last_verification: tuple[UUID, str] | None = None
        self.last_link_consumption: tuple[UUID, str] | None = None
        self.link_consume_calls = 0

    async def request_email_challenge(
        self,
        email: str,
    ) -> IssueEmailChallengeResult:
        if email == "limited@example.com":
            raise EmailChallengeRateLimitedError()

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
            refresh_token=AUTH_REFRESH_TOKEN,
            access_expires_in_seconds=900,
            refresh_expires_in_seconds=2_592_000,
            user=UserRead(
                id=101,
                email=NEW_USER_EMAIL,
                full_name=None,
                is_active=True,
                created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
                email_verified_at=datetime(
                    2026,
                    1,
                    1,
                    tzinfo=timezone.utc,
                ),
                profile_completed_at=None,
            ),
            next_step=AuthNextStep.COMPLETE_PROFILE,
        )

    async def consume_magic_link(
        self,
        challenge_id: UUID,
        token: str,
    ) -> AuthSessionResponse:
        self.link_consume_calls += 1
        self.last_link_consumption = challenge_id, token

        if token == INVALID_EXISTING_USER_TOKEN:
            raise InvalidMagicLinkError()

        return AuthSessionResponse(
            access_token="test-access-token",
            refresh_token=AUTH_REFRESH_TOKEN,
            access_expires_in_seconds=900,
            refresh_expires_in_seconds=2_592_000,
            user=UserRead(
                id=202,
                email=EXISTING_USER_EMAIL,
                full_name="Existing User",
                is_active=True,
                created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
                email_verified_at=datetime(
                    2026,
                    1,
                    1,
                    tzinfo=timezone.utc,
                ),
                profile_completed_at=datetime(
                    2026,
                    1,
                    1,
                    tzinfo=timezone.utc,
                ),
            ),
            next_step=AuthNextStep.EXPLORE,
        )


class StubProfileService:
    def __init__(self):
        self.last_update: tuple[int, str] | None = None

    def complete_profile(self, user_id: int, full_name: str):
        self.last_update = user_id, full_name
        return UserRead(
            id=user_id,
            email=NEW_USER_EMAIL,
            full_name=full_name,
            is_active=True,
            created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
            email_verified_at=datetime(
                2026,
                1,
                1,
                tzinfo=timezone.utc,
            ),
            profile_completed_at=datetime(
                2026,
                1,
                2,
                tzinfo=timezone.utc,
            ),
        )


@pytest.fixture
def auth_service() -> StubAuthService:
    return StubAuthService()


@pytest.fixture
def profile_service() -> StubProfileService:
    return StubProfileService()


@pytest.fixture
def current_user() -> UserRead:
    return UserRead(
        id=101,
        email=NEW_USER_EMAIL,
        full_name=None,
        is_active=True,
        created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        email_verified_at=datetime(
            2026,
            1,
            1,
            tzinfo=timezone.utc,
        ),
        profile_completed_at=None,
    )


@pytest.fixture
def client(
    auth_service: StubAuthService,
    profile_service: StubProfileService,
    current_user: UserRead,
):
    app = FastAPI()
    register_exception_handlers(app)
    app.include_router(router, prefix="/api/auth")
    app.include_router(link_router)
    app.dependency_overrides[get_auth_service] = lambda: auth_service
    app.dependency_overrides[get_current_user] = lambda: current_user
    app.dependency_overrides[get_user_service] = lambda: profile_service

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


def test_email_request_maps_resend_cooldown(
    client: TestClient,
) -> None:
    response = post_email(client, "limited@example.com")

    assert response.status_code == 429
    assert response.json()["error"]["code"] == (
        "EMAIL_CHALLENGE_RATE_LIMITED"
    )


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
        "refresh_token",
        "token_type",
        "access_expires_in_seconds",
        "refresh_expires_in_seconds",
        "user",
        "next_step",
    }
    assert response.json()["refresh_token"] == AUTH_REFRESH_TOKEN
    assert response.json()["access_expires_in_seconds"] == 900
    assert response.json()["refresh_expires_in_seconds"] == 2_592_000
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
    assert AUTH_REFRESH_TOKEN not in response.text


def test_successful_verification_does_not_log_refresh_token(
    client: TestClient,
    caplog: pytest.LogCaptureFixture,
) -> None:
    with caplog.at_level(logging.DEBUG):
        response = client.post(
            "/api/auth/email/verify-code",
            json={
                "challenge_id": str(uuid4()),
                "code": "123456",
            },
        )

    assert response.status_code == 200
    assert AUTH_REFRESH_TOKEN not in caplog.text


def test_verify_code_rejects_malformed_code(client: TestClient) -> None:
    response = client.post(
        "/api/auth/email/verify-code",
        json={
            "challenge_id": str(uuid4()),
            "code": "12345A",
        },
    )

    assert response.status_code == 422


def test_get_magic_link_redirects_without_consuming(
    client: TestClient,
    auth_service: StubAuthService,
) -> None:
    challenge_id = uuid4()

    response = client.get(
        "/auth/email/link",
        params={
            "challenge_id": str(challenge_id),
            "token": EXISTING_USER_TOKEN,
        },
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.headers["location"] == (
        "lateplate://auth/email/link"
        f"?challenge_id={challenge_id}"
        f"&token={EXISTING_USER_TOKEN}"
    )
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert auth_service.link_consume_calls == 0


def test_post_consume_link_returns_existing_user_session(
    client: TestClient,
    auth_service: StubAuthService,
) -> None:
    challenge_id = uuid4()

    response = client.post(
        "/api/auth/email/consume-link",
        json={
            "challenge_id": str(challenge_id),
            "token": EXISTING_USER_TOKEN,
        },
    )

    assert response.status_code == 200
    assert auth_service.last_link_consumption == (
        challenge_id,
        EXISTING_USER_TOKEN,
    )
    assert response.json()["next_step"] == "explore"
    assert response.json()["user"]["email"] == EXISTING_USER_EMAIL
    assert set(response.json()) == {
        "access_token",
        "refresh_token",
        "token_type",
        "access_expires_in_seconds",
        "refresh_expires_in_seconds",
        "user",
        "next_step",
    }
    assert response.json()["refresh_token"] == AUTH_REFRESH_TOKEN
    assert EXISTING_USER_TOKEN not in response.text
    assert str(challenge_id) not in response.text


def test_post_consume_link_maps_invalid_link_error(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/auth/email/consume-link",
        json={
            "challenge_id": str(uuid4()),
            "token": INVALID_EXISTING_USER_TOKEN,
        },
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_MAGIC_LINK"
    assert AUTH_REFRESH_TOKEN not in response.text


def test_magic_link_endpoints_reject_malformed_token(
    client: TestClient,
) -> None:
    challenge_id = uuid4()

    get_response = client.get(
        "/auth/email/link",
        params={
            "challenge_id": str(challenge_id),
            "token": "too-short",
        },
        follow_redirects=False,
    )
    post_response = client.post(
        "/api/auth/email/consume-link",
        json={
            "challenge_id": str(challenge_id),
            "token": "too-short",
        },
    )

    assert get_response.status_code == 422
    assert post_response.status_code == 422


def test_get_me_returns_profile_completion_state(
    client: TestClient,
) -> None:
    response = client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json()["email_verified_at"] is not None
    assert response.json()["profile_completed_at"] is None


def test_complete_profile_strips_name_and_returns_completed_user(
    client: TestClient,
    profile_service: StubProfileService,
) -> None:
    response = client.patch(
        "/api/auth/me/profile",
        json={"full_name": "  Ada Lovelace  "},
    )

    assert response.status_code == 200
    assert profile_service.last_update == (101, "Ada Lovelace")
    assert response.json()["full_name"] == "Ada Lovelace"
    assert response.json()["profile_completed_at"] is not None


def test_complete_profile_rejects_blank_name(
    client: TestClient,
    profile_service: StubProfileService,
) -> None:
    response = client.patch(
        "/api/auth/me/profile",
        json={"full_name": "   "},
    )

    assert response.status_code == 422
    assert profile_service.last_update is None
