import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useState, useEffect } from "react";

import { useAuthBootstrap } from "@/features/auth/hooks/useAuthBootstrap";
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
            <Stack.Protected guard={!user}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
        
            <Stack.Protected guard={Boolean(user)}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
          </Stack>
        </QueryClientProvider>
    );

}