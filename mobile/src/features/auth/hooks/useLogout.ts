import { useQueryClient } from "@tanstack/react-query";

import { removeAuthSession } from "@/shared/auth/tokenStorage";
import { useAuthFlowStore } from "../store/authFlowStore";
import { useAuthStore } from "../store/authStore";

export function useLogout() {
    const queryClient = useQueryClient();
    const clearUser = useAuthStore((state) => state.clearUser);
    const resetAuthFlow = useAuthFlowStore((state) => state.reset);

    return async function logout() {
        await removeAuthSession();
        resetAuthFlow();
        clearUser();
        queryClient.clear();
    };

}
