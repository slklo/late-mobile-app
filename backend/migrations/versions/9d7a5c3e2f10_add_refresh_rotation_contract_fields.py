"""add refresh rotation contract fields

Revision ID: 9d7a5c3e2f10
Revises: 7e3b1a9c5d42
Create Date: 2026-09-11 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "9d7a5c3e2f10"
down_revision: Union[str, Sequence[str], None] = "7e3b1a9c5d42"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "auth_refresh_sessions",
        sa.Column("rotated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "auth_refresh_sessions",
        sa.Column(
            "grace_expires_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        "auth_refresh_sessions",
        sa.Column(
            "last_refresh_idempotency_key_hash",
            sa.String(length=64),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_auth_refresh_sessions_rotated_at",
        "auth_refresh_sessions",
        ["rotated_at"],
        unique=False,
    )
    op.create_index(
        "ix_auth_refresh_sessions_grace_expires_at",
        "auth_refresh_sessions",
        ["grace_expires_at"],
        unique=False,
    )
    op.create_index(
        "ix_auth_refresh_sessions_last_refresh_idempotency_key_hash",
        "auth_refresh_sessions",
        ["last_refresh_idempotency_key_hash"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_auth_refresh_sessions_last_refresh_idempotency_key_hash",
        table_name="auth_refresh_sessions",
    )
    op.drop_index(
        "ix_auth_refresh_sessions_grace_expires_at",
        table_name="auth_refresh_sessions",
    )
    op.drop_index(
        "ix_auth_refresh_sessions_rotated_at",
        table_name="auth_refresh_sessions",
    )
    op.drop_column(
        "auth_refresh_sessions",
        "last_refresh_idempotency_key_hash",
    )
    op.drop_column("auth_refresh_sessions", "grace_expires_at")
    op.drop_column("auth_refresh_sessions", "rotated_at")
