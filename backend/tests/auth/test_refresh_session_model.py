from datetime import datetime, timedelta, timezone
from uuid import uuid4

from auth.models import RefreshSession
from users.models import User


def test_refresh_session_can_be_instantiated_with_persistent_fields() -> None:
    session_id = uuid4()
    family_id = uuid4()
    replaced_by_id = uuid4()
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    rotated_at = datetime.now(timezone.utc)
    grace_expires_at = rotated_at + timedelta(seconds=30)
    token_hash = "a" * 64
    idempotency_key_hash = "b" * 64

    refresh_session = RefreshSession(
        id=session_id,
        family_id=family_id,
        user_id=42,
        token_hash=token_hash,
        expires_at=expires_at,
        replaced_by_id=replaced_by_id,
        rotated_at=rotated_at,
        grace_expires_at=grace_expires_at,
        last_refresh_idempotency_key_hash=idempotency_key_hash,
    )

    assert refresh_session.id == session_id
    assert refresh_session.family_id == family_id
    assert refresh_session.user_id == 42
    assert refresh_session.token_hash == token_hash
    assert refresh_session.expires_at == expires_at
    assert refresh_session.replaced_by_id == replaced_by_id
    assert refresh_session.rotated_at == rotated_at
    assert refresh_session.grace_expires_at == grace_expires_at
    assert (
        refresh_session.last_refresh_idempotency_key_hash
        == idempotency_key_hash
    )
    assert refresh_session.revoked_at is None


def test_refresh_session_persists_only_the_token_hash() -> None:
    column_names = set(RefreshSession.__table__.columns.keys())

    assert "token_hash" in column_names
    assert "last_refresh_idempotency_key_hash" in column_names
    assert "refresh_token" not in column_names
    assert "token" not in column_names
    assert "idempotency_key" not in column_names


def test_family_id_connects_distinct_session_generations() -> None:
    family_id = uuid4()
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    first_id = uuid4()
    second_id = uuid4()

    first_generation = RefreshSession(
        id=first_id,
        family_id=family_id,
        user_id=42,
        token_hash="b" * 64,
        expires_at=expires_at,
        replaced_by_id=second_id,
    )
    second_generation = RefreshSession(
        id=second_id,
        family_id=family_id,
        user_id=42,
        token_hash="c" * 64,
        expires_at=expires_at,
    )

    assert first_generation.id != second_generation.id
    assert first_generation.family_id == second_generation.family_id
    assert first_generation.replaced_by_id == second_generation.id
    assert second_generation.replaced_by_id is None


def test_revoked_at_is_nullable_and_records_revocation() -> None:
    revoked_at = datetime.now(timezone.utc)
    refresh_session = RefreshSession(
        family_id=uuid4(),
        user_id=42,
        token_hash="d" * 64,
        expires_at=revoked_at + timedelta(days=30),
    )

    assert RefreshSession.__table__.c.revoked_at.nullable is True
    assert refresh_session.revoked_at is None

    refresh_session.revoked_at = revoked_at

    assert refresh_session.revoked_at == revoked_at


def test_rotation_contract_fields_are_nullable() -> None:
    assert RefreshSession.__table__.c.rotated_at.nullable is True
    assert RefreshSession.__table__.c.grace_expires_at.nullable is True
    assert (
        RefreshSession.__table__.c.last_refresh_idempotency_key_hash.nullable
        is True
    )


def test_user_relationship_names_match_on_both_models() -> None:
    assert RefreshSession.user.property.back_populates == "refresh_sessions"
    assert User.refresh_sessions.property.back_populates == "user"
