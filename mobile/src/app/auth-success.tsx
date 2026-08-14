import { router } from "expo-router";
import { useEffect, useRef } from "react";
import {
    Animated,
    Pressable,
    Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore } from "@/features/auth/store/authStore";
import { NativeWindAnimatedView } from "@/shared/ui/nativewindInterop";

export default function AuthSuccessScreen() {
    const user = useAuthStore((state) => state.user);
    const scale = useRef(new Animated.Value(0.6)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, {
                damping: 10,
                stiffness: 120,
                toValue: 1,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                duration: 420,
                toValue: 1,
                useNativeDriver: true,
            }),
        ]).start();
    }, [opacity, scale]);

    return (
        <SafeAreaView className="flex-1 bg-auth-background">
            <NativeWindAnimatedView className="flex-1 items-center justify-center p-7">
                <NativeWindAnimatedView
                    className="size-success-icon items-center justify-center rounded-pill bg-auth-green shadow-auth-celebration elevation-auth-celebration"
                    // Approved exception: these values are produced at runtime
                    // by React Native Animated and cannot be static utilities.
                    style={{ opacity, transform: [{ scale }] }}
                >
                    <Text className="text-[54px] font-bold text-white">✓</Text>
                </NativeWindAnimatedView>

                <NativeWindAnimatedView
                    className="mt-[34px] items-center"
                    // Approved exception: runtime animation value.
                    style={{ opacity }}
                >
                    <Text className="text-xs font-black tracking-[1.2px] text-auth-accent">
                        ACCOUNT READY
                    </Text>
                    <Text className="mt-2.5 text-center text-[31px] font-black tracking-[-0.7px] text-auth-text">
                        Welcome to LatePlate
                    </Text>
                    <Text className="mt-3 max-w-[330px] text-center text-button leading-6 text-auth-muted">
                        {user?.full_name ? `${user.full_name}, your` : "Your"}
                        {" account is ready. Let’s rescue good food together."}
                    </Text>
                </NativeWindAnimatedView>

                <Pressable
                    className="mt-10 min-w-[230px] rounded-pill bg-auth-green px-7 py-[18px] shadow-auth-control elevation-auth-control active:scale-[0.98] active:opacity-[0.86]"
                    onPress={() => router.replace("/")}
                >
                    <Text className="text-center text-button font-extrabold text-white">
                        Open Explore
                    </Text>
                </Pressable>
            </NativeWindAnimatedView>
        </SafeAreaView>
    );
}
