import { useQueryClient } from "@tanstack/react-query";

import {
    getStoredAuthSession,
    removeAuthSession,
} from "@/shared/auth/tokenStorage";
import { logoutAuthSession } from "../api/authApi";
import { useAuthFlowStore } from "../store/authFlowStore";
import { useAuthStore } from "../store/authStore";

export function useLogout() {
    const queryClient = useQueryClient();
    const clearUser = useAuthStore((state) => state.clearUser);
    const resetAuthFlow = useAuthFlowStore((state) => state.reset);

    return async function logout() {
        try {
            const session = await getStoredAuthSession();

            if (session !== null) {
                await logoutAuthSession(session.refreshToken);
            }
        } catch {
            // Server logout is best effort. Local logout must always finish.
        } finally {
            try {
                await removeAuthSession();
            } catch {
                // In-memory auth state still has to be cleared if storage fails.
            }

            resetAuthFlow();
            clearUser();
            queryClient.clear();
        }
    };
}
