import { useMutation } from "@tanstack/react-query";

import { saveAccessToken } from "@/shared/auth/tokenStorage";
import { register } from "../api/authApi";
import { useAuthStore } from "../store/authStore";

export function useRegisterMutation() {
    const setUser = useAuthStore((state) => state.setUser);

    return useMutation({
        mutationFn: register,
        onSuccess: async (response) => {
            await saveAccessToken(response.access_token);
            setUser(response.user);
        }
    })
}