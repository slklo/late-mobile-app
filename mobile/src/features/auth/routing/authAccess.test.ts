import { describe, expect, it } from "vitest";

import { getAuthAccess } from "./authAccess";

describe("getAuthAccess", () => {
    it("keeps unauthenticated users outside Explore", () => {
        expect(getAuthAccess(null)).toEqual({
            isUnauthenticated: true,
            needsProfile: false,
            canExplore: false,
        });
    });

    it("keeps a verified new user in profile completion", () => {
        expect(
            getAuthAccess({ profile_completed_at: null }),
        ).toEqual({
            isUnauthenticated: false,
            needsProfile: true,
            canExplore: false,
        });
    });

    it("opens Explore only after profile completion", () => {
        expect(
            getAuthAccess({
                profile_completed_at: "2026-07-23T12:00:00Z",
            }),
        ).toEqual({
            isUnauthenticated: false,
            needsProfile: false,
            canExplore: true,
        });
    });
});
