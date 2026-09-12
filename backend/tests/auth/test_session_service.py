from collections.abc import Iterator
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from uuid import UUID, uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from auth.exceptions import (
    AuthenticationServiceUnavailableError,
    InvalidRefreshTokenError,
)
from auth.models import RefreshSession
from auth.session_repository import RefreshSessionRepository
from auth.session_service import SessionService, SessionServiceConfig
from auth.token_service import (
    decode_access_token,
    generate_refresh_token,
    hash_refresh_idempotency_key,
    hash_refresh_token,
)
from core.database import Base
from users.models import User
from users.repository import UserRepository


TEST_CONFIG = SessionServiceConfig(
    access_token_expire_minutes=15,
    refresh_token_expire_days=30,
    refresh_session_absolute_lifetime_days=90,
    refresh_token_bytes=32,
)
IDEMPOTENCY_KEY = "refresh-attempt-key-123"
OTHER_IDEMPOTENCY_KEY = "refresh-attempt-key-456"


@pytest.fixture
def session_service() -> Iterator[
    tuple[
        SessionService,
        Session,
        RefreshSessionRepository,
        User,
    ]
]:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    with engine.connect() as connection:
        connection.exec_driver_sql("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(
        engine,
        tables=[User.__table__, RefreshSession.__table__],
    )

    with Session(engine, expire_on_commit=False) as db:
        user = User(email="session-service@example.com")
        db.add(user)
        db.commit()

        refresh_sessions = RefreshSessionRepository(db)
        service = SessionService(
            db=db,
            refresh_sessions=refresh_sessions,
            users=UserRepository(db),
            config=TEST_CONFIG,
        )
        yield service, db, refresh_sessions, user

    engine.dispose()


def test_issue_session_persists_hash_and_returns_token_pair(
    session_service: tuple[
        SessionService,
        Session,
        RefreshSessionRepository,
        User,
    ],
) -> None:
    service, _, refresh_sessions, user = session_service
    before = datetime.now(timezone.utc)

    tokens = service.issue_session(user)

    stored = refresh_sessions.get_by_token_hash(
        hash_refresh_token(tokens.refresh_token),
    )
    assert stored is not None
    assert stored.token_hash != tokens.refresh_token
    assert "refresh_token" not in stored.__table__.columns
    assert isinstance(stored.family_id, UUID)
    assert stored.user_id == user.id
    assert stored.expires_at.replace(tzinfo=timezone.utc) >= (
        before + timedelta(days=30) - timedelta(seconds=1)
    )
    assert decode_access_token(tokens.access_token) == user.id
    assert tokens.token_type == "bearer"
    assert tokens.access_expires_in_seconds == 15 * 60
    assert tokens.refresh_expires_in_seconds == 30 * 24 * 60 * 60
    assert tokens.refresh_token not in repr(tokens)


def test_refresh_session_rotates_token_and_links_generations(
    session_service: tuple[
        SessionService,
        Session,
        RefreshSessionRepository,
        User,
    ],
) -> None:
    service, _, refresh_sessions, user = session_service
    issued = service.issue_session(user)
    old_hash = hash_refresh_token(issued.refresh_token)

    rotated = service.refresh_session(
        issued.refresh_token,
        IDEMPOTENCY_KEY,
    )

    old_session = refresh_sessions.get_by_token_hash(old_hash)
    new_session = refresh_sessions.get_by_token_hash(
        hash_refresh_token(rotated.refresh_token),
    )
    assert old_session is not None
    assert new_session is not None
    assert rotated.refresh_token != issued.refresh_token
    assert old_session.revoked_at is not None
    assert old_session.last_used_at is not None
    assert old_session.rotated_at is not None
    assert old_session.grace_expires_at is not None
    assert old_session.replaced_by_id == new_session.id
    assert old_session.last_refresh_idempotency_key_hash == (
        hash_refresh_idempotency_key(IDEMPOTENCY_KEY)
    )
    assert old_session.family_id == new_session.family_id
    assert new_session.revoked_at is None
    assert decode_access_token(rotated.access_token) == user.id


