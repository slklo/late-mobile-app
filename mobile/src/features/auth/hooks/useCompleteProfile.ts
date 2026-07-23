import { useMutation } from "@tanstack/react-query";

import { completeProfile } from "../api/authApi";
import { useAuthStore } from "../store/authStore";


export function useCompleteProfile() {
    const setUser = useAuthStore((state) => state.setUser);

    return useMutation({
        mutationFn: completeProfile,
        onSuccess: (user) => {
            setUser(user);
        },
    });
}
