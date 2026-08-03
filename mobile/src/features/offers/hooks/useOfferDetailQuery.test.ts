import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getOfferById } from "../api/offerApi";
import {
    createOfferDetailQueryOptions,
    isValidOfferId,
} from "./useOfferDetailQuery";

vi.mock("../api/offerApi", () => ({
    getOfferById: vi.fn(),
}));

afterEach(() => {
    vi.clearAllMocks();
});

describe("offer detail query", () => {
    it.each([null, Number.NaN, 0, -1, 1.5])(
        "disables the query for invalid offer id %s",
        (offerId) => {
            const options = createOfferDetailQueryOptions(offerId);

            expect(isValidOfferId(offerId)).toBe(false);
            expect(options.enabled).toBe(false);
            expect(options.queryKey).toEqual(["offers", offerId]);
        },
    );

    it("does not start an API request for an invalid offer id", async () => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        });
        const observer = new QueryObserver(
            queryClient,
            createOfferDetailQueryOptions(Number.NaN),
        );
        const unsubscribe = observer.subscribe(() => undefined);

        await Promise.resolve();

        expect(getOfferById).not.toHaveBeenCalled();

        unsubscribe();
        queryClient.clear();
    });

    it("enables the existing detail query key for a positive integer", () => {
        const options = createOfferDetailQueryOptions(42);

        expect(isValidOfferId(42)).toBe(true);
        expect(options.enabled).toBe(true);
        expect(options.queryKey).toEqual(["offers", 42]);
    });
});
