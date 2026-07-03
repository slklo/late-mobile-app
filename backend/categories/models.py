from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database import Base

class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    name: Mapped[str] = mapped_column(String(80), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)

    # offers = relationship (
    #     "Offer",
    #     back_populates="category",
    # )

    offers: Mapped[list["Offer"]] = relationship(
        "Offer",
        back_populates="category",
        passive_deletes=True,
    )