"""add user profile completion fields

Revision ID: 1c4d8e7f9a2b
Revises: f8a7d3c2b1e4
Create Date: 2026-07-23 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "1c4d8e7f9a2b"
down_revision: Union[str, Sequence[str], None] = "f8a7d3c2b1e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "email_verified_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "profile_completed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.execute(
        """
        UPDATE users
        SET email_verified_at = created_at
        WHERE email_verified_at IS NULL
        """
    )
    op.execute(
        """
        UPDATE users
        SET profile_completed_at = created_at
        WHERE full_name IS NOT NULL
          AND btrim(full_name) <> ''
          AND profile_completed_at IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column("users", "profile_completed_at")
    op.drop_column("users", "email_verified_at")
