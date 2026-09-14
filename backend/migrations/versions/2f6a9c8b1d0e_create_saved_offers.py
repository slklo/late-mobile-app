"""create saved offers

Revision ID: 2f6a9c8b1d0e
Revises: e4a1b2c3d4e5
Create Date: 2026-09-14 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "2f6a9c8b1d0e"
down_revision: Union[str, Sequence[str], None] = "e4a1b2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "saved_offers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("offer_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["offer_id"],
            ["offers.id"],
            name="fk_saved_offers_offer_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_saved_offers_user_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_saved_offers"),
        sa.UniqueConstraint(
            "user_id",
            "offer_id",
            name="uq_saved_offers_user_id_offer_id",
        ),
    )
    op.create_index(
        "ix_saved_offers_offer_id",
        "saved_offers",
        ["offer_id"],
        unique=False,
    )
    op.create_index(
        "ix_saved_offers_user_id",
        "saved_offers",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_saved_offers_user_id", table_name="saved_offers")
    op.drop_index("ix_saved_offers_offer_id", table_name="saved_offers")
    op.drop_table("saved_offers")