def test_refresh_session_uses_locking_repository_lookup(
    session_service: tuple[
        SessionService,
        Session,
        RefreshSessionRepository,
        User,
    ],
) -> None:
    service, _, refresh_sessions, user = session_service
    issued = service.issue_session(user)
    tracked_repository = MagicMock(wraps=refresh_sessions)
    service.refresh_sessions = tracked_repository

    service.refresh_session(issued.refresh_token, IDEMPOTENCY_KEY)

    tracked_repository.get_active_by_token_hash_for_update.assert_called_once_with(
        hash_refresh_token(issued.refresh_token),
    )


def test_reusing_rotated_token_inside_grace_with_same_key_rejects_without_family_revoke(
    session_service: tuple[
        SessionService,
        Session,
        RefreshSessionRepository,
        User,
    ],
) -> None:
    service, _, refresh_sessions, user = session_service
    issued = service.issue_session(user)
    rotated = service.refresh_session(
        issued.refresh_token,
        IDEMPOTENCY_KEY,
    )

    with pytest.raises(InvalidRefreshTokenError) as reused_error:
        service.refresh_session(issued.refresh_token, IDEMPOTENCY_KEY)

    assert issued.refresh_token not in str(reused_error.value)

    old_session = refresh_sessions.get_by_token_hash(
        hash_refresh_token(issued.refresh_token),
    )
    new_session = refresh_sessions.get_by_token_hash(
        hash_refresh_token(rotated.refresh_token),
    )
    assert old_session is not None
    assert new_session is not None
    family = refresh_sessions.list_by_family_id(old_session.family_id)
    assert len(family) == 2
    assert old_session.revoked_at is not None
    assert new_session.revoked_at is None
    assert (
        refresh_sessions.get_active_by_token_hash(
            hash_refresh_token(rotated.refresh_token),
        )
        is not None
    )


def test_successor_token_remains_usable_after_same_key_grace_retry(
    session_service: tuple[
        SessionService,
        Session,
        RefreshSessionRepository,
        User,
    ],
) -> None:
    service, _, refresh_sessions, user = session_service
    issued = service.issue_session(user)
    rotated = service.refresh_session(
        issued.refresh_token,
        IDEMPOTENCY_KEY,
    )

    with pytest.raises(InvalidRefreshTokenError):
        service.refresh_session(issued.refresh_token, IDEMPOTENCY_KEY)

    second_rotation = service.refresh_session(
        rotated.refresh_token,
        OTHER_IDEMPOTENCY_KEY,
    )

    old_session = refresh_sessions.get_by_token_hash(
        hash_refresh_token(issued.refresh_token),
    )
    rotated_session = refresh_sessions.get_by_token_hash(
        hash_refresh_token(rotated.refresh_token),
    )
    second_session = refresh_sessions.get_by_token_hash(
        hash_refresh_token(second_rotation.refresh_token),
    )
    assert old_session is not None
    assert rotated_session is not None
    assert second_session is not None
    assert old_session.family_id == rotated_session.family_id
    assert rotated_session.family_id == second_session.family_id
    assert second_session.revoked_at is None


def test_reusing_rotated_token_inside_grace_with_different_key_revokes_family(
    session_service: tuple[
        SessionService,
        Session,
        RefreshSessionRepository,
        User,
    ],
) -> None:
    service, _, refresh_sessions, user = session_service
    issued = service.issue_session(user)
    rotated = service.refresh_session(
        issued.refresh_token,
        IDEMPOTENCY_KEY,
    )

    with pytest.raises(InvalidRefreshTokenError):
        service.refresh_session(
            issued.refresh_token,
            OTHER_IDEMPOTENCY_KEY,
        )

    old_session = refresh_sessions.get_by_token_hash(
        hash_refresh_token(issued.refresh_token),
    )
    assert old_session is not None
    family = refresh_sessions.list_by_family_id(old_session.family_id)
    assert len(family) == 2
    assert all(item.revoked_at is not None for item in family)
    assert (
        refresh_sessions.get_active_by_token_hash(
            hash_refresh_token(rotated.refresh_token),
        )
        is None
    )


