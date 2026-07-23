import asyncio
import re
from dataclasses import dataclass

from auth.challenge_repository import ChallengeKind, ChallengeRecord
from auth.challenge_secrets import hash_challenge_secret
from auth.service import (
    AuthService,
    AuthServiceConfig,
    IssueEmailChallengeResult,
)


TEST_CHALLENGE_SECRET = "test-challenge-secret-with-at-least-32-characters"


@dataclass
class StubUser:
    is_active: bool = True


class StubUserRepository:
    def __init__(self, user: StubUser | None):
        self.user = user
        self.requested_email: str | None = None

    def get_by_email(self, email: str) -> StubUser | None:
        self.requested_email = email
        return self.user


class StubUserService:
    def __init__(self, users: StubUserRepository):
        self.users = users

    def create_user(self, data):
        raise AssertionError("create_user was not expected in this test")


class StubChallengeRepository:
    def __init__(self):
        self.saved_challenge: ChallengeRecord | None = None
        self.saved_ttl: int | None = None

    async def save_challenge(
        self,
        challenge: ChallengeRecord,
        ttl_seconds: int,
    ) -> None:
        self.saved_challenge = challenge
        self.saved_ttl = ttl_seconds


def create_service(
    user: StubUser | None,
) -> tuple[AuthService, StubUserRepository, StubChallengeRepository]:
    users = StubUserRepository(user)
    challenges = StubChallengeRepository()
    config = AuthServiceConfig(
        challenge_secret=TEST_CHALLENGE_SECRET,
        challenge_ttl_seconds=600,
        resend_cooldown_seconds=60,
        magic_link_token_bytes=32,
        code_max_attempts=5,
    )

    service = AuthService(
        users=users,  # type: ignore[arg-type]
        user_service=StubUserService(users),  # type: ignore[arg-type]
        challenges=challenges,  # type: ignore[arg-type]
        config=config,
    )
    return service, users, challenges


def request_challenge(
    service: AuthService,
    email: str = " Test@Example.com ",
) -> IssueEmailChallengeResult:
    return asyncio.run(service.request_email_challenge(email))


def test_new_user_receives_six_digit_code() -> None:
    service, users, challenges = create_service(user=None)

    result = request_challenge(service)

    assert users.requested_email == "test@example.com"
    assert result.delivery.recipient == "test@example.com"
    assert result.delivery.kind is ChallengeKind.NEW_USER
    assert re.fullmatch(r"\d{6}", result.delivery.secret)

    assert challenges.saved_challenge is not None
    assert challenges.saved_challenge.kind is ChallengeKind.NEW_USER
    assert challenges.saved_challenge.email == "test@example.com"
    assert challenges.saved_challenge.secret_hash != result.delivery.secret
    assert challenges.saved_challenge.secret_hash == hash_challenge_secret(
        result.delivery.secret,
        key=TEST_CHALLENGE_SECRET,
    )
    assert challenges.saved_ttl == 600


def test_existing_user_receives_magic_link_token() -> None:
    service, _, challenges = create_service(user=StubUser())

    result = request_challenge(service)

    assert result.delivery.kind is ChallengeKind.EXISTING_USER
    assert len(result.delivery.secret) >= 43
    assert re.fullmatch(
        r"[A-Za-z0-9_-]+",
        result.delivery.secret,
    )

    assert challenges.saved_challenge is not None
    assert challenges.saved_challenge.kind is ChallengeKind.EXISTING_USER
    assert challenges.saved_challenge.secret_hash != result.delivery.secret


def test_public_response_is_neutral_for_both_user_states() -> None:
    new_user_service, _, _ = create_service(user=None)
    existing_user_service, _, _ = create_service(user=StubUser())

    new_user_result = request_challenge(new_user_service)
    existing_user_result = request_challenge(existing_user_service)

    new_response = new_user_result.response.model_dump(
        exclude={"challenge_id"},
    )
    existing_response = existing_user_result.response.model_dump(
        exclude={"challenge_id"},
    )

    assert new_response == existing_response
    assert "user" not in new_response
    assert "kind" not in new_response
    assert "secret" not in new_response


def test_inactive_existing_user_stays_existing_user() -> None:
    service, _, _ = create_service(user=StubUser(is_active=False))

    result = request_challenge(service)

    assert result.delivery.kind is ChallengeKind.EXISTING_USER


def test_internal_secrets_are_excluded_from_repr() -> None:
    service, _, _ = create_service(user=None)

    result = request_challenge(service)

    assert result.delivery.secret not in repr(result.delivery)
    assert TEST_CHALLENGE_SECRET not in repr(service.config)
