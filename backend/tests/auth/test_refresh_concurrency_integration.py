import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from threading import Barrier
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from auth.exceptions import InvalidRefreshTokenError
from auth.models import RefreshSession
from auth.session_repository import RefreshSessionRepository
from auth.session_service import SessionService
from auth.token_service import hash_refresh_token
from core.database import SessionLocal, engine
from users.models import User
from users.repository import UserRepository


RUN_DB_INTEGRATION = os.getenv("RUN_DB_INTEGRATION") == "1"
IDEMPOTENCY_KEY = "refresh-attempt-key-123"
OTHER_IDEMPOTENCY_KEY = "refresh-attempt-key-456"

pytestmark = [
    pytest.mark.db_integration,
    pytest.mark.skipif(
        not RUN_DB_INTEGRATION,
        reason="set RUN_DB_INTEGRATION=1 for PostgreSQL concurrency tests",
    ),
    pytest.mark.skipif(
        engine.dialect.name != "postgresql",
        reason="SELECT FOR UPDATE concurrency requires PostgreSQL",
    ),
]


@pytest.fixture(autouse=True)
def require_reachable_database() -> None:
    if not RUN_DB_INTEGRATION or engine.dialect.name != "postgresql":
        return

    try:
        with engine.connect():
            pass
    except OperationalError as exc:
        pytest.skip(
            f"PostgreSQL integration database is not reachable: {exc}",
        )


def make_service(db: Session) -> SessionService:
    return SessionService(
        db=db,
        refresh_sessions=RefreshSessionRepository(db),
        users=UserRepository(db),
    )


def run_parallel_refreshes(
    *,
    refresh_token: str,
    idempotency_keys: tuple[str, str],
) -> list[str]:
    start_gate = Barrier(2)

    def refresh_once(idempotency_key: str) -> str:
        with SessionLocal() as worker_db:
            service = make_service(worker_db)
            start_gate.wait(timeout=10)

            try:
                service.refresh_session(
                    refresh_token,
                    idempotency_key,
                )
            except InvalidRefreshTokenError:
                return "rejected"

            return "rotated"

    with ThreadPoolExecutor(max_workers=2) as executor:
        return list(executor.map(refresh_once, idempotency_keys))


def issue_refresh_session() -> tuple[int, str, str]:
    email = f"refresh-race-{uuid4().hex}@example.com"

    with SessionLocal() as setup_db:
        user = User(
            email=email,
            email_verified_at=datetime.now(timezone.utc),
        )
        setup_db.add(user)
        setup_db.commit()
        setup_db.refresh(user)

        issued = make_service(setup_db).issue_session(user)
        original_hash = hash_refresh_token(issued.refresh_token)

    return user.id, issued.refresh_token, original_hash


def delete_user(user_id: int) -> None:
    with SessionLocal() as cleanup_db:
        user = cleanup_db.get(User, user_id)

        if user is not None:
            cleanup_db.delete(user)
            cleanup_db.commit()


def load_refresh_family(original_hash: str) -> tuple[
    RefreshSession,
    list[RefreshSession],
]:
    with SessionLocal() as assertion_db:
        original = assertion_db.scalars(
            select(RefreshSession).where(
                RefreshSession.token_hash == original_hash,
            ),
        ).one()
        family = list(
            assertion_db.scalars(
                select(RefreshSession).where(
                    RefreshSession.family_id == original.family_id,
                ),
            ).all(),
        )

    return original, family


def test_two_parallel_refreshes_with_same_idempotency_key_keep_successor_active() -> None:
    user_id: int | None = None

    try:
        user_id, refresh_token, original_hash = issue_refresh_session()

        results = run_parallel_refreshes(
            refresh_token=refresh_token,
            idempotency_keys=(IDEMPOTENCY_KEY, IDEMPOTENCY_KEY),
        )

        assert sorted(results) == ["rejected", "rotated"]

        original, family = load_refresh_family(original_hash)

        assert len(family) == 2
        successors = [
            item for item in family if item.id != original.id
        ]
        assert len(successors) == 1
        assert original.revoked_at is not None
        assert successors[0].revoked_at is None
    finally:
        if user_id is not None:
            delete_user(user_id)


def test_two_parallel_refreshes_with_different_idempotency_keys_revoke_family() -> None:
    user_id: int | None = None

    try:
        user_id, refresh_token, original_hash = issue_refresh_session()

        results = run_parallel_refreshes(
            refresh_token=refresh_token,
            idempotency_keys=(IDEMPOTENCY_KEY, OTHER_IDEMPOTENCY_KEY),
        )

        assert sorted(results) == ["rejected", "rotated"]

        original, family = load_refresh_family(original_hash)

        assert len(family) == 2
        assert original.revoked_at is not None
        assert all(item.revoked_at is not None for item in family)
    finally:
        if user_id is not None:
            delete_user(user_id)