def test_reusing_rotated_token_outside_grace_revokes_family(
    session_service: tuple[
        SessionService,
        Session,
        RefreshSessionRepository,
        User,
    ],
) -> None:
    service, db, refresh_sessions, user = session_service
    issued = service.issue_session(user)
    rotated = service.refresh_session(
        issued.refresh_token,
        IDEMPOTENCY_KEY,
    )
    old_session = refresh_sessions.get_by_token_hash(
        hash_refresh_token(issued.refresh_token),
    )
    assert old_session is not None
    old_session.grace_expires_at = (
        datetime.now(timezone.utc) - timedelta(seconds=1)
    )
    db.commit()

    with pytest.raises(InvalidRefreshTokenError):
        service.refresh_session(issued.refresh_token, IDEMPOTENCY_KEY)

    family = refresh_sessions.list_by_family_id(old_session.family_id)
    assert len(family) == 2
    assert all(item.revoked_at is not None for item in family)
    assert (
        refresh_sessions.get_active_by_token_hash(
            hash_refresh_token(rotated.refresh_token),
        )
        is None
    )


def test_zero_second_grace_treats_rotated_token_as_outside_grace(
    session_service: tuple[
        SessionService,
        Session,
        RefreshSessionRepository,
        User,
    ],
) -> None:
    service, _, refresh_sessions, user = session_service
    service.config = SessionServiceConfig(
        access_token_expire_minutes=15,
        refresh_token_expire_days=30,
        refresh_session_absolute_lifetime_days=90,
        refresh_token_bytes=32,
        refresh_rotation_grace_seconds=0,
    )
    issued = service.issue_session(user)
    rotated = service.refresh_session(
        issued.refresh_token,
        IDEMPOTENCY_KEY,
    )

    with pytest.raises(InvalidRefreshTokenError):
        service.refresh_session(issued.refresh_token, IDEMPOTENCY_KEY)

    old_session = refresh_sessions.get_by_token_hash(
        hash_refresh_token(issued.refresh_token),
    )
    assert old_session is not None
    family = refresh_sessions.list_by_family_id(old_session.family_id)
    assert len(family) == 2
    assert all(item.revoked_at is not None for item in family)
    assert (
        refresh_sessions.get_active_by_token_hash(
            hash_refresh_token(rotated.refresh_token),
        )
        is None
    )


def test_expired_refresh_token_is_rejected(
    session_service: tuple[
        SessionService,
        Session,
        RefreshSessionRepository,
        User,
    ],
) -> None:
    service, db, refresh_sessions, user = session_service
    refresh_token = generate_refresh_token()
    expired_session = RefreshSession(
        family_id=uuid4(),
        user_id=user.id,
        token_hash=hash_refresh_token(refresh_token),
        expires_at=datetime.now(timezone.utc) - timedelta(seconds=1),
        absolute_expires_at=datetime.now(timezone.utc) + timedelta(days=90),
    )
    refresh_sessions.add(expired_session)
    db.commit()

    with pytest.raises(InvalidRefreshTokenError):
        service.refresh_session(refresh_token, IDEMPOTENCY_KEY)

    assert expired_session.revoked_at is None


