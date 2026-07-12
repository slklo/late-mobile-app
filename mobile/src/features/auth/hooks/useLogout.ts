import { useQueryClient } from "@tanstack/react-query";

import { removeAccessToken } from "@/shared/auth/tokenStorage";
import { useAuthStore } from "../store/authStore";

export function useLogout() {
    const queryClient = useQueryClient();
    const clearUser = useAuthStore((state) => state.clearUser);

    return async function logout() {
        await removeAccessToken();
        clearUser();
        queryClient.clear();
    };

}