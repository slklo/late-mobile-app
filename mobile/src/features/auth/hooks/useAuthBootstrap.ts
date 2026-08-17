import axios from "axios";
import { useEffect, useRef } from "react";

import {
    getStoredAuthSession,
    removeAuthSession,
} from "@/shared/auth/tokenStorage";

import { getCurrentUser } from "../api/authApi";
import { useAuthStore } from "../store/authStore";

function isInvalidAuthError(error: unknown): boolean {
    return axios.isAxiosError(error) && error.response?.status === 401;
}

async function clearInvalidAuthSession(): Promise<void> {
    const { clearUser } = useAuthStore.getState();

    try {
        // The API interceptor normally removes an invalid session first.
        // This check keeps bootstrap safe if a 401 reaches it independently.
        const remainingSession = await getStoredAuthSession();

        if (remainingSession !== null) {
            await removeAuthSession();
        }
    } catch {
        // Clearing the in-memory user must not depend on storage availability.
    } finally {
        clearUser();
    }
}

export async function initializeAuth(): Promise<void> {
    const {
        clearUser,
        setInitialized,
        setUser,
    } = useAuthStore.getState();

    try {
        const session = await getStoredAuthSession();

        if (session === null) {
            clearUser();
            return;
        }

        const user = await getCurrentUser();
        setUser(user);
    } catch (error: unknown) {
        if (isInvalidAuthError(error)) {
            await clearInvalidAuthSession();
        }
        // Network, timeout, 503, and unknown temporary failures keep the
        // stored session and any existing user state intact.
    } finally {
        setInitialized(true);
    }
}

export function useAuthBootstrap() {
    const hasStarted = useRef(false);

    useEffect(() => {
        if (hasStarted.current) {
            return;
        }

        hasStarted.current = true;
        void initializeAuth();
    }, []);
}
