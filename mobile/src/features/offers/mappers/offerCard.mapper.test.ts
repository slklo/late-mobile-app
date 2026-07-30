import { describe, expect, it } from "vitest";

import type { OfferRead } from "../types/offer.types";
import { mapOfferToCardViewModel } from "./offerCard.mapper";

const NOW = new Date("2026-07-30T12:00:00Z");

function createOffer(overrides: Partial<OfferRead> = {}): OfferRead {
    return {
        category: {
            id: 4,
            name: "Bakery",
            slug: "bakery",
        },
        description: "Fresh pastries from today's bake.",
        discounted_price: "4.50",
        id: 12,
        image_url: " https://example.com/offer.jpg ",
        is_active: true,
        original_price: "12.00",
        pickup_end: "2026-07-30T20:00:00Z",
        pickup_start: "2026-07-30T18:00:00Z",
        quantity_available: 5,
        restaurant: {
            address: "Example Street 1, Berlin",
            id: 8,
            image_url: null,
            name: "Baker's Corner",
        },
        title: "Evening Pastry Bag",
        ...overrides,
    };
}

describe("mapOfferToCardViewModel", () => {
    it("maps and formats an available discounted offer", () => {
        const result = mapOfferToCardViewModel(createOffer(), {
            now: NOW,
            timeZone: "UTC",
        });

        expect(result).toEqual({
            badge: { label: "-63%", type: "discount" },
            categoryName: "Bakery",
            discountedPriceLabel: "€4.50",
            distanceLabel: "Nearby",
            id: 12,
            imagePlaceholderLabel: "Bakery",
            imageUrl: "https://example.com/offer.jpg",
            isExpired: false,
            isSoldOut: false,
            offerTitle: "Evening Pastry Bag",
            originalPriceLabel: "€12.00",
            pickupWindowLabel: "18:00–20:00",
            restaurantName: "Baker's Corner",
            subtitle: "Fresh pastries from today's bake.",
        });
    });

    it("prioritizes an urgent quantity badge over the discount", () => {
        const result = mapOfferToCardViewModel(
            createOffer({ quantity_available: 2 }),
            { now: NOW, timeZone: "UTC" },
        );

        expect(result.badge).toEqual({
            label: "Only 2 left",
            type: "urgent",
        });
    });

    it("marks zero quantity as sold out", () => {
        const result = mapOfferToCardViewModel(
            createOffer({ quantity_available: 0 }),
            { now: NOW, timeZone: "UTC" },
        );

        expect(result.isSoldOut).toBe(true);
        expect(result.badge).toEqual({
            label: "Sold out",
            type: "sold_out",
        });
    });

    it("prioritizes an expired badge over sold-out state", () => {
        const result = mapOfferToCardViewModel(
            createOffer({
                pickup_end: "2026-07-30T11:59:59Z",
                quantity_available: 0,
            }),
            { now: NOW, timeZone: "UTC" },
        );

        expect(result.isExpired).toBe(true);
        expect(result.isSoldOut).toBe(true);
        expect(result.badge).toEqual({
            label: "Expired",
            type: "expired",
        });
    });

    it("normalizes missing optional content and supports no distance", () => {
        const result = mapOfferToCardViewModel(
            createOffer({ description: "  ", image_url: "  " }),
            { distanceLabel: null, now: NOW, timeZone: "UTC" },
        );

        expect(result.imageUrl).toBeNull();
        expect(result.imagePlaceholderLabel).toBe("Bakery");
        expect(result.subtitle).toBe("Bakery");
        expect(result.distanceLabel).toBeNull();
    });

    it("falls back safely for invalid prices and pickup dates", () => {
        const result = mapOfferToCardViewModel(
            createOffer({
                discounted_price: "invalid",
                original_price: "invalid",
                pickup_end: "invalid",
                pickup_start: "invalid",
            }),
            { now: NOW, timeZone: "UTC" },
        );

        expect(result.discountedPriceLabel).toBe("—");
        expect(result.originalPriceLabel).toBe("—");
        expect(result.pickupWindowLabel).toBe("Pickup time unavailable");
        expect(result.badge).toBeNull();
        expect(result.isExpired).toBe(false);
    });
});
