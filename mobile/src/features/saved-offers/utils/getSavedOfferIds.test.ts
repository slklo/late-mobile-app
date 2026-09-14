import { describe, expect, it } from "vitest";

import type { SavedOfferRead } from "../types/savedOffer.types";
import { getSavedOfferIds } from "./getSavedOfferIds";


function createSavedOffer(offerId: number): SavedOfferRead {
    return {
        id: offerId + 100,
        created_at: "2026-09-14T10:00:00Z",
        offer: {
            id: offerId,
            title: `Offer ${offerId}`,
            description: null,
            image_url: null,
            original_price: "12.00",
            discounted_price: "4.00",
            quantity_available: 3,
            pickup_start: "2026-09-14T17:00:00Z",
            pickup_end: "2026-09-14T18:00:00Z",
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
    };
}


describe("getSavedOfferIds", () => {
    it("returns a Set of saved offer ids", () => {
        const result = getSavedOfferIds([
            createSavedOffer(1),
            createSavedOffer(2),
        ]);

        expect(result).toBeInstanceOf(Set);
        expect(result.has(1)).toBe(true);
        expect(result.has(2)).toBe(true);
        expect(result.has(3)).toBe(false);
    });

    it("returns an empty Set when saved offers are missing", () => {
        expect(getSavedOfferIds(undefined).size).toBe(0);
    });
});
