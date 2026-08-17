import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID, uuid4

import pytest

from auth.challenge_repository import ChallengeKind, ChallengeRecord
from auth.challenge_secrets import hash_challenge_secret
from auth.exceptions import InvalidMagicLinkError
from auth.schemas import AuthNextStep, AuthSessionResponse
from auth.session_service import AuthSessionTokens
from auth.service import AuthService, AuthServiceConfig
from auth.token_service import create_access_token, decode_access_token


TEST_CHALLENGE_SECRET = "test-challenge-secret-with-at-least-32-characters"
VALID_TOKEN = "a" * 43
INVALID_TOKEN = "b" * 43
REFRESH_TOKEN = "magic-link-refresh-token-" + "r" * 32


@dataclass
class StubUser:
    id: int
    email: str
    full_name: str | None = "Existing User"
    is_active: bool = True
    created_at: datetime = datetime(2026, 1, 1, tzinfo=timezone.utc)
    email_verified_at: datetime | None = datetime(
        2026,
        1,
        1,
        tzinfo=timezone.utc,
    )
    profile_completed_at: datetime | None = datetime(
        2026,
        1,
        1,
        tzinfo=timezone.utc,
    )


class StubUserRepository:
    def __init__(self, user: StubUser | None):
        self.user = user

    def get_by_email(self, email: str) -> StubUser | None:
        if self.user is not None and self.user.email == email:
            return self.user

        return None


class UnusedUserService:
    def create_user(self, data):
        raise AssertionError("Magic-link login must not create a user")


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

        if snapshot is None or snapshot.challenge_id != challenge_id:
            return None

        return snapshot

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
    token: str = VALID_TOKEN,
    kind: ChallengeKind = ChallengeKind.EXISTING_USER,
) -> ChallengeRecord:
    return ChallengeRecord(
        challenge_id=uuid4(),
        email="existing@example.com",
        kind=kind,
        secret_hash=hash_challenge_secret(
            token,
            key=TEST_CHALLENGE_SECRET,
        ),
    )


def create_service(
    challenge: ChallengeRecord | None,
    *,
    user: StubUser | None = None,
) -> tuple[AuthService, StubChallengeRepository, StubSessionService]:
    if user is None and challenge is not None:
        user = StubUser(id=202, email=challenge.email)

    challenges = StubChallengeRepository(challenge)
    sessions = StubSessionService()
    service = AuthService(
        users=StubUserRepository(user),  # type: ignore[arg-type]
        user_service=UnusedUserService(),  # type: ignore[arg-type]
        challenges=challenges,  # type: ignore[arg-type]
        sessions=sessions,  # type: ignore[arg-type]
        config=AuthServiceConfig(
            challenge_secret=TEST_CHALLENGE_SECRET,
            challenge_ttl_seconds=600,
            resend_cooldown_seconds=60,
            magic_link_token_bytes=32,
            code_max_attempts=5,
        ),
    )
    return service, challenges, sessions


def consume(
    service: AuthService,
    challenge_id: UUID,
    token: str,
) -> AuthSessionResponse:
    return asyncio.run(service.consume_magic_link(challenge_id, token))


def test_valid_magic_link_returns_session_and_is_consumed() -> None:
    challenge = make_challenge()
    service, challenges, sessions = create_service(challenge)

    result = consume(service, challenge.challenge_id, VALID_TOKEN)

    assert challenges.challenge is None
    assert result.user.email == challenge.email
    assert result.next_step is AuthNextStep.EXPLORE
    assert decode_access_token(result.access_token) == result.user.id
    assert result.refresh_token == REFRESH_TOKEN
    assert result.access_expires_in_seconds == 900
    assert result.refresh_expires_in_seconds == 2_592_000
    assert len(sessions.issued_users) == 1
    assert sessions.issued_users[0].id == result.user.id


def test_wrong_token_does_not_consume_challenge() -> None:
    challenge = make_challenge()
    service, challenges, sessions = create_service(challenge)

    with pytest.raises(InvalidMagicLinkError):
        consume(service, challenge.challenge_id, INVALID_TOKEN)

    assert challenges.challenge is challenge
    assert sessions.issued_users == []


def test_expired_or_missing_magic_link_fails() -> None:
    service, _, _ = create_service(challenge=None)

    with pytest.raises(InvalidMagicLinkError):
        consume(service, uuid4(), VALID_TOKEN)


def test_new_user_code_challenge_cannot_be_consumed_as_magic_link() -> None:
    challenge = make_challenge(kind=ChallengeKind.NEW_USER)
    service, challenges, _ = create_service(challenge)

    with pytest.raises(InvalidMagicLinkError):
        consume(service, challenge.challenge_id, VALID_TOKEN)

    assert challenges.challenge is challenge


def test_missing_or_inactive_user_cannot_receive_session() -> None:
    missing_user_challenge = make_challenge()
    missing_user_service, missing_user_challenges, _ = create_service(
        missing_user_challenge,
        user=StubUser(
            id=999,
            email="different@example.com",
        ),
    )

    with pytest.raises(InvalidMagicLinkError):
        consume(
            missing_user_service,
            missing_user_challenge.challenge_id,
            VALID_TOKEN,
        )

    assert missing_user_challenges.challenge is None

    inactive_challenge = make_challenge()
    inactive_service, inactive_challenges, _ = create_service(
        inactive_challenge,
        user=StubUser(
            id=202,
            email=inactive_challenge.email,
            is_active=False,
        ),
    )

    with pytest.raises(InvalidMagicLinkError):
        consume(
            inactive_service,
            inactive_challenge.challenge_id,
            VALID_TOKEN,
        )

    assert inactive_challenges.challenge is None


def test_parallel_magic_link_consumption_succeeds_only_once() -> None:
    challenge = make_challenge()
    service, challenges, sessions = create_service(challenge)

    async def run_parallel():
        return await asyncio.gather(
            service.consume_magic_link(challenge.challenge_id, VALID_TOKEN),
            service.consume_magic_link(challenge.challenge_id, VALID_TOKEN),
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
        if isinstance(result, InvalidMagicLinkError)
    ]

    assert len(successes) == 1
    assert len(failures) == 1
    assert challenges.challenge is None
    assert len(sessions.issued_users) == 1
