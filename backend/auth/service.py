from dataclasses import dataclass, field
from uuid import UUID, uuid4

from auth.challenge_repository import (
    ChallengeKind,
    ChallengeRecord,
    ChallengeRepository,
)
from auth.challenge_secrets import (
    generate_magic_link_token,
    generate_otp_code,
    hash_challenge_secret,
    normalize_email,
    verify_challenge_secret,
)
from auth.exceptions import (
    AuthenticationServiceUnavailableError,
    EmailChallengeRateLimitedError,
    EmailVerificationAttemptsExceededError,
    InvalidEmailVerificationError,
    InvalidMagicLinkError,
)
from auth.schemas import (
    AuthNextStep,
    AuthSessionResponse,
    EmailChallengeResponse,
)
from auth.session_service import SessionService
from core.config import settings
from users.exceptions import EmailAlreadyRegisteredError
from users.models import User
from users.repository import UserRepository
from users.schemas import UserCreate, UserRead
from users.service import UserService


NEUTRAL_EMAIL_CHALLENGE_MESSAGE = (
    "If this email can be used, you will receive the next step shortly."
)


@dataclass(frozen=True, slots=True)
class ChallengeDelivery:
    challenge_id: UUID
    recipient: str
    kind: ChallengeKind
    secret: str = field(repr=False)


@dataclass(frozen=True, slots=True)
class IssueEmailChallengeResult:
    response: EmailChallengeResponse
    delivery: ChallengeDelivery


@dataclass(frozen=True, slots=True)
class AuthServiceConfig:
    challenge_secret: str = field(repr=False)
    challenge_ttl_seconds: int
    resend_cooldown_seconds: int
    magic_link_token_bytes: int
    code_max_attempts: int

    @classmethod
    def from_settings(cls) -> "AuthServiceConfig":
        return cls(
            challenge_secret=(
                settings.auth_challenge_secret.get_secret_value()
            ),
            challenge_ttl_seconds=settings.auth_challenge_ttl_seconds,
            resend_cooldown_seconds=(
                settings.auth_resend_cooldown_seconds
            ),
            magic_link_token_bytes=(
                settings.auth_magic_link_token_bytes
            ),
            code_max_attempts=settings.auth_code_max_attempts,
        )


