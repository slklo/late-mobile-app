import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const AUTH_SESSION_KEY = "auth_session_v1";

export type PendingRefresh = {
    idempotencyKey: string;
    refreshToken: string;
    createdAt: number;
};

export type StoredAuthSession = {
    accessToken: string;
    refreshToken: string;
    accessExpiresAt: number;
    refreshExpiresAt: number;
    pendingRefresh?: PendingRefresh;
};

export type AuthTokenPairResponse = {
    access_token: string;
    refresh_token: string;
    token_type: "bearer";
    access_expires_in_seconds: number;
    refresh_expires_in_seconds: number;
};

export function toStoredAuthSession(
    response: AuthTokenPairResponse,
): StoredAuthSession {
    const now = Date.now();

    return {
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        accessExpiresAt: (
            now + response.access_expires_in_seconds * 1000
        ),
        refreshExpiresAt: (
            now + response.refresh_expires_in_seconds * 1000
        ),
    };
}

export function createRefreshIdempotencyKey(): string {
    const bytes = new Uint8Array(32);

    if (globalThis.crypto?.getRandomValues) {
        globalThis.crypto.getRandomValues(bytes);
    } else {
        for (let index = 0; index < bytes.length; index += 1) {
            bytes[index] = Math.floor(Math.random() * 256);
        }
    }

    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

function getWebStorage() {
    return typeof window === "undefined" ? null : window.sessionStorage;
}

function isPendingRefresh(value: unknown): value is PendingRefresh {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as Partial<PendingRefresh>;

    return (
        typeof candidate.idempotencyKey === "string"
        && candidate.idempotencyKey.length >= 16
        && typeof candidate.refreshToken === "string"
        && candidate.refreshToken.length > 0
        && typeof candidate.createdAt === "number"
        && Number.isFinite(candidate.createdAt)
    );
}

function isStoredAuthSession(value: unknown): value is StoredAuthSession {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as Partial<StoredAuthSession>;

    const hasValidBaseSession = (
        typeof candidate.accessToken === "string"
        && candidate.accessToken.length > 0
        && typeof candidate.refreshToken === "string"
        && candidate.refreshToken.length > 0
        && typeof candidate.accessExpiresAt === "number"
        && Number.isFinite(candidate.accessExpiresAt)
        && typeof candidate.refreshExpiresAt === "number"
        && Number.isFinite(candidate.refreshExpiresAt)
    );

    if (!hasValidBaseSession) {
        return false;
    }

    return (
        candidate.pendingRefresh === undefined
        || isPendingRefresh(candidate.pendingRefresh)
    );
}

async function readStoredSessionValue(): Promise<string | null> {
    if (Platform.OS === "web") {
        return getWebStorage()?.getItem(AUTH_SESSION_KEY) ?? null;
    }

    return SecureStore.getItemAsync(AUTH_SESSION_KEY);
}

export async function getStoredAuthSession(): Promise<StoredAuthSession | null> {
    const storedValue = await readStoredSessionValue();

    if (storedValue === null) {
        return null;
    }

    try {
        const parsed: unknown = JSON.parse(storedValue);
        return isStoredAuthSession(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export function saveAuthSession(session: StoredAuthSession): Promise<void> {
    const serializedSession = JSON.stringify(session);

    if (Platform.OS === "web") {
        getWebStorage()?.setItem(AUTH_SESSION_KEY, serializedSession);
        return Promise.resolve();
    }

    return SecureStore.setItemAsync(AUTH_SESSION_KEY, serializedSession);
}

export async function getOrCreatePendingRefresh(
    refreshToken: string,
): Promise<PendingRefresh> {
    const session = await getStoredAuthSession();

    if (session === null) {
        throw new Error("Cannot start refresh without a stored session");
    }

    if (session.pendingRefresh?.refreshToken === refreshToken) {
        return session.pendingRefresh;
    }

    const pendingRefresh: PendingRefresh = {
        idempotencyKey: createRefreshIdempotencyKey(),
        refreshToken,
        createdAt: Date.now(),
    };

    await saveAuthSession({
        ...session,
        pendingRefresh,
    });

    return pendingRefresh;
}

export function removeAuthSession(): Promise<void> {
    if (Platform.OS === "web") {
        getWebStorage()?.removeItem(AUTH_SESSION_KEY);
        return Promise.resolve();
    }

    return SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
}

export async function getAccessToken(): Promise<string | null> {
    const session = await getStoredAuthSession();
    return session?.accessToken ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
    const session = await getStoredAuthSession();
    return session?.refreshToken ?? null;
}

export function removeAccessToken(): Promise<void> {
    return removeAuthSession();
}
