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
)
from auth.schemas import EmailChallengeResponse
from core.config import settings
from users.repository import UserRepository


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
        )


class AuthService:
    def __init__(
        self,
        users: UserRepository,
        challenges: ChallengeRepository,
        config: AuthServiceConfig | None = None,
    ):
        self.users = users
        self.challenges = challenges
        self.config = config or AuthServiceConfig.from_settings()

    async def request_email_challenge(
        self,
        email: str,
    ) -> IssueEmailChallengeResult:
        normalized_email = normalize_email(email)
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
