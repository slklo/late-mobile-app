"""create auth refresh sessions

Revision ID: 7e3b1a9c5d42
Revises: 1c4d8e7f9a2b
Create Date: 2026-08-17 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "7e3b1a9c5d42"
down_revision: Union[str, Sequence[str], None] = "1c4d8e7f9a2b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "auth_refresh_sessions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "family_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "expires_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "last_used_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "revoked_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "replaced_by_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["replaced_by_id"],
            ["auth_refresh_sessions.id"],
            name="fk_auth_refresh_sessions_replaced_by_id",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_auth_refresh_sessions_user_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "id",
            name="pk_auth_refresh_sessions",
        ),
        sa.UniqueConstraint(
            "token_hash",
            name="uq_auth_refresh_sessions_token_hash",
        ),
    )
    op.create_index(
        "ix_auth_refresh_sessions_family_id",
        "auth_refresh_sessions",
        ["family_id"],
        unique=False,
    )
    op.create_index(
        "ix_auth_refresh_sessions_user_id",
        "auth_refresh_sessions",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_auth_refresh_sessions_expires_at",
        "auth_refresh_sessions",
        ["expires_at"],
        unique=False,
    )
    op.create_index(
        "ix_auth_refresh_sessions_revoked_at",
        "auth_refresh_sessions",
        ["revoked_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_auth_refresh_sessions_revoked_at",
        table_name="auth_refresh_sessions",
    )
    op.drop_index(
        "ix_auth_refresh_sessions_expires_at",
        table_name="auth_refresh_sessions",
    )
    op.drop_index(
        "ix_auth_refresh_sessions_user_id",
        table_name="auth_refresh_sessions",
    )
    op.drop_index(
        "ix_auth_refresh_sessions_family_id",
        table_name="auth_refresh_sessions",
    )
    op.drop_table("auth_refresh_sessions")
