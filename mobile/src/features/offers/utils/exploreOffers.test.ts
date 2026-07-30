import { describe, expect, it } from "vitest";

import type { OfferCardViewModel } from "../types/offerCard.types";
import {
    ALL_CATEGORIES,
    filterOffersByCategory,
    getExploreCategories,
    splitOffersForExplore,
} from "./exploreOffers";

function createOffer(
    id: number,
    categoryName: string,
): OfferCardViewModel {
    return {
        badge: null,
        categoryName,
        discountedPriceLabel: "€4.00",
        distanceLabel: "Nearby",
        id,
        imagePlaceholderLabel: categoryName,
        imageUrl: null,
        isExpired: false,
        isSoldOut: false,
        offerTitle: `Offer ${id}`,
        originalPriceLabel: "€10.00",
        pickupWindowLabel: "18:00–20:00",
        restaurantName: `Restaurant ${id}`,
        subtitle: categoryName,
    };
}

const OFFERS = [
    createOffer(1, "Bakery"),
    createOffer(2, "Meals"),
    createOffer(3, "Bakery"),
    createOffer(4, "Sweets"),
];

describe("Explore offer helpers", () => {
    it("derives unique categories in their source order", () => {
        expect(getExploreCategories(OFFERS)).toEqual([
            ALL_CATEGORIES,
            "Bakery",
            "Meals",
            "Sweets",
        ]);
    });

    it("filters locally while All preserves every offer", () => {
        expect(filterOffersByCategory(OFFERS, "Bakery").map(({ id }) => id))
            .toEqual([1, 3]);
        expect(filterOffersByCategory(OFFERS, ALL_CATEGORIES)).toBe(OFFERS);
    });

    it("splits sections without duplicates and preserves their order", () => {
        const sections = splitOffersForExplore(OFFERS);

        expect(sections.recommended.map(({ id }) => id)).toEqual([1, 3]);
        expect(sections.inArea.map(({ id }) => id)).toEqual([2, 4]);
        expect([
            ...sections.recommended,
            ...sections.inArea,
        ].map(({ id }) => id).sort()).toEqual([1, 2, 3, 4]);
    });
});
