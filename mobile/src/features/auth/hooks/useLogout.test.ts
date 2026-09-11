import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StoredAuthSession } from "@/shared/auth/tokenStorage";


const mocks = vi.hoisted(() => ({
    clearQueries: vi.fn(),
    clearUser: vi.fn(),
    getStoredAuthSession: vi.fn(),
    logoutAuthSession: vi.fn(),
    removeAuthSession: vi.fn(),
    resetAuthFlow: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
    useQueryClient: () => ({ clear: mocks.clearQueries }),
}));
vi.mock("@/shared/auth/tokenStorage", () => ({
    getStoredAuthSession: mocks.getStoredAuthSession,
    removeAuthSession: mocks.removeAuthSession,
}));
vi.mock("../api/authApi", () => ({
    logoutAuthSession: mocks.logoutAuthSession,
}));
vi.mock("../store/authFlowStore", () => ({
    useAuthFlowStore: (
        selector: (state: { reset: typeof mocks.resetAuthFlow }) => unknown,
    ) => selector({ reset: mocks.resetAuthFlow }),
}));
vi.mock("../store/authStore", () => ({
    useAuthStore: (
        selector: (state: { clearUser: typeof mocks.clearUser }) => unknown,
    ) => selector({ clearUser: mocks.clearUser }),
}));

import { useLogout } from "./useLogout";


const SESSION: StoredAuthSession = {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    accessExpiresAt: 1_800_000_000_000,
    refreshExpiresAt: 1_802_592_000_000,
};

const SESSION_WITH_PENDING_REFRESH: StoredAuthSession = {
    ...SESSION,
    pendingRefresh: {
        idempotencyKey: "pending-refresh-attempt-key",
        refreshToken: SESSION.refreshToken,
        createdAt: 1_800_000_000_100,
    },
};


beforeEach(() => {
    vi.clearAllMocks();
    mocks.getStoredAuthSession.mockResolvedValue(SESSION);
    mocks.logoutAuthSession.mockResolvedValue(undefined);
    mocks.removeAuthSession.mockResolvedValue(undefined);
});


describe("useLogout", () => {
    it("revokes the server session and clears all local auth state", async () => {
        const logout = useLogout();

        await logout();

        expect(mocks.logoutAuthSession).toHaveBeenCalledWith(
            SESSION.refreshToken,
        );
        expect(mocks.removeAuthSession).toHaveBeenCalledTimes(1);
        expect(mocks.resetAuthFlow).toHaveBeenCalledTimes(1);
        expect(mocks.clearUser).toHaveBeenCalledTimes(1);
        expect(mocks.clearQueries).toHaveBeenCalledTimes(1);
    });

    it("clears local auth state with a pending refresh attempt", async () => {
        mocks.getStoredAuthSession.mockResolvedValue(
            SESSION_WITH_PENDING_REFRESH,
        );
        const logout = useLogout();

        await logout();

        expect(mocks.logoutAuthSession).toHaveBeenCalledWith(
            SESSION.refreshToken,
        );
        expect(mocks.removeAuthSession).toHaveBeenCalledTimes(1);
        expect(mocks.clearUser).toHaveBeenCalledTimes(1);
        expect(mocks.clearQueries).toHaveBeenCalledTimes(1);
    });

    it("clears local auth state when the server logout fails", async () => {
        mocks.logoutAuthSession.mockRejectedValue(new Error("offline"));
        const logout = useLogout();

        await expect(logout()).resolves.toBeUndefined();

        expect(mocks.removeAuthSession).toHaveBeenCalledTimes(1);
        expect(mocks.resetAuthFlow).toHaveBeenCalledTimes(1);
        expect(mocks.clearUser).toHaveBeenCalledTimes(1);
        expect(mocks.clearQueries).toHaveBeenCalledTimes(1);
    });

    it("skips the server call when no session is stored", async () => {
        mocks.getStoredAuthSession.mockResolvedValue(null);
        const logout = useLogout();

        await logout();

        expect(mocks.logoutAuthSession).not.toHaveBeenCalled();
        expect(mocks.removeAuthSession).toHaveBeenCalledTimes(1);
        expect(mocks.clearUser).toHaveBeenCalledTimes(1);
        expect(mocks.clearQueries).toHaveBeenCalledTimes(1);
    });

    it("clears in-memory state even if secure storage removal fails", async () => {
        mocks.removeAuthSession.mockRejectedValue(
            new Error("secure storage unavailable"),
        );
        const logout = useLogout();

        await expect(logout()).resolves.toBeUndefined();

        expect(mocks.resetAuthFlow).toHaveBeenCalledTimes(1);
        expect(mocks.clearUser).toHaveBeenCalledTimes(1);
        expect(mocks.clearQueries).toHaveBeenCalledTimes(1);
    });
});
