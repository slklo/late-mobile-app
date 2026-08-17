import asyncio
from dataclasses import dataclass, replace
from datetime import datetime, timezone
from uuid import UUID, uuid4

import pytest

from auth.challenge_repository import ChallengeKind, ChallengeRecord
from auth.challenge_secrets import hash_challenge_secret
from auth.exceptions import (
    EmailVerificationAttemptsExceededError,
    InvalidEmailVerificationError,
)
from auth.schemas import AuthNextStep, AuthSessionResponse
from auth.session_service import AuthSessionTokens
from auth.service import AuthService, AuthServiceConfig
from auth.token_service import create_access_token, decode_access_token
from users.exceptions import EmailAlreadyRegisteredError


TEST_CHALLENGE_SECRET = "test-challenge-secret-with-at-least-32-characters"
VALID_CODE = "123456"
REFRESH_TOKEN = "otp-refresh-token-" + "r" * 32


@dataclass
class StubUser:
    id: int
    email: str
    full_name: str | None = None
    is_active: bool = True
    created_at: datetime = datetime(2026, 1, 1, tzinfo=timezone.utc)
    email_verified_at: datetime | None = datetime(
        2026,
        1,
        1,
        tzinfo=timezone.utc,
    )
    profile_completed_at: datetime | None = None


class StubUserRepository:
    def __init__(self, user: StubUser | None = None):
        self.user = user

    def get_by_email(self, email: str) -> StubUser | None:
        if self.user is not None and self.user.email == email:
            return self.user

        return None


class StubUserService:
    def __init__(
        self,
        users: StubUserRepository,
        *,
        simulate_unique_conflict: bool = False,
    ):
        self.users = users
        self.simulate_unique_conflict = simulate_unique_conflict
        self.create_calls = 0

    def create_user(self, data) -> StubUser:
        self.create_calls += 1

        user = StubUser(
            id=101,
            email=str(data.email),
        )
        self.users.user = user

        if self.simulate_unique_conflict:
            raise EmailAlreadyRegisteredError()

        return user


class StubChallengeRepository:
    def __init__(self, challenge: ChallengeRecord | None):
        self.challenge = challenge
        self._consume_lock = asyncio.Lock()

    async def get_challenge(
        self,
        challenge_id: UUID,
    ) -> ChallengeRecord | None:
        snapshot = self.challenge
        await asyncio.sleep(0)

        if (
            snapshot is None
            or snapshot.challenge_id != challenge_id
        ):
            return None

        return snapshot

    async def increment_failed_attempts(
        self,
        challenge_id: UUID,
    ) -> int | None:
        if (
            self.challenge is None
            or self.challenge.challenge_id != challenge_id
        ):
            return None

        self.challenge = replace(
            self.challenge,
            attempts=self.challenge.attempts + 1,
        )
        return self.challenge.attempts

    async def consume_challenge(
        self,
        challenge_id: UUID,
    ) -> ChallengeRecord | None:
        async with self._consume_lock:
            if (
                self.challenge is None
                or self.challenge.challenge_id != challenge_id
            ):
                return None

            consumed = self.challenge
            self.challenge = None
            return consumed


class StubSessionService:
    def __init__(self) -> None:
        self.issued_users: list[StubUser] = []

    def issue_session(self, user: StubUser) -> AuthSessionTokens:
        self.issued_users.append(user)
        return AuthSessionTokens(
            access_token=create_access_token(user.id),
            refresh_token=REFRESH_TOKEN,
            access_expires_in_seconds=900,
            refresh_expires_in_seconds=2_592_000,
        )


def make_challenge(
    *,
    code: str = VALID_CODE,
    attempts: int = 0,
    kind: ChallengeKind = ChallengeKind.NEW_USER,
) -> ChallengeRecord:
    return ChallengeRecord(
        challenge_id=uuid4(),
        email="new-user@example.com",
        kind=kind,
        secret_hash=hash_challenge_secret(
            code,
            key=TEST_CHALLENGE_SECRET,
        ),
        attempts=attempts,
    )


