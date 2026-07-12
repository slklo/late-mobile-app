import { useMutation } from "@tanstack/react-query";

import { saveAccessToken } from "@/shared/auth/tokenStorage";
import { login } from "../api/authApi";
import { useAuthStore } from "../store/authStore";

export function useLoginMutation() {
    const setUser = useAuthStore((state) => state.setUser);

    return useMutation({
        mutationFn: login,
        onSuccess: async (response) => {
            await saveAccessToken(response.access_token);
            setUser(response.user)
        }
    })
}