import { describe, expect, it } from "vitest";

import type { SavedOfferRead } from "../types/savedOffer.types";
import {
    mapSavedOfferToCardViewModel,
    mapSavedOffersToCardViewModels,
} from "./savedOfferCard.mapper";


function createSavedOffer(overrides: Partial<SavedOfferRead> = {}): SavedOfferRead {
    return {
        id: 7,
        created_at: "2026-09-15T10:00:00Z",
        offer: {
            id: 42,
            title: "Bakery surprise bag",
            description: "Mixed baked goods",
            image_url: null,
            original_price: "12.00",
            discounted_price: "4.00",
            quantity_available: 3,
            pickup_start: "2026-09-15T17:00:00Z",
            pickup_end: "2026-09-15T18:00:00Z",
            is_active: true,
            restaurant: {
                id: 10,
                name: "Test Bakery",
                address: "Test Street 1",
                image_url: null,
            },
            category: {
                id: 20,
                name: "Bakery",
                slug: "bakery",
            },
        },
        ...overrides,
    };
}


describe("saved offer card mapper", () => {
    it("maps a saved offer into the existing offer card view model shape", () => {
        const result = mapSavedOfferToCardViewModel(createSavedOffer(), {
            locale: "en-IE",
            now: new Date("2026-09-15T12:00:00Z"),
            timeZone: "UTC",
        });

        expect(result).toMatchObject({
            categoryName: "Bakery",
            discountedPriceLabel: "€4.00",
            distanceLabel: "Nearby",
            id: 42,
            imagePlaceholderLabel: "Bakery",
            imageUrl: null,
            isExpired: false,
            isSoldOut: false,
            offerTitle: "Bakery surprise bag",
            originalPriceLabel: "€12.00",
            pickupWindowLabel: "17:00–18:00",
            restaurantName: "Test Bakery",
            subtitle: "Mixed baked goods",
        });
    });

    it("maps saved offer lists", () => {
        const result = mapSavedOffersToCardViewModels([
            createSavedOffer(),
            createSavedOffer({
                id: 8,
                offer: {
                    ...createSavedOffer().offer,
                    id: 43,
                    title: "Dinner box",
                },
            }),
        ]);

        expect(result.map((offer) => offer.id)).toEqual([42, 43]);
        expect(result.map((offer) => offer.offerTitle)).toEqual([
            "Bakery surprise bag",
            "Dinner box",
        ]);
    });
});
