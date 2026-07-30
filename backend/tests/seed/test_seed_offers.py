from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from categories.models import Category
from core.database import SessionLocal
from offers.models import Offer
from restaurants.models import Restaurant


SEED_CATEGORIES = [
    {"name": "Bakery", "slug": "bakery"},
    {"name": "Asian", "slug": "asian"},
    {"name": "Vegetarian", "slug": "vegetarian"},
    {"name": "Desserts", "slug": "desserts"},
    {"name": "Pizza", "slug": "pizza"},
    {"name": "Vegan", "slug": "vegan"},
]

SEED_RESTAURANTS = [
    {
        "name": "Sakura Bento",
        "address": "Torstrasse 12, 10119 Berlin",
        "image_url": "https://images.unsplash.com/photo-1553621042-f6e147245754",
    },
    {
        "name": "Le Petit Croissant",
        "address": "Brunnenstrasse 45, 10115 Berlin",
        "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff",
    },
    {
        "name": "Green Garden",
        "address": "Kastanienallee 9, 10435 Berlin",
        "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd",
    },
    {
        "name": "Boulangerie Nord",
        "address": "Invalidenstrasse 88, 10115 Berlin",
        "image_url": "https://images.unsplash.com/photo-1549931319-a545dcf3bc73",
    },
    {
        "name": "Trattoria Roma",
        "address": "Oderberger Strasse 31, 10435 Berlin",
        "image_url": "https://images.unsplash.com/photo-1513104890138-7c749659a591",
    },
    {
        "name": "Berlin Bowl House",
        "address": "Rosenthaler Strasse 61, 10119 Berlin",
        "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
    },
    {
        "name": "Urban Dumpling",
        "address": "Alte Schoenhauser Strasse 7, 10119 Berlin",
        "image_url": "https://images.unsplash.com/photo-1496116218417-1a781b1c416c",
    },
    {
        "name": "Golden Falafel",
        "address": "Weinbergsweg 24, 10119 Berlin",
        "image_url": "https://images.unsplash.com/photo-1593001874117-c99c800e3eb8",
    },
]

OFFER_TEMPLATES = [
    {
        "title": "Evening Sushi Surprise",
        "category_slug": "asian",
        "description": "Mixed sushi and sides from the evening counter.",
        "image_url": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c",
        "original_price": Decimal("14.90"),
        "discounted_price": Decimal("5.90"),
    },
    {
        "title": "Bakery Closing Basket",
        "category_slug": "bakery",
        "description": "Bread, rolls, and sweet pastries from today's bake.",
        "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff",
        "original_price": Decimal("11.50"),
        "discounted_price": Decimal("3.90"),
    },
    {
        "title": "Vegetarian Surplus Box",
        "category_slug": "vegetarian",
        "description": "Fresh vegetarian meals and prepared sides.",
        "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd",
        "original_price": Decimal("12.80"),
        "discounted_price": Decimal("4.80"),
    },
    {
        "title": "Dessert Rescue Pack",
        "category_slug": "desserts",
        "description": "A rotating mix of cakes, pastries, and sweets.",
        "image_url": "https://images.unsplash.com/photo-1551024506-0bccd828d307",
        "original_price": Decimal("9.90"),
        "discounted_price": Decimal("3.50"),
    },
    {
        "title": "Pizza Slice Box",
        "category_slug": "pizza",
        "description": "Assorted pizza slices packed for pickup.",
        "image_url": "https://images.unsplash.com/photo-1513104890138-7c749659a591",
        "original_price": Decimal("13.50"),
        "discounted_price": Decimal("4.90"),
    },
    {
        "title": "Vegan Bowl Mix",
        "category_slug": "vegan",
        "description": "Plant-based bowls with grains, greens, and toppings.",
        "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
        "original_price": Decimal("12.90"),
        "discounted_price": Decimal("4.50"),
    },
    {
        "title": "Dumpling Mix Bag",
        "category_slug": "asian",
        "description": "Steamed and fried dumplings with changing fillings.",
        "image_url": "https://images.unsplash.com/photo-1496116218417-1a781b1c416c",
        "original_price": Decimal("10.90"),
        "discounted_price": Decimal("3.90"),
    },
    {
        "title": "Falafel Rescue Box",
        "category_slug": "vegan",
        "description": "Falafel, salad, dips, and flatbread from the day.",
        "image_url": "https://images.unsplash.com/photo-1593001874117-c99c800e3eb8",
        "original_price": Decimal("10.50"),
        "discounted_price": Decimal("3.80"),
    },
]


@pytest.mark.seed
def test_seed_40_offers_for_frontend_testing():
    batch_id = uuid4().hex[:8]

    with SessionLocal() as db:
        try:
            categories_by_slug: dict[str, Category] = {}
            for category_data in SEED_CATEGORIES:
                category = Category(
                    name=f"{category_data['name']} Seed {batch_id}",
                    slug=f"{category_data['slug']}-{batch_id}",
                )
                db.add(category)
                categories_by_slug[category_data["slug"]] = category

            restaurants: list[Restaurant] = []
            for restaurant_data in SEED_RESTAURANTS:
                restaurant = Restaurant(
                    name=f"{restaurant_data['name']} Seed {batch_id}",
                    address=restaurant_data["address"],
                    image_url=restaurant_data["image_url"],
                    is_active=True,
                )
                db.add(restaurant)
                restaurants.append(restaurant)

            db.flush()

            now = datetime.now(timezone.utc).replace(microsecond=0)
            created_offer_ids: list[int] = []

            for index in range(40):
                template = OFFER_TEMPLATES[index % len(OFFER_TEMPLATES)]
                restaurant = restaurants[index % len(restaurants)]
                category = categories_by_slug[template["category_slug"]]
                pickup_start = now + timedelta(hours=1 + index // 4)
                pickup_end = pickup_start + timedelta(minutes=45 + (index % 3) * 15)

                offer = Offer(
                    restaurant=restaurant,
                    category=category,
                    title=f"{template['title']} {index + 1:02d}",
                    description=template["description"],
                    image_url=template["image_url"],
                    original_price=template["original_price"],
                    discounted_price=template["discounted_price"],
                    quantity_available=(index % 5) + 1,
                    pickup_start=pickup_start,
                    pickup_end=pickup_end,
                    is_active=True,
                )
                db.add(offer)
                db.flush()
                created_offer_ids.append(offer.id)

            db.commit()
        except Exception:
            db.rollback()
            raise

        seeded_offers = list(
            db.scalars(
                select(Offer)
                .options(
                    selectinload(Offer.restaurant),
                    selectinload(Offer.category),
                )
                .where(Offer.id.in_(created_offer_ids))
                .order_by(Offer.pickup_start.asc(), Offer.id.asc())
            ).all()
        )

        assert len(seeded_offers) == 40
        assert len({offer.restaurant_id for offer in seeded_offers}) == len(SEED_RESTAURANTS)
        assert len({offer.category_id for offer in seeded_offers}) == len(SEED_CATEGORIES)

        for offer in seeded_offers:
            assert offer.id is not None
            assert offer.restaurant is not None
            assert offer.category is not None
            assert offer.title
            assert offer.original_price >= Decimal("0")
            assert offer.discounted_price >= Decimal("0")
            assert offer.discounted_price <= offer.original_price
            assert offer.quantity_available > 0
            assert offer.pickup_end > offer.pickup_start
            assert offer.is_active is True
