from datetime import datetime, timedelta, timezone
from importlib import import_module
from uuid import uuid4

import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import inspect


migration = import_module(
    "migrations.versions."
    "e4a1b2c3d4e5_add_refresh_session_absolute_lifetime",
)


def test_absolute_lifetime_migration_backfills_existing_families() -> None:
    engine = sa.create_engine("sqlite+pysqlite:///:memory:")
    metadata = sa.MetaData()
    refresh_sessions = sa.Table(
        "auth_refresh_sessions",
        metadata,
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("family_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rotated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "grace_expires_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "last_refresh_idempotency_key_hash",
            sa.String(64),
            nullable=True,
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("replaced_by_id", sa.String(), nullable=True),
    )
    metadata.create_all(engine)

    first_family_id = str(uuid4())
    second_family_id = str(uuid4())
    first_family_start = datetime(2026, 1, 1, 10, tzinfo=timezone.utc)
    second_family_start = datetime(2026, 2, 1, 10, tzinfo=timezone.utc)

    with engine.begin() as connection:
        connection.execute(
            refresh_sessions.insert(),
            [
                {
                    "id": str(uuid4()),
                    "family_id": first_family_id,
                    "user_id": 1,
                    "token_hash": "a" * 64,
                    "created_at": first_family_start + timedelta(days=2),
                    "expires_at": first_family_start + timedelta(days=30),
                },
                {
                    "id": str(uuid4()),
                    "family_id": first_family_id,
                    "user_id": 1,
                    "token_hash": "b" * 64,
                    "created_at": first_family_start,
                    "expires_at": first_family_start + timedelta(days=30),
                },
                {
                    "id": str(uuid4()),
                    "family_id": second_family_id,
                    "user_id": 2,
                    "token_hash": "c" * 64,
                    "created_at": second_family_start,
                    "expires_at": second_family_start + timedelta(days=30),
                },
            ],
        )

        context = MigrationContext.configure(connection)
        operations = Operations(context)
        original_op = migration.op
        migration.op = operations

        try:
            migration.upgrade()
        finally:
            migration.op = original_op

        rows = connection.execute(
            sa.text(
                """
                SELECT family_id, absolute_expires_at
                FROM auth_refresh_sessions
                ORDER BY family_id, token_hash
                """
            )
        ).mappings().all()
        columns = {
            column["name"]: column
            for column in inspect(connection).get_columns(
                "auth_refresh_sessions",
            )
        }
        indexes = {
            index["name"]
            for index in inspect(connection).get_indexes(
                "auth_refresh_sessions",
            )
        }

    first_family_values = {
        row["absolute_expires_at"]
        for row in rows
        if row["family_id"] == first_family_id
    }
    second_family_values = {
        row["absolute_expires_at"]
        for row in rows
        if row["family_id"] == second_family_id
    }

    assert len(first_family_values) == 1
    assert len(second_family_values) == 1
    assert columns["absolute_expires_at"]["nullable"] is False
    assert "ix_auth_refresh_sessions_absolute_expires_at" in indexes

    first_absolute_expires_at = next(iter(first_family_values))
    second_absolute_expires_at = next(iter(second_family_values))

    assert str(first_absolute_expires_at).startswith("2026-04-01 10:00:00")
    assert str(second_absolute_expires_at).startswith("2026-05-02 10:00:00")

    engine.dispose()


def test_absolute_lifetime_migration_downgrade_removes_column() -> None:
    engine = sa.create_engine("sqlite+pysqlite:///:memory:")
    metadata = sa.MetaData()
    refresh_sessions = sa.Table(
        "auth_refresh_sessions",
        metadata,
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("family_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("absolute_expires_at", sa.DateTime(timezone=True)),
    )
    sa.Index(
        "ix_auth_refresh_sessions_absolute_expires_at",
        refresh_sessions.c.absolute_expires_at,
    )
    metadata.create_all(engine)

    with engine.begin() as connection:
        context = MigrationContext.configure(connection)
        operations = Operations(context)
        original_op = migration.op
        migration.op = operations

        try:
            migration.downgrade()
        finally:
            migration.op = original_op

        columns = {
            column["name"]
            for column in inspect(connection).get_columns(
                "auth_refresh_sessions",
            )
        }
        indexes = {
            index["name"]
            for index in inspect(connection).get_indexes(
                "auth_refresh_sessions",
            )
        }

    assert "absolute_expires_at" not in columns
    assert "ix_auth_refresh_sessions_absolute_expires_at" not in indexes

    engine.dispose()
