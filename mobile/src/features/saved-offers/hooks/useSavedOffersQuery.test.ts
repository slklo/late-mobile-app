import { describe, expect, it, vi } from "vitest";

import { getSavedOffers } from "../api/savedOffersApi";
import { savedOffersQueryKeys } from "../api/savedOffersQueryKeys";
import { createSavedOffersQueryOptions } from "./useSavedOffersQuery";


vi.mock("../api/savedOffersApi", () => ({
    getSavedOffers: vi.fn(),
}));


describe("saved offers query", () => {
    it("uses the stable saved offers query key and API function", () => {
        const options = createSavedOffersQueryOptions();

        expect(options.queryKey).toEqual(savedOffersQueryKeys.all);
        expect(options.queryFn).toBe(getSavedOffers);
    });
});
