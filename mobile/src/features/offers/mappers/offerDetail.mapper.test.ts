import { describe, expect, it } from "vitest";

import type { OfferRead } from "../types/offer.types";
import { mapOfferToDetailViewModel } from "./offerDetail.mapper";

const NOW = new Date("2026-08-03T12:00:00Z");

function createOffer(overrides: Partial<OfferRead> = {}): OfferRead {
    return {
        category: {
            id: 4,
            name: "Bakery",
            slug: "bakery",
        },
        description: " Fresh pastries from today's bake. ",
        discounted_price: "4.50",
        id: 12,
        image_url: " https://example.com/offer.jpg ",
        is_active: true,
        original_price: "12.00",
        pickup_end: "2026-08-03T20:00:00Z",
        pickup_start: "2026-08-03T18:00:00Z",
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

describe("mapOfferToDetailViewModel", () => {
    it("formats all detail fields for an available offer", () => {
        const result = mapOfferToDetailViewModel(createOffer(), {
            now: NOW,
            timeZone: "UTC",
        });

        expect(result).toEqual({
            categoryName: "Bakery",
            description: "Fresh pastries from today's bake.",
            discountedPriceLabel: "€4.50",
            id: 12,
            imagePlaceholderLabel: "Bakery",
            imageUrl: "https://example.com/offer.jpg",
            isAvailable: true,
            originalPriceLabel: "€12.00",
            pickupDateLabel: "Monday, 3 August",
            pickupWindowLabel: "18:00–20:00",
            quantityLabel: "5 items available",
            restaurantAddress: "Example Street 1, Berlin",
            restaurantName: "Baker's Corner",
            savingsLabel: "Save €7.50",
            statusLabel: "Available",
            title: "Evening Pastry Bag",
            unavailableReason: null,
        });
    });

    it("prioritizes inactive over sold-out and expired states", () => {
        const result = mapOfferToDetailViewModel(createOffer({
            is_active: false,
            pickup_end: "2026-08-03T11:00:00Z",
            quantity_available: 0,
        }), { now: NOW });

        expect(result.statusLabel).toBe("Unavailable");
        expect(result.unavailableReason).toBe(
            "This offer is no longer active.",
        );
    });

    it("prioritizes sold out over expired", () => {
        const result = mapOfferToDetailViewModel(createOffer({
            pickup_end: "2026-08-03T11:00:00Z",
            quantity_available: 0,
        }), { now: NOW });

        expect(result.isAvailable).toBe(false);
        expect(result.quantityLabel).toBe("No items available");
        expect(result.statusLabel).toBe("Sold out");
    });

    it("marks an active offer with stock as expired", () => {
        const result = mapOfferToDetailViewModel(createOffer({
            pickup_end: "2026-08-03T11:59:59Z",
        }), { now: NOW });

        expect(result.isAvailable).toBe(false);
        expect(result.statusLabel).toBe("Expired");
        expect(result.unavailableReason).toBe(
            "The pickup window for this offer has ended.",
        );
    });

    it("normalizes optional values and safely formats invalid input", () => {
        const result = mapOfferToDetailViewModel(createOffer({
            description: "  ",
            discounted_price: "invalid",
            image_url: "  ",
            original_price: "invalid",
            pickup_end: "invalid",
            pickup_start: "invalid",
            quantity_available: 1,
        }), { now: NOW });

        expect(result.description).toBe(
            "The restaurant has not added a description for this offer.",
        );
        expect(result.discountedPriceLabel).toBe("—");
        expect(result.imageUrl).toBeNull();
        expect(result.originalPriceLabel).toBe("—");
        expect(result.pickupDateLabel).toBe("Date unavailable");
        expect(result.pickupWindowLabel).toBe("Pickup time unavailable");
        expect(result.quantityLabel).toBe("1 item available");
        expect(result.savingsLabel).toBeNull();
    });
});
