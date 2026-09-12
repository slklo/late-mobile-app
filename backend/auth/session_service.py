from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Literal, NoReturn
from uuid import UUID, uuid4

from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from auth.exceptions import (
    AuthenticationServiceUnavailableError,
    InvalidRefreshTokenError,
)
from auth.models import RefreshSession
from auth.session_repository import RefreshSessionRepository
from auth.token_service import (
    create_access_token,
    generate_refresh_token,
    hash_refresh_idempotency_key,
    hash_refresh_token,
)
from core.config import settings
from users.models import User
from users.repository import UserRepository


@dataclass(frozen=True, slots=True)
class SessionServiceConfig:
    access_token_expire_minutes: int
    refresh_token_expire_days: int
    refresh_session_absolute_lifetime_days: int
    refresh_session_cleanup_retention_days: int
    refresh_session_cleanup_batch_size: int
    refresh_token_bytes: int
    refresh_rotation_grace_seconds: int = 30

    def __post_init__(self) -> None:
        if self.access_token_expire_minutes <= 0:
            raise ValueError(
                "access_token_expire_minutes must be greater than zero",
            )
        if self.refresh_token_expire_days <= 0:
            raise ValueError(
                "refresh_token_expire_days must be greater than zero",
            )
        if self.refresh_session_absolute_lifetime_days <= 0:
            raise ValueError(
                "refresh_session_absolute_lifetime_days must be greater "
                "than zero",
            )
        if self.refresh_session_cleanup_retention_days < 0:
            raise ValueError(
                "refresh_session_cleanup_retention_days must not be "
                "negative",
            )
        if self.refresh_session_cleanup_batch_size <= 0:
            raise ValueError(
                "refresh_session_cleanup_batch_size must be greater than "
                "zero",
            )
        if self.refresh_token_bytes < 32:
            raise ValueError("refresh_token_bytes must be at least 32")
        if self.refresh_rotation_grace_seconds < 0:
            raise ValueError(
                "refresh_rotation_grace_seconds must not be negative",
            )

    @classmethod
    def from_settings(cls) -> "SessionServiceConfig":
        return cls(
            access_token_expire_minutes=(
                settings.access_token_expire_minutes
            ),
            refresh_token_expire_days=settings.refresh_token_expire_days,
            refresh_session_absolute_lifetime_days=(
                settings.refresh_session_absolute_lifetime_days
            ),
            refresh_session_cleanup_retention_days=(
                settings.refresh_session_cleanup_retention_days
            ),
            refresh_session_cleanup_batch_size=(
                settings.refresh_session_cleanup_batch_size
            ),
            refresh_token_bytes=settings.refresh_token_bytes,
            refresh_rotation_grace_seconds=(
                settings.refresh_rotation_grace_seconds
            ),
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
        absolute_expires_at = now + timedelta(
            days=self.config.refresh_session_absolute_lifetime_days,
        )
        expires_at = self._effective_refresh_expires_at(
            now=now,
            absolute_expires_at=absolute_expires_at,
        )
        refresh_token = generate_refresh_token(
            self.config.refresh_token_bytes,
        )
        refresh_session = RefreshSession(
            id=uuid4(),
            family_id=uuid4(),
            user_id=user.id,
            token_hash=hash_refresh_token(refresh_token),
            created_at=now,
            expires_at=expires_at,
            absolute_expires_at=absolute_expires_at,
        )

        try:
            self.refresh_sessions.add(refresh_session)
            self.db.flush()
            tokens = self._build_tokens(
                user.id,
                refresh_token,
                refresh_expires_at=expires_at,
                now=now,
            )
            self.db.commit()
        except OperationalError as exc:
            self._raise_service_unavailable(exc)
        except Exception:
            self.db.rollback()
            raise

        return tokens

    def refresh_session(
        self,
        refresh_token: str,
        idempotency_key: str,
    ) -> AuthSessionTokens:
        token_hash = hash_refresh_token(refresh_token)
        idempotency_key_hash = hash_refresh_idempotency_key(
            idempotency_key,
        )
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
                existing = self.refresh_sessions.get_by_token_hash_for_update(
                    token_hash,
                )

                if existing is None:
                    raise InvalidRefreshTokenError()

                if self._is_absolute_expired(existing, now):
                    self.refresh_sessions.revoke_family(
                        existing.family_id,
                        now,
                    )
                    reject_after_commit = True
                elif self._is_rotated(existing):
                    reject_after_commit = self._handle_rotated_token_reuse(
                        refresh_session=existing,
                        idempotency_key_hash=idempotency_key_hash,
                        now=now,
                    )
                elif existing.revoked_at is not None:
                    raise InvalidRefreshTokenError()
                else:
                    raise InvalidRefreshTokenError()
            elif self._is_rotated(current):
                self.refresh_sessions.revoke_family(
                    current.family_id,
                    now,
                )
                reject_after_commit = True
            elif current.revoked_at is not None:
                raise InvalidRefreshTokenError()
            elif self._is_absolute_expired(current, now):
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
                        idempotency_key_hash=idempotency_key_hash,
                    )

            self.db.flush()
            self.db.commit()
        except OperationalError as exc:
            self._raise_service_unavailable(exc)
        except Exception:
            self.db.rollback()
            raise

        if reject_after_commit:
            raise InvalidRefreshTokenError()

        if tokens is None:
            raise InvalidRefreshTokenError()

        return tokens

    def _handle_rotated_token_reuse(
        self,
        *,
        refresh_session: RefreshSession,
        idempotency_key_hash: str,
        now: datetime,
    ) -> bool:
        if self._is_same_grace_retry(
            refresh_session=refresh_session,
            idempotency_key_hash=idempotency_key_hash,
            now=now,
        ):
            if refresh_session.replaced_by_id is not None:
                self.refresh_sessions.get_successor_for_update(
                    refresh_session.replaced_by_id,
                )

            return False

        self.refresh_sessions.revoke_family(
            refresh_session.family_id,
            now,
        )
        return True

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
        except OperationalError as exc:
            self._raise_service_unavailable(exc)
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
        except OperationalError as exc:
            self._raise_service_unavailable(exc)
        except Exception:
            self.db.rollback()
            raise

        return affected

    def cleanup_sessions(
        self,
        *,
        now: datetime | None = None,
        retention_days: int | None = None,
        batch_size: int | None = None,
    ) -> int:
        retention_days = (
            self.config.refresh_session_cleanup_retention_days
            if retention_days is None
            else retention_days
        )
        batch_size = (
            self.config.refresh_session_cleanup_batch_size
            if batch_size is None
            else batch_size
        )

        if retention_days < 0:
            raise ValueError("retention_days must not be negative")
        if batch_size <= 0:
            raise ValueError("batch_size must be greater than zero")

        now = self._as_aware_utc(now or datetime.now(timezone.utc))
        cutoff = now - timedelta(days=retention_days)

        try:
            candidate_ids = self.refresh_sessions.list_cleanup_candidate_ids(
                cutoff=cutoff,
                limit=batch_size,
            )
            self.refresh_sessions.clear_replaced_by_references(
                candidate_ids,
            )
            deleted = self.refresh_sessions.delete_by_ids(candidate_ids)
            self.db.commit()
        except OperationalError as exc:
            self._raise_service_unavailable(exc)
        except Exception:
            self.db.rollback()
            raise

        return deleted

    def _rotate_session(
        self,
        *,
        current: RefreshSession,
        user: User,
        now: datetime,
        idempotency_key_hash: str,
    ) -> AuthSessionTokens:
        next_refresh_token = generate_refresh_token(
            self.config.refresh_token_bytes,
        )
        next_expires_at = self._effective_refresh_expires_at(
            now=now,
            absolute_expires_at=current.absolute_expires_at,
        )
        next_session = RefreshSession(
            id=uuid4(),
            family_id=current.family_id,
            user_id=current.user_id,
            token_hash=hash_refresh_token(next_refresh_token),
            created_at=now,
            expires_at=next_expires_at,
            absolute_expires_at=current.absolute_expires_at,
        )

        self.refresh_sessions.add(next_session)
        self.db.flush([next_session])
        self.refresh_sessions.revoke(current, now)
        current.last_used_at = now
        self.refresh_sessions.mark_rotated(
            current,
            rotated_at=now,
            grace_expires_at=(
                now
                + timedelta(
                    seconds=self.config.refresh_rotation_grace_seconds,
                )
            ),
            replaced_by_id=next_session.id,
            idempotency_key_hash=idempotency_key_hash,
        )

        return self._build_tokens(
            user.id,
            next_refresh_token,
            refresh_expires_at=next_session.expires_at,
            now=now,
        )

    def _build_tokens(
        self,
        user_id: int,
        refresh_token: str,
        *,
        refresh_expires_at: datetime,
        now: datetime,
    ) -> AuthSessionTokens:
        refresh_expires_at = self._as_aware_utc(refresh_expires_at)
        now = self._as_aware_utc(now)
        refresh_expires_in_seconds = max(
            0,
            int((refresh_expires_at - now).total_seconds()),
        )

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
            refresh_expires_in_seconds=refresh_expires_in_seconds,
        )

    @staticmethod
    def _is_rotated(refresh_session: RefreshSession) -> bool:
        return refresh_session.replaced_by_id is not None

    def _effective_refresh_expires_at(
        self,
        *,
        now: datetime,
        absolute_expires_at: datetime,
    ) -> datetime:
        sliding_expires_at = now + timedelta(
            days=self.config.refresh_token_expire_days,
        )
        absolute_expires_at = self._as_aware_utc(absolute_expires_at)

        return min(sliding_expires_at, absolute_expires_at)

    def _is_same_grace_retry(
        self,
        *,
        refresh_session: RefreshSession,
        idempotency_key_hash: str,
        now: datetime,
    ) -> bool:
        if refresh_session.last_refresh_idempotency_key_hash != (
            idempotency_key_hash
        ):
            return False

        if refresh_session.grace_expires_at is None:
            return False

        return not self._is_expired(refresh_session.grace_expires_at, now)

    @staticmethod
    def _is_expired(expires_at: datetime, now: datetime) -> bool:
        expires_at = SessionService._as_aware_utc(expires_at)

        return expires_at <= now

    def _is_absolute_expired(
        self,
        refresh_session: RefreshSession,
        now: datetime,
    ) -> bool:
        return self._is_expired(refresh_session.absolute_expires_at, now)

    @staticmethod
    def _as_aware_utc(value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)

        return value.astimezone(timezone.utc)

    def _raise_service_unavailable(
        self,
        error: OperationalError,
    ) -> NoReturn:
        try:
            self.db.rollback()
        except OperationalError:
            pass

        raise AuthenticationServiceUnavailableError() from error
