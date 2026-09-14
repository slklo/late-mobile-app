from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base
from offers.models import Offer  # noqa: F401

if TYPE_CHECKING:
    from users.models import User


class SavedOffer(Base):
    __tablename__ = "saved_offers"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "offer_id",
            name="uq_saved_offers_user_id_offer_id",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    offer_id: Mapped[int] = mapped_column(
        ForeignKey("offers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="saved_offers",
    )
    offer: Mapped["Offer"] = relationship(
        "Offer",
        back_populates="saved_offers",
    )
