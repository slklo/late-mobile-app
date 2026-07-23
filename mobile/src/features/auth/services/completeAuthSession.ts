import { saveAccessToken } from "@/shared/auth/tokenStorage";

import { useAuthFlowStore } from "../store/authFlowStore";
import { useAuthStore } from "../store/authStore";
import type { AuthSession } from "../types/auth.types";

export class AuthSessionStorageError extends Error {
    constructor() {
        super("The authentication token could not be stored securely");
        this.name = "AuthSessionStorageError";
    }
}

export async function completeAuthSession(
    session: AuthSession,
): Promise<void> {
    try {
        await saveAccessToken(session.access_token);
    } catch {
        throw new AuthSessionStorageError();
    }

    useAuthStore.getState().setUser(session.user);
    useAuthFlowStore.getState().reset();
}
