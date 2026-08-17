from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from auth.exceptions import InvalidRefreshTokenError
from auth.models import RefreshSession
from auth.session_repository import RefreshSessionRepository
from auth.token_service import (
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
)
from core.config import settings
from users.models import User
from users.repository import UserRepository


@dataclass(frozen=True, slots=True)
class SessionServiceConfig:
    access_token_expire_minutes: int
    refresh_token_expire_days: int
    refresh_token_bytes: int

    def __post_init__(self) -> None:
        if self.access_token_expire_minutes <= 0:
            raise ValueError(
                "access_token_expire_minutes must be greater than zero",
            )
        if self.refresh_token_expire_days <= 0:
            raise ValueError(
                "refresh_token_expire_days must be greater than zero",
            )
        if self.refresh_token_bytes < 32:
            raise ValueError("refresh_token_bytes must be at least 32")

    @classmethod
    def from_settings(cls) -> "SessionServiceConfig":
        return cls(
            access_token_expire_minutes=(
                settings.access_token_expire_minutes
            ),
            refresh_token_expire_days=settings.refresh_token_expire_days,
            refresh_token_bytes=settings.refresh_token_bytes,
        )


@dataclass(frozen=True, slots=True)
class AuthSessionTokens:
    access_token: str = field(repr=False)
    refresh_token: str = field(repr=False)
    access_expires_in_seconds: int
    refresh_expires_in_seconds: int
    token_type: Literal["bearer"] = "bearer"


class SessionService:
    def __init__(
        self,
        db: Session,
        refresh_sessions: RefreshSessionRepository,
        users: UserRepository,
        config: SessionServiceConfig | None = None,
    ):
        self.db = db
        self.refresh_sessions = refresh_sessions
        self.users = users
        self.config = config or SessionServiceConfig.from_settings()

    def issue_session(self, user: User) -> AuthSessionTokens:
        if not user.is_active:
            raise InvalidRefreshTokenError()

        now = datetime.now(timezone.utc)
        refresh_token = generate_refresh_token(
            self.config.refresh_token_bytes,
        )
        refresh_session = RefreshSession(
            id=uuid4(),
            family_id=uuid4(),
            user_id=user.id,
            token_hash=hash_refresh_token(refresh_token),
            expires_at=now
            + timedelta(days=self.config.refresh_token_expire_days),
        )

        try:
            self.refresh_sessions.add(refresh_session)
            self.db.flush()
            tokens = self._build_tokens(user.id, refresh_token)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

        return tokens

    def refresh_session(self, refresh_token: str) -> AuthSessionTokens:
        token_hash = hash_refresh_token(refresh_token)
        now = datetime.now(timezone.utc)
        reject_after_commit = False
        tokens: AuthSessionTokens | None = None

        try:
            current = (
                self.refresh_sessions.get_active_by_token_hash_for_update(
                    token_hash,
                )
            )

            if current is None:
                existing = self.refresh_sessions.get_by_token_hash(
                    token_hash,
                )

                if existing is None:
                    raise InvalidRefreshTokenError()

                if self._indicates_reuse(existing):
                    self.refresh_sessions.revoke_family(
                        existing.family_id,
                        now,
                    )
                    reject_after_commit = True
                else:
                    raise InvalidRefreshTokenError()
            elif self._indicates_reuse(current):
                self.refresh_sessions.revoke_family(
                    current.family_id,
                    now,
                )
                reject_after_commit = True
            elif self._is_expired(current.expires_at, now):
                raise InvalidRefreshTokenError()
            else:
                user = self.users.get_by_id(current.user_id)

                if user is None or not user.is_active:
                    self.refresh_sessions.revoke_family(
                        current.family_id,
                        now,
                    )
                    reject_after_commit = True
                else:
                    tokens = self._rotate_session(
                        current=current,
                        user=user,
                        now=now,
                    )

            self.db.flush()
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

        if reject_after_commit:
            raise InvalidRefreshTokenError()

        if tokens is None:
            raise InvalidRefreshTokenError()

        return tokens

    def revoke_session(self, refresh_token: str) -> None:
        token_hash = hash_refresh_token(refresh_token)

        try:
            refresh_session = self.refresh_sessions.get_by_token_hash(
                token_hash,
            )

            if (
                refresh_session is not None
                and refresh_session.revoked_at is None
            ):
                self.refresh_sessions.revoke(
                    refresh_session,
                    datetime.now(timezone.utc),
                )

            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

    def revoke_family(self, family_id: UUID) -> int:
        try:
            affected = self.refresh_sessions.revoke_family(
                family_id,
                datetime.now(timezone.utc),
            )
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

        return affected

    def _rotate_session(
        self,
        *,
        current: RefreshSession,
        user: User,
        now: datetime,
    ) -> AuthSessionTokens:
        next_refresh_token = generate_refresh_token(
            self.config.refresh_token_bytes,
        )
        next_session = RefreshSession(
            id=uuid4(),
            family_id=current.family_id,
            user_id=current.user_id,
            token_hash=hash_refresh_token(next_refresh_token),
            expires_at=now
            + timedelta(days=self.config.refresh_token_expire_days),
        )

        self.refresh_sessions.add(next_session)
        self.db.flush([next_session])
        self.refresh_sessions.revoke(current, now)
        current.last_used_at = now
        current.replaced_by_id = next_session.id

        return self._build_tokens(user.id, next_refresh_token)

    def _build_tokens(
        self,
        user_id: int,
        refresh_token: str,
    ) -> AuthSessionTokens:
        return AuthSessionTokens(
            access_token=create_access_token(
                user_id,
                expires_minutes=(
                    self.config.access_token_expire_minutes
                ),
            ),
            refresh_token=refresh_token,
            access_expires_in_seconds=(
                self.config.access_token_expire_minutes * 60
            ),
            refresh_expires_in_seconds=(
                self.config.refresh_token_expire_days * 24 * 60 * 60
            ),
        )

    @staticmethod
    def _indicates_reuse(refresh_session: RefreshSession) -> bool:
        return (
            refresh_session.revoked_at is not None
            or refresh_session.replaced_by_id is not None
        )

    @staticmethod
    def _is_expired(expires_at: datetime, now: datetime) -> bool:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        return expires_at <= now
