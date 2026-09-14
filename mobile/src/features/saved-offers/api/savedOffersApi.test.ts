/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from "vitest";


const mocks = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
}));

vi.mock("@/shared/api/client", () => ({
    apiClient: {
        get: mocks.get,
        post: mocks.post,
        delete: mocks.delete,
    },
}));

import {
    addSavedOffer,
    getSavedOffers,
    removeSavedOffer,
} from "./savedOffersApi";


const SAVED_OFFER = {
    id: 7,
    created_at: "2026-09-14T10:00:00Z",
    offer: {
        id: 42,
        title: "Bakery surprise bag",
        description: "Mixed baked goods",
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


beforeEach(() => {
    vi.clearAllMocks();
});


describe("saved offers api", () => {
    it("loads saved offers from the saved-offers endpoint", async () => {
        mocks.get.mockResolvedValue({ data: [SAVED_OFFER] });

        const result = await getSavedOffers();

        expect(mocks.get).toHaveBeenCalledWith("/saved-offers/");
        expect(result).toEqual([SAVED_OFFER]);
    });

    it("adds a saved offer through the offer-specific endpoint", async () => {
        mocks.post.mockResolvedValue({ data: SAVED_OFFER });

        const result = await addSavedOffer(42);

        expect(mocks.post).toHaveBeenCalledWith("/saved-offers/42/");
        expect(result).toEqual(SAVED_OFFER);
    });

    it("removes a saved offer through the offer-specific endpoint", async () => {
        mocks.delete.mockResolvedValue({ data: undefined });

        await expect(removeSavedOffer(42)).resolves.toBeUndefined();

        expect(mocks.delete).toHaveBeenCalledWith("/saved-offers/42/");
    });
});
