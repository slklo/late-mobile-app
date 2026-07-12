import { useEffect, useRef } from "react";

import { 
    getAccessToken,
    removeAccessToken, 
} from "@/shared/auth/tokenStorage";

import { getCurrentUser } from "../api/authApi";
import { useAuthStore } from "../store/authStore";

export function useAuthBootstrap() {
    const hasStarted = useRef(false);

    useEffect(() => {
       
        if (hasStarted.current) {
            return;
        }

        hasStarted.current = true;

        async function initializeAuth() {
            const {
                clearUser,
                setInitialized,
                setUser,
            } = useAuthStore.getState();

            try {
                const token = await getAccessToken();

                if (!token) {
                    clearUser();
                    return;
                }

                const user = await getCurrentUser();
                setUser(user);

            } catch {
                await removeAccessToken();
                clearUser();
            } finally {
                setInitialized(true);
            }
        }


        void initializeAuth();
    }, []);
}