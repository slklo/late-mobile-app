import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StoredAuthSession } from "@/shared/auth/tokenStorage";
import type { CurrentUser } from "../types/auth.types";


const mocks = vi.hoisted(() => ({
    clearUser: vi.fn(),
    getCurrentUser: vi.fn(),
    getStoredAuthSession: vi.fn(),
    removeAuthSession: vi.fn(),
    setInitialized: vi.fn(),
    setUser: vi.fn(),
}));

vi.mock("@/shared/auth/tokenStorage", () => ({
    getStoredAuthSession: mocks.getStoredAuthSession,
    removeAuthSession: mocks.removeAuthSession,
}));
vi.mock("../api/authApi", () => ({
    getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("../store/authStore", () => ({
    useAuthStore: {
        getState: () => ({
            clearUser: mocks.clearUser,
            setInitialized: mocks.setInitialized,
            setUser: mocks.setUser,
        }),
    },
}));

import { initializeAuth } from "./useAuthBootstrap";


const SESSION: StoredAuthSession = {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    accessExpiresAt: 1_800_000_000_000,
    refreshExpiresAt: 1_802_592_000_000,
};

const USER = {
    id: 42,
    email: "user@example.com",
    is_active: true,
    profile_completed_at: null,
} as CurrentUser;

function axiosError(status?: number): unknown {
    return {
        isAxiosError: true,
        response: status === undefined ? undefined : { status },
    };
}


beforeEach(() => {
    vi.clearAllMocks();
    mocks.removeAuthSession.mockResolvedValue(undefined);
});


describe("initializeAuth", () => {
    it("loads the current user when a stored session exists", async () => {
        mocks.getStoredAuthSession.mockResolvedValue(SESSION);
        mocks.getCurrentUser.mockResolvedValue(USER);

        await initializeAuth();

        expect(mocks.getCurrentUser).toHaveBeenCalledTimes(1);
        expect(mocks.setUser).toHaveBeenCalledWith(USER);
        expect(mocks.clearUser).not.toHaveBeenCalled();
        expect(mocks.setInitialized).toHaveBeenCalledWith(true);
    });

    it("clears the user when no session exists", async () => {
        mocks.getStoredAuthSession.mockResolvedValue(null);

        await initializeAuth();

        expect(mocks.getCurrentUser).not.toHaveBeenCalled();
        expect(mocks.clearUser).toHaveBeenCalledTimes(1);
        expect(mocks.setInitialized).toHaveBeenCalledWith(true);
    });

    it("removes a remaining session after an auth-invalid 401", async () => {
        mocks.getStoredAuthSession.mockResolvedValue(SESSION);
        mocks.getCurrentUser.mockRejectedValue(axiosError(401));

        await initializeAuth();

        expect(mocks.removeAuthSession).toHaveBeenCalledTimes(1);
        expect(mocks.clearUser).toHaveBeenCalledTimes(1);
        expect(mocks.setInitialized).toHaveBeenCalledWith(true);
    });

    it("does not remove an already invalidated session twice", async () => {
        mocks.getStoredAuthSession
            .mockResolvedValueOnce(SESSION)
            .mockResolvedValueOnce(null);
        mocks.getCurrentUser.mockRejectedValue(axiosError(401));

        await initializeAuth();

        expect(mocks.removeAuthSession).not.toHaveBeenCalled();
        expect(mocks.clearUser).toHaveBeenCalledTimes(1);
    });

    it.each([
        ["service unavailable", axiosError(503)],
        ["network failure", axiosError()],
    ])("keeps auth state after %s", async (_label, error) => {
        mocks.getStoredAuthSession.mockResolvedValue(SESSION);
        mocks.getCurrentUser.mockRejectedValue(error);

        await initializeAuth();

        expect(mocks.removeAuthSession).not.toHaveBeenCalled();
        expect(mocks.clearUser).not.toHaveBeenCalled();
        expect(mocks.setUser).not.toHaveBeenCalled();
        expect(mocks.setInitialized).toHaveBeenCalledWith(true);
    });
});
