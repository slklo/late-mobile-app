import {
    saveAuthSession,
    type StoredAuthSession,
} from "@/shared/auth/tokenStorage";

import { useAuthFlowStore } from "../store/authFlowStore";
import { useAuthStore } from "../store/authStore";
import type { AuthSession } from "../types/auth.types";

export class AuthSessionStorageError extends Error {
    constructor() {
        super("The authentication token could not be stored securely");
        this.name = "AuthSessionStorageError";
    }
}

export function toStoredAuthSession(
    response: AuthSession,
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

export async function completeAuthSession(
    session: AuthSession,
): Promise<void> {
    try {
        await saveAuthSession(toStoredAuthSession(session));
    } catch {
        throw new AuthSessionStorageError();
    }

    useAuthStore.getState().setUser(session.user);
    useAuthFlowStore.getState().reset();
}
