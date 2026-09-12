from collections.abc import Iterator
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from uuid import UUID, uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Session

from auth.models import RefreshSession
from auth.session_repository import RefreshSessionRepository
from core.database import Base
from users.models import User


@pytest.fixture
def db_session() -> Iterator[Session]:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(
        engine,
        tables=[User.__table__, RefreshSession.__table__],
    )

    with Session(engine) as session:
        user = User(email="refresh-session-tests@example.com")
        session.add(user)
        session.flush()
        yield session

    engine.dispose()


@pytest.fixture
def repository(db_session: Session) -> RefreshSessionRepository:
    return RefreshSessionRepository(db_session)


def make_refresh_session(
    *,
    token_hash: str,
    family_id: UUID | None = None,
    expires_at: datetime | None = None,
    absolute_expires_at: datetime | None = None,
    revoked_at: datetime | None = None,
) -> RefreshSession:
    effective_expires_at = (
        expires_at
        or datetime.now(timezone.utc) + timedelta(hours=1)
    )

    return RefreshSession(
        family_id=family_id or uuid4(),
        user_id=1,
        token_hash=token_hash,
        expires_at=effective_expires_at,
        absolute_expires_at=absolute_expires_at
        or effective_expires_at + timedelta(days=60),
        revoked_at=revoked_at,
    )


def test_add_attaches_session_to_sqlalchemy_session(
    repository: RefreshSessionRepository,
    db_session: Session,
) -> None:
    refresh_session = make_refresh_session(token_hash="a" * 64)

    result = repository.add(refresh_session)

    assert result is refresh_session
    assert refresh_session in db_session.new


def test_get_by_id_finds_session(
    repository: RefreshSessionRepository,
    db_session: Session,
) -> None:
    refresh_session = make_refresh_session(token_hash="b" * 64)
    repository.add(refresh_session)
    db_session.flush()

    result = repository.get_by_id(refresh_session.id)

    assert result is refresh_session


def test_get_by_id_for_update_locks_session() -> None:
    db = MagicMock(spec=Session)
    db.scalars.return_value.one_or_none.return_value = None
    repository = RefreshSessionRepository(db)
    session_id = uuid4()

    result = repository.get_by_id_for_update(session_id)

    statement = db.scalars.call_args.args[0]
    compiled = str(statement.compile(dialect=postgresql.dialect()))

    assert result is None
    assert "auth_refresh_sessions.id =" in compiled
    assert compiled.endswith("FOR UPDATE")


def test_get_by_token_hash_finds_session(
    repository: RefreshSessionRepository,
    db_session: Session,
) -> None:
    token_hash = "c" * 64
    refresh_session = make_refresh_session(token_hash=token_hash)
    repository.add(refresh_session)
    db_session.flush()

    result = repository.get_by_token_hash(token_hash)

    assert result is refresh_session


def test_get_by_token_hash_for_update_locks_session() -> None:
    db = MagicMock(spec=Session)
    db.scalars.return_value.one_or_none.return_value = None
    repository = RefreshSessionRepository(db)

    result = repository.get_by_token_hash_for_update("c" * 64)

    statement = db.scalars.call_args.args[0]
    compiled = str(statement.compile(dialect=postgresql.dialect()))

    assert result is None
    assert "auth_refresh_sessions.token_hash =" in compiled
    assert compiled.endswith("FOR UPDATE")


def test_get_successor_for_update_locks_replaced_session() -> None:
    db = MagicMock(spec=Session)
    db.scalars.return_value.one_or_none.return_value = None
    repository = RefreshSessionRepository(db)
    successor_id = uuid4()

    result = repository.get_successor_for_update(successor_id)

    statement = db.scalars.call_args.args[0]
    compiled = str(statement.compile(dialect=postgresql.dialect()))

    assert result is None
    assert "auth_refresh_sessions.id =" in compiled
    assert compiled.endswith("FOR UPDATE")


def test_get_active_by_token_hash_returns_active_session(
    repository: RefreshSessionRepository,
    db_session: Session,
) -> None:
    token_hash = "d" * 64
    refresh_session = make_refresh_session(token_hash=token_hash)
    repository.add(refresh_session)
    db_session.flush()

    result = repository.get_active_by_token_hash(token_hash)

    assert result is refresh_session


def test_get_active_by_token_hash_excludes_expired_session(
    repository: RefreshSessionRepository,
    db_session: Session,
) -> None:
    token_hash = "e" * 64
    refresh_session = make_refresh_session(
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) - timedelta(seconds=1),
    )
    repository.add(refresh_session)
    db_session.flush()

    result = repository.get_active_by_token_hash(token_hash)

    assert result is None


