"""add refresh session absolute lifetime

Revision ID: e4a1b2c3d4e5
Revises: 9d7a5c3e2f10
Create Date: 2026-09-12 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "e4a1b2c3d4e5"
down_revision: Union[str, Sequence[str], None] = "9d7a5c3e2f10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_REFRESH_SESSION_ABSOLUTE_LIFETIME_DAYS = 90


def upgrade() -> None:
    op.add_column(
        "auth_refresh_sessions",
        sa.Column(
            "absolute_expires_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    bind = op.get_bind()

    if bind.dialect.name == "sqlite":
        op.execute(
            sa.text(
                """
                UPDATE auth_refresh_sessions
                SET absolute_expires_at = (
                    SELECT datetime(
                        MIN(family_sessions.created_at),
                        :lifetime_modifier
                    )
                    FROM auth_refresh_sessions AS family_sessions
                    WHERE family_sessions.family_id = (
                        auth_refresh_sessions.family_id
                    )
                )
                """
            ).bindparams(
                lifetime_modifier=(
                    f"+{DEFAULT_REFRESH_SESSION_ABSOLUTE_LIFETIME_DAYS} days"
                ),
            )
        )
    else:
        op.execute(
            sa.text(
                """
                UPDATE auth_refresh_sessions AS target
                SET absolute_expires_at = (
                    families.family_started_at
                    + (:lifetime_days * INTERVAL '1 day')
                )
                FROM (
                    SELECT
                        family_id,
                        MIN(created_at) AS family_started_at
                    FROM auth_refresh_sessions
                    GROUP BY family_id
                ) AS families
                WHERE target.family_id = families.family_id
                """
            ).bindparams(
                lifetime_days=(
                    DEFAULT_REFRESH_SESSION_ABSOLUTE_LIFETIME_DAYS
                ),
            )
        )

    with op.batch_alter_table("auth_refresh_sessions") as batch_op:
        batch_op.alter_column(
            "absolute_expires_at",
            existing_type=sa.DateTime(timezone=True),
            nullable=False,
        )

    op.create_index(
        "ix_auth_refresh_sessions_absolute_expires_at",
        "auth_refresh_sessions",
        ["absolute_expires_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_auth_refresh_sessions_absolute_expires_at",
        table_name="auth_refresh_sessions",
    )
    with op.batch_alter_table("auth_refresh_sessions") as batch_op:
        batch_op.drop_column("absolute_expires_at")