def create_service(
    challenge: ChallengeRecord | None,
    *,
    user: StubUser | None = None,
    simulate_unique_conflict: bool = False,
) -> tuple[
    AuthService,
    StubUserRepository,
    StubUserService,
    StubChallengeRepository,
    StubSessionService,
]:
    users = StubUserRepository(user)
    user_service = StubUserService(
        users,
        simulate_unique_conflict=simulate_unique_conflict,
    )
    challenges = StubChallengeRepository(challenge)
    sessions = StubSessionService()
    config = AuthServiceConfig(
        challenge_secret=TEST_CHALLENGE_SECRET,
        challenge_ttl_seconds=600,
        resend_cooldown_seconds=60,
        magic_link_token_bytes=32,
        code_max_attempts=5,
    )
    service = AuthService(
        users=users,  # type: ignore[arg-type]
        user_service=user_service,  # type: ignore[arg-type]
        challenges=challenges,  # type: ignore[arg-type]
        sessions=sessions,  # type: ignore[arg-type]
        config=config,
    )
    return service, users, user_service, challenges, sessions


def verify(
    service: AuthService,
    challenge_id: UUID,
    code: str,
) -> AuthSessionResponse:
    return asyncio.run(service.verify_email_code(challenge_id, code))


def test_valid_code_creates_user_and_consumes_challenge() -> None:
    challenge = make_challenge()
    service, _, user_service, challenges, sessions = create_service(challenge)

    result = verify(service, challenge.challenge_id, VALID_CODE)

    assert user_service.create_calls == 1
    assert challenges.challenge is None
    assert result.user.email == challenge.email
    assert result.next_step is AuthNextStep.COMPLETE_PROFILE
    assert decode_access_token(result.access_token) == result.user.id
    assert result.refresh_token == REFRESH_TOKEN
    assert result.access_expires_in_seconds == 900
    assert result.refresh_expires_in_seconds == 2_592_000
    assert len(sessions.issued_users) == 1
    assert sessions.issued_users[0].id == result.user.id


def test_wrong_code_increments_attempt_without_consuming() -> None:
    challenge = make_challenge()
    service, _, user_service, challenges, sessions = create_service(challenge)

    with pytest.raises(InvalidEmailVerificationError):
        verify(service, challenge.challenge_id, "654321")

    assert user_service.create_calls == 0
    assert challenges.challenge is not None
    assert challenges.challenge.attempts == 1
    assert sessions.issued_users == []


def test_last_wrong_attempt_invalidates_challenge() -> None:
    challenge = make_challenge(attempts=4)
    service, _, user_service, challenges, _ = create_service(challenge)

    with pytest.raises(EmailVerificationAttemptsExceededError):
        verify(service, challenge.challenge_id, "654321")

    assert user_service.create_calls == 0
    assert challenges.challenge is None


def test_correct_code_is_blocked_after_attempt_limit() -> None:
    challenge = make_challenge(attempts=5)
    service, _, user_service, challenges, _ = create_service(challenge)

    with pytest.raises(EmailVerificationAttemptsExceededError):
        verify(service, challenge.challenge_id, VALID_CODE)

    assert user_service.create_calls == 0
    assert challenges.challenge is None


def test_expired_or_missing_challenge_fails() -> None:
    service, _, user_service, _, _ = create_service(challenge=None)

    with pytest.raises(InvalidEmailVerificationError):
        verify(service, uuid4(), VALID_CODE)

    assert user_service.create_calls == 0


def test_magic_link_challenge_cannot_be_used_as_code() -> None:
    challenge = make_challenge(kind=ChallengeKind.EXISTING_USER)
    service, _, user_service, challenges, _ = create_service(challenge)

    with pytest.raises(InvalidEmailVerificationError):
        verify(service, challenge.challenge_id, VALID_CODE)

    assert user_service.create_calls == 0
    assert challenges.challenge is challenge


def test_unique_constraint_race_loads_existing_user() -> None:
    challenge = make_challenge()
    service, users, user_service, _, _ = create_service(
        challenge,
        simulate_unique_conflict=True,
    )

    result = verify(service, challenge.challenge_id, VALID_CODE)

    assert user_service.create_calls == 1
    assert users.user is not None
    assert result.user.id == users.user.id


def test_parallel_verification_succeeds_only_once() -> None:
    challenge = make_challenge()
    service, _, user_service, challenges, sessions = create_service(challenge)

    async def run_parallel():
        return await asyncio.gather(
            service.verify_email_code(challenge.challenge_id, VALID_CODE),
            service.verify_email_code(challenge.challenge_id, VALID_CODE),
            return_exceptions=True,
        )

    results = asyncio.run(run_parallel())

    successes = [
        result
        for result in results
        if isinstance(result, AuthSessionResponse)
    ]
    failures = [
        result
        for result in results
        if isinstance(result, InvalidEmailVerificationError)
    ]

    assert len(successes) == 1
    assert len(failures) == 1
    assert user_service.create_calls == 1
    assert challenges.challenge is None
    assert len(sessions.issued_users) == 1
