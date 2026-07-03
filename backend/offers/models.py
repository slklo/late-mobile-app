from datetime import datetime
from decimal import Decimal

from core.database import Base

from sqlalchemy import (
    text,
    Boolean,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    Integer,
    CheckConstraint
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

class Offer(Base):
    __tablename__ = "offers"

    __table_args__ = (
        CheckConstraint("quantity_available >= 0", name="ck_offer_quantity_available_non_negative"),
        CheckConstraint("original_price >= 0", name="ck_offer_original_price_non_negative"),
        CheckConstraint("discounted_price >= 0", name="ck_offer_discounted_price_non_negative"),
        CheckConstraint("discounted_price <= original_price", name="ck_offer_discounted_price_lte_original_price"),
        CheckConstraint("pickup_end > pickup_start", name="ck_offer_pickup_end_after_start"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    
    restaurant_id: Mapped[int] = mapped_column(
        ForeignKey("restaurants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    original_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    discounted_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    quantity_available: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    
    pickup_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    pickup_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))

    restaurant = relationship(
        "Restaurant",
        back_populates="offers",
    )

    category = relationship(
        "Category",
        back_populates="offers",
    )