def test_get_active_by_token_hash_excludes_revoked_session(
    repository: RefreshSessionRepository,
    db_session: Session,
) -> None:
    now = datetime.now(timezone.utc)
    token_hash = "f" * 64
    refresh_session = make_refresh_session(
        token_hash=token_hash,
        expires_at=now + timedelta(hours=1),
        revoked_at=now,
    )
    repository.add(refresh_session)
    db_session.flush()

    result = repository.get_active_by_token_hash(token_hash)

    assert result is None


def test_revoke_sets_revoked_at(
    repository: RefreshSessionRepository,
    db_session: Session,
) -> None:
    refresh_session = make_refresh_session(token_hash="1" * 64)
    repository.add(refresh_session)
    db_session.flush()
    revoked_at = datetime.now(timezone.utc)

    result = repository.revoke(refresh_session, revoked_at)

    assert result is refresh_session
    assert refresh_session.revoked_at == revoked_at


def test_mark_rotated_sets_rotation_contract_fields(
    repository: RefreshSessionRepository,
    db_session: Session,
) -> None:
    refresh_session = make_refresh_session(token_hash="0" * 64)
    repository.add(refresh_session)
    db_session.flush()
    rotated_at = datetime.now(timezone.utc)
    grace_expires_at = rotated_at + timedelta(seconds=30)
    replaced_by_id = uuid4()
    idempotency_key_hash = "a" * 64

    result = repository.mark_rotated(
        refresh_session,
        rotated_at=rotated_at,
        grace_expires_at=grace_expires_at,
        replaced_by_id=replaced_by_id,
        idempotency_key_hash=idempotency_key_hash,
    )

    assert result is refresh_session
    assert refresh_session.rotated_at == rotated_at
    assert refresh_session.grace_expires_at == grace_expires_at
    assert refresh_session.replaced_by_id == replaced_by_id
    assert (
        refresh_session.last_refresh_idempotency_key_hash
        == idempotency_key_hash
    )


def test_list_by_family_id_returns_only_family_sessions(
    repository: RefreshSessionRepository,
    db_session: Session,
) -> None:
    family_id = uuid4()
    first = make_refresh_session(
        token_hash="2" * 64,
        family_id=family_id,
    )
    second = make_refresh_session(
        token_hash="3" * 64,
        family_id=family_id,
    )
    other_family = make_refresh_session(token_hash="4" * 64)
    db_session.add_all([first, second, other_family])
    db_session.flush()

    result = repository.list_by_family_id(family_id)

    assert {session.id for session in result} == {first.id, second.id}


def test_revoke_family_revokes_every_unrevoked_family_session(
    repository: RefreshSessionRepository,
    db_session: Session,
) -> None:
    family_id = uuid4()
    previously_revoked_at = datetime.now(timezone.utc) - timedelta(days=1)
    first = make_refresh_session(
        token_hash="5" * 64,
        family_id=family_id,
    )
    second = make_refresh_session(
        token_hash="6" * 64,
        family_id=family_id,
    )
    previously_revoked = make_refresh_session(
        token_hash="7" * 64,
        family_id=family_id,
        revoked_at=previously_revoked_at,
    )
    other_family = make_refresh_session(token_hash="8" * 64)
    db_session.add_all(
        [first, second, previously_revoked, other_family],
    )
    db_session.flush()
    revoked_at = datetime.now(timezone.utc)

    affected = repository.revoke_family(family_id, revoked_at)

    assert affected == 2
    assert first.revoked_at == revoked_at
    assert second.revoked_at == revoked_at
    assert previously_revoked.revoked_at == previously_revoked_at
    assert other_family.revoked_at is None


def test_get_active_by_token_hash_for_update_uses_active_filters_and_lock() -> None:
    db = MagicMock(spec=Session)
    db.scalars.return_value.one_or_none.return_value = None
    repository = RefreshSessionRepository(db)

    result = repository.get_active_by_token_hash_for_update("9" * 64)

    statement = db.scalars.call_args.args[0]
    compiled = str(statement.compile(dialect=postgresql.dialect()))

    assert result is None
    assert "auth_refresh_sessions.token_hash =" in compiled
    assert "auth_refresh_sessions.revoked_at IS NULL" in compiled
    assert "auth_refresh_sessions.expires_at > now()" in compiled
    assert compiled.endswith("FOR UPDATE")
