"""Import all SQLAlchemy models so they are registered on Base.metadata."""

from auth import models as auth_models  # noqa: F401
from categories import models as category_models  # noqa: F401
from restaurants import models as restaurant_models  # noqa: F401
from offers import models as offer_models  # noqa: F401
from saved_offers import models as saved_offer_models  # noqa: F401
from users import models as users_models  # noqa: F401


def import_models() -> None:
    """Import side effects register model classes with SQLAlchemy."""
    return None
