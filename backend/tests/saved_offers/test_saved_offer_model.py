from datetime import datetime

from saved_offers.models import SavedOffer


def test_saved_offer_model_has_expected_contract() -> None:
    saved_offer = SavedOffer(user_id=1, offer_id=42)

    assert saved_offer.user_id == 1
    assert saved_offer.offer_id == 42
    assert isinstance(SavedOffer.created_at.property.columns[0].type.python_type, type)
    assert SavedOffer.__table__.c.created_at.nullable is False
    assert SavedOffer.__table__.c.user_id.foreign_keys
    assert SavedOffer.__table__.c.offer_id.foreign_keys


def test_saved_offer_relationships_are_named() -> None:
    assert SavedOffer.user.property.back_populates == "saved_offers"
    assert SavedOffer.offer.property.back_populates == "saved_offers"


def test_saved_offer_created_at_is_datetime_column() -> None:
    assert SavedOffer.__table__.c.created_at.type.python_type is datetime