class AuthService:
    def __init__(
        self,
        users: UserRepository,
        user_service: UserService,
        challenges: ChallengeRepository,
        sessions: SessionService,
        config: AuthServiceConfig | None = None,
    ):
        self.users = users
        self.user_service = user_service
        self.challenges = challenges
        self.sessions = sessions
        self.config = config or AuthServiceConfig.from_settings()

    async def request_email_challenge(
        self,
        email: str,
    ) -> IssueEmailChallengeResult:
        normalized_email = normalize_email(email)

        if self.config.resend_cooldown_seconds > 0:
            cooldown_acquired = (
                await self.challenges.acquire_resend_cooldown(
                    normalized_email,
                    self.config.resend_cooldown_seconds,
                )
            )

            if not cooldown_acquired:
                raise EmailChallengeRateLimitedError()

        user = self.users.get_by_email(normalized_email)

        challenge_id = uuid4()
        kind, secret = self._create_secret(user_exists=user is not None)

        challenge = ChallengeRecord(
            challenge_id=challenge_id,
            email=normalized_email,
            kind=kind,
            secret_hash=hash_challenge_secret(
                secret,
                key=self.config.challenge_secret,
            ),
        )

        await self.challenges.save_challenge(
            challenge=challenge,
            ttl_seconds=self.config.challenge_ttl_seconds,
        )

        return IssueEmailChallengeResult(
            response=EmailChallengeResponse(
                challenge_id=challenge_id,
                message=NEUTRAL_EMAIL_CHALLENGE_MESSAGE,
                expires_in_seconds=self.config.challenge_ttl_seconds,
                resend_after_seconds=(
                    self.config.resend_cooldown_seconds
                ),
            ),
            delivery=ChallengeDelivery(
                challenge_id=challenge_id,
                recipient=normalized_email,
                kind=kind,
                secret=secret,
            ),
        )

    def _create_secret(
        self,
        *,
        user_exists: bool,
    ) -> tuple[ChallengeKind, str]:
        if user_exists:
            return (
                ChallengeKind.EXISTING_USER,
                generate_magic_link_token(
                    self.config.magic_link_token_bytes,
                ),
            )

        return ChallengeKind.NEW_USER, generate_otp_code()

    async def verify_email_code(
        self,
        challenge_id: UUID,
        code: str,
    ) -> AuthSessionResponse:
        challenge = await self.challenges.get_challenge(challenge_id)

        if challenge is None or challenge.kind is not ChallengeKind.NEW_USER:
            raise InvalidEmailVerificationError()

        if challenge.attempts >= self.config.code_max_attempts:
            await self.challenges.consume_challenge(challenge_id)
            raise EmailVerificationAttemptsExceededError()

        if not self._code_matches(code, challenge):
            attempts = await self.challenges.increment_failed_attempts(
                challenge_id,
            )

            if attempts is None:
                raise InvalidEmailVerificationError()

            if attempts >= self.config.code_max_attempts:
                await self.challenges.consume_challenge(challenge_id)
                raise EmailVerificationAttemptsExceededError()

            raise InvalidEmailVerificationError()

        consumed = await self.challenges.consume_challenge(challenge_id)

        if not self._is_valid_consumed_code(
            challenge_id=challenge_id,
            code=code,
            challenge=consumed,
        ):
            raise InvalidEmailVerificationError()

        assert consumed is not None
        user = self._get_or_create_user(consumed.email)

        if not user.is_active:
            raise InvalidEmailVerificationError()

        return self._create_session(user)

    async def consume_magic_link(
        self,
        challenge_id: UUID,
        token: str,
    ) -> AuthSessionResponse:
        challenge = await self.challenges.get_challenge(challenge_id)

        if (
            challenge is None
            or challenge.kind is not ChallengeKind.EXISTING_USER
            or not self._secret_matches(token, challenge)
        ):
            raise InvalidMagicLinkError()

        consumed = await self.challenges.consume_challenge(challenge_id)

        if not self._is_valid_consumed_magic_link(
            challenge_id=challenge_id,
            token=token,
            challenge=consumed,
        ):
            raise InvalidMagicLinkError()

        assert consumed is not None
        user = self.users.get_by_email(consumed.email)

        if user is None or not user.is_active:
            raise InvalidMagicLinkError()

        return self._create_session(user)

    def _code_matches(
        self,
        code: str,
        challenge: ChallengeRecord,
    ) -> bool:
        return self._secret_matches(code, challenge)

    def _secret_matches(
        self,
        candidate: str,
        challenge: ChallengeRecord,
    ) -> bool:
        return verify_challenge_secret(
            candidate,
            challenge.secret_hash,
            key=self.config.challenge_secret,
        )

    def _is_valid_consumed_code(
        self,
        *,
        challenge_id: UUID,
        code: str,
        challenge: ChallengeRecord | None,
    ) -> bool:
        return (
            challenge is not None
            and challenge.challenge_id == challenge_id
            and challenge.kind is ChallengeKind.NEW_USER
            and challenge.attempts < self.config.code_max_attempts
            and self._code_matches(code, challenge)
        )

    def _get_or_create_user(self, email: str) -> User:
        user = self.users.get_by_email(email)

        if user is not None:
            return user

        try:
            return self.user_service.create_user(
                UserCreate(email=email),
                commit=False,
            )
        except EmailAlreadyRegisteredError:
            user = self.users.get_by_email(email)

            if user is None:
                raise AuthenticationServiceUnavailableError()

            return user

    def _is_valid_consumed_magic_link(
        self,
        *,
        challenge_id: UUID,
        token: str,
        challenge: ChallengeRecord | None,
    ) -> bool:
        return (
            challenge is not None
            and challenge.challenge_id == challenge_id
            and challenge.kind is ChallengeKind.EXISTING_USER
            and self._secret_matches(token, challenge)
        )

    def _create_session(self, user: User) -> AuthSessionResponse:
        tokens = self.sessions.issue_session(user)

        return AuthSessionResponse(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            token_type=tokens.token_type,
            access_expires_in_seconds=(
                tokens.access_expires_in_seconds
            ),
            refresh_expires_in_seconds=(
                tokens.refresh_expires_in_seconds
            ),
            user=UserRead.model_validate(user),
            next_step=(
                AuthNextStep.COMPLETE_PROFILE
                if user.profile_completed_at is None
                else AuthNextStep.EXPLORE
            ),
        )
