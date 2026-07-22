"""remove password auth from users

Revision ID: f8a7d3c2b1e4
Revises: c6074a6094d6
Create Date: 2026-07-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f8a7d3c2b1e4"
down_revision: Union[str, Sequence[str], None] = "c6074a6094d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column("users", "password_hash")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        "users",
        sa.Column("password_hash", sa.String(length=255), nullable=False),
    )
