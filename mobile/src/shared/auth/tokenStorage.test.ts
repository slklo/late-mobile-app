import { beforeEach, describe, expect, it, vi } from "vitest";

const secureStore = vi.hoisted(() => {
    const values = new Map<string, string>();

    return {
        values,
        getItemAsync: vi.fn(async (key: string) => values.get(key) ?? null),
        setItemAsync: vi.fn(async (key: string, value: string) => {
            values.set(key, value);
        }),
        deleteItemAsync: vi.fn(async (key: string) => {
            values.delete(key);
        }),
    };
});

vi.mock("expo-secure-store", () => secureStore);
vi.mock("react-native", () => ({
    Platform: { OS: "ios" },
}));

import {
    createRefreshIdempotencyKey,
    getAccessToken,
    getOrCreatePendingRefresh,
    getRefreshToken,
    getStoredAuthSession,
    removeAccessToken,
    removeAuthSession,
    saveAuthSession,
    type StoredAuthSession,
} from "./tokenStorage";


const SESSION: StoredAuthSession = {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    accessExpiresAt: 1_800_000_000_000,
    refreshExpiresAt: 1_802_592_000_000,
};

const ROTATED_SESSION: StoredAuthSession = {
    accessToken: "rotated-access-token",
    refreshToken: "rotated-refresh-token",
    accessExpiresAt: 1_800_000_900_000,
    refreshExpiresAt: 1_805_184_000_000,
};

const PENDING_SESSION: StoredAuthSession = {
    ...SESSION,
    pendingRefresh: {
        idempotencyKey: "pending-refresh-attempt-key",
        refreshToken: SESSION.refreshToken,
        createdAt: 1_800_000_000_100,
    },
};


beforeEach(() => {
    secureStore.values.clear();
    vi.clearAllMocks();
});


describe("auth session storage", () => {
    it("stores and restores the token pair as one versioned JSON value", async () => {
        await saveAuthSession(SESSION);

        expect(secureStore.setItemAsync).toHaveBeenCalledWith(
            "auth_session_v1",
            JSON.stringify(SESSION),
        );
        await expect(getStoredAuthSession()).resolves.toEqual(SESSION);
    });

    it("restores sessions that contain a pending refresh attempt", async () => {
        await saveAuthSession(PENDING_SESSION);

        await expect(getStoredAuthSession()).resolves.toEqual(
            PENDING_SESSION,
        );
    });

    it("exposes access and refresh tokens from the same stored session", async () => {
        await saveAuthSession(SESSION);

        await expect(getAccessToken()).resolves.toBe(SESSION.accessToken);
        await expect(getRefreshToken()).resolves.toBe(SESSION.refreshToken);
    });

    it("removes the complete session through both removal APIs", async () => {
        await saveAuthSession(SESSION);
        await removeAccessToken();

        await expect(getStoredAuthSession()).resolves.toBeNull();

        await saveAuthSession(SESSION);
        await removeAuthSession();

        await expect(getStoredAuthSession()).resolves.toBeNull();
    });

    it("rejects malformed or incomplete stored values", async () => {
        secureStore.values.set("auth_session_v1", "not-json");
        await expect(getStoredAuthSession()).resolves.toBeNull();

        secureStore.values.set(
            "auth_session_v1",
            JSON.stringify({ accessToken: "access-token" }),
        );
        await expect(getStoredAuthSession()).resolves.toBeNull();
    });

    it("keeps the old complete pair when storing a rotation fails", async () => {
        await saveAuthSession(SESSION);
        secureStore.setItemAsync.mockRejectedValueOnce(
            new Error("secure storage unavailable"),
        );

        await expect(saveAuthSession(ROTATED_SESSION)).rejects.toThrow(
            "secure storage unavailable",
        );

        await expect(getStoredAuthSession()).resolves.toEqual(SESSION);
    });

    it("creates and reuses a pending refresh for the same refresh token", async () => {
        await saveAuthSession(SESSION);

        const firstPending = await getOrCreatePendingRefresh(
            SESSION.refreshToken,
        );
        const secondPending = await getOrCreatePendingRefresh(
            SESSION.refreshToken,
        );

        expect(firstPending).toEqual(secondPending);
        expect(firstPending.refreshToken).toBe(SESSION.refreshToken);
        expect(firstPending.idempotencyKey.length).toBeGreaterThanOrEqual(
            16,
        );
        await expect(getStoredAuthSession()).resolves.toMatchObject({
            pendingRefresh: firstPending,
        });
    });

    it("creates a new pending refresh for a different refresh token", async () => {
        await saveAuthSession(PENDING_SESSION);

        const pending = await getOrCreatePendingRefresh(
            ROTATED_SESSION.refreshToken,
        );

        expect(pending.refreshToken).toBe(ROTATED_SESSION.refreshToken);
        expect(pending.idempotencyKey).not.toBe(
            PENDING_SESSION.pendingRefresh?.idempotencyKey,
        );
    });

    it("generates a long idempotency key without storing it alone", () => {
        const key = createRefreshIdempotencyKey();

        expect(key).toHaveLength(64);
        expect(key).toMatch(/^[0-9a-f]+$/);
    });
});