def test_revoked_refresh_token_without_rotation_is_rejected_without_family_revoke(
    session_service: tuple[
        SessionService,
        Session,
        RefreshSessionRepository,
        User,
    ],
) -> None:
    service, db, refresh_sessions, user = session_service
    family_id = uuid4()
    revoked_token = generate_refresh_token()
    successor_token = generate_refresh_token()
    revoked_session = RefreshSession(
        family_id=family_id,
        user_id=user.id,
        token_hash=hash_refresh_token(revoked_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        absolute_expires_at=datetime.now(timezone.utc) + timedelta(days=90),
        revoked_at=datetime.now(timezone.utc),
    )
    successor = RefreshSession(
        family_id=family_id,
        user_id=user.id,
        token_hash=hash_refresh_token(successor_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        absolute_expires_at=datetime.now(timezone.utc) + timedelta(days=90),
    )
    refresh_sessions.add(revoked_session)
    refresh_sessions.add(successor)
    db.commit()

    with pytest.raises(InvalidRefreshTokenError):
        service.refresh_session(revoked_token, IDEMPOTENCY_KEY)

    db.refresh(successor)
    assert successor.revoked_at is None


def test_inactive_user_is_rejected_and_family_is_revoked(
    session_service: tuple[
        SessionService,
        Session,
        RefreshSessionRepository,
        User,
    ],
) -> None:
    service, db, refresh_sessions, user = session_service
    issued = service.issue_session(user)
    user.is_active = False
    db.commit()

    with pytest.raises(InvalidRefreshTokenError):
        service.refresh_session(issued.refresh_token, IDEMPOTENCY_KEY)

    stored = refresh_sessions.get_by_token_hash(
        hash_refresh_token(issued.refresh_token),
    )
    assert stored is not None
    assert stored.revoked_at is not None
    assert len(refresh_sessions.list_by_family_id(stored.family_id)) == 1


def test_unknown_refresh_token_is_rejected(
    session_service: tuple[
        SessionService,
        Session,
        RefreshSessionRepository,
        User,
    ],
) -> None:
    service, _, _, _ = session_service

    with pytest.raises(InvalidRefreshTokenError):
        service.refresh_session(generate_refresh_token(), IDEMPOTENCY_KEY)


def test_failed_rotation_rolls_back_both_generations(
    session_service: tuple[
        SessionService,
        Session,
        RefreshSessionRepository,
        User,
    ],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service, _, refresh_sessions, user = session_service
    issued = service.issue_session(user)
    old_hash = hash_refresh_token(issued.refresh_token)
    old_session = refresh_sessions.get_by_token_hash(old_hash)
    assert old_session is not None
    family_id = old_session.family_id

    def fail_token_building(user_id: int, refresh_token: str) -> None:
        raise RuntimeError("token building failed")

    monkeypatch.setattr(service, "_build_tokens", fail_token_building)

    with pytest.raises(RuntimeError, match="token building failed"):
        service.refresh_session(issued.refresh_token, IDEMPOTENCY_KEY)

    stored_old_session = refresh_sessions.get_by_token_hash(old_hash)
    family = refresh_sessions.list_by_family_id(family_id)
    assert stored_old_session is not None
    assert stored_old_session.revoked_at is None
    assert stored_old_session.replaced_by_id is None
    assert len(family) == 1


def test_revoke_session_is_idempotent_for_known_and_unknown_tokens(
    session_service: tuple[
        SessionService,
        Session,
        RefreshSessionRepository,
        User,
    ],
) -> None:
    service, _, refresh_sessions, user = session_service
    issued = service.issue_session(user)

    service.revoke_session(issued.refresh_token)
    service.revoke_session(issued.refresh_token)
    service.revoke_session(generate_refresh_token())

    stored = refresh_sessions.get_by_token_hash(
        hash_refresh_token(issued.refresh_token),
    )
    assert stored is not None
    assert stored.revoked_at is not None


def test_revoke_family_returns_number_of_newly_revoked_sessions(
    session_service: tuple[
        SessionService,
        Session,
        RefreshSessionRepository,
        User,
    ],
) -> None:
    service, _, refresh_sessions, user = session_service
    issued = service.issue_session(user)
    stored = refresh_sessions.get_by_token_hash(
        hash_refresh_token(issued.refresh_token),
    )
    assert stored is not None
    family_id = stored.family_id

    first_result = service.revoke_family(family_id)
    second_result = service.revoke_family(family_id)

    assert first_result == 1
    assert second_result == 0


def test_refresh_database_failure_is_translated_without_details(
    session_service: tuple[
        SessionService,
        Session,
        RefreshSessionRepository,
        User,
    ],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service, _, refresh_sessions, _ = session_service
    refresh_token = generate_refresh_token()
    database_detail = "database host and statement must stay private"

    def fail_lookup(token_hash: str) -> RefreshSession | None:
        raise OperationalError(
            "SELECT token_hash FROM auth_refresh_sessions",
            {},
            RuntimeError(database_detail),
        )

    monkeypatch.setattr(
        refresh_sessions,
        "get_active_by_token_hash_for_update",
        fail_lookup,
    )

    with pytest.raises(
        AuthenticationServiceUnavailableError,
    ) as exc_info:
        service.refresh_session(refresh_token, IDEMPOTENCY_KEY)

    assert exc_info.value.code == "AUTHENTICATION_SERVICE_UNAVAILABLE"
    assert str(exc_info.value) == "Authentication is temporarily unavailable"
    assert database_detail not in str(exc_info.value)
    assert refresh_token not in str(exc_info.value)
