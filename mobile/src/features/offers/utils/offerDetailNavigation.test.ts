import { describe, expect, it } from "vitest";

import {
    getOfferDetailFallbackRoute,
    getOfferDetailSourceTab,
} from "./offerDetailNavigation";


describe("offer detail navigation helpers", () => {
    it("normalizes from=favorite into the favorite source tab", () => {
        expect(getOfferDetailSourceTab("favorite")).toBe("favorite");
        expect(getOfferDetailSourceTab(["favorite"])).toBe("favorite");
    });

    it("ignores missing or unknown source tabs", () => {
        expect(getOfferDetailSourceTab(undefined)).toBeNull();
        expect(getOfferDetailSourceTab("discover")).toBeNull();
        expect(getOfferDetailSourceTab(["discover"])).toBeNull();
    });

    it("uses favorite as fallback only for favorite-sourced detail links", () => {
        expect(getOfferDetailFallbackRoute("favorite")).toBe("/favorite");
        expect(getOfferDetailFallbackRoute(null)).toBe("/");
    });
});
