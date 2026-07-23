import "../../styles/global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useState, useEffect } from "react";

import { useAuthBootstrap } from "@/features/auth/hooks/useAuthBootstrap";
import { getAuthAccess } from "@/features/auth/routing/authAccess";
import { useAuthStore } from "@/features/auth/store/authStore";
import { setUnauthorizedHandler } from "@/shared/api/client";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [queryClient] = useState(() => new QueryClient());

    const user = useAuthStore((state) => state.user);
    const isInitialized = useAuthStore(
        (state) => state.isInitialized
    );

    const clearUser = useAuthStore((state) => state.clearUser);
    const authAccess = getAuthAccess(user);

    useAuthBootstrap();

    useEffect(() => {
        return setUnauthorizedHandler(clearUser);
    }, [clearUser]);

    useEffect(() => {
        if (isInitialized) {
            void SplashScreen.hideAsync();
        }
    }, [isInitialized]);

    if (!isInitialized) {
        return null;
    }

    return (
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={authAccess.isUnauthenticated}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
        
            <Stack.Protected
              guard={authAccess.needsProfile}
            >
              <Stack.Screen name="(onboarding)" />
            </Stack.Protected>

            <Stack.Protected
              guard={authAccess.canExplore}
            >
              <Stack.Screen name="(app)" />
            </Stack.Protected>

            <Stack.Protected guard={Boolean(user)}>
              <Stack.Screen name="auth-success" />
            </Stack.Protected>

            <Stack.Screen name="auth/email/link" />
          </Stack>
        </QueryClientProvider>
    );

}
