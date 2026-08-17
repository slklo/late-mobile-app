import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const AUTH_SESSION_KEY = "auth_session_v1";

export type StoredAuthSession = {
    accessToken: string;
    refreshToken: string;
    accessExpiresAt: number;
    refreshExpiresAt: number;
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

function getWebStorage() {
    return typeof window === "undefined" ? null : window.sessionStorage;
}

function isStoredAuthSession(value: unknown): value is StoredAuthSession {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as Partial<StoredAuthSession>;

    return (
        typeof candidate.accessToken === "string"
        && candidate.accessToken.length > 0
        && typeof candidate.refreshToken === "string"
        && candidate.refreshToken.length > 0
        && typeof candidate.accessExpiresAt === "number"
        && Number.isFinite(candidate.accessExpiresAt)
        && typeof candidate.refreshExpiresAt === "number"
        && Number.isFinite(candidate.refreshExpiresAt)
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
