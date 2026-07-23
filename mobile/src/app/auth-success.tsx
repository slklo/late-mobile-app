import { router } from "expo-router";
import { useEffect, useRef } from "react";
import {
    Animated,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore } from "@/features/auth/store/authStore";
import { authColors } from "@/features/auth/theme";

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
        <SafeAreaView style={styles.screen}>
            <View style={styles.content}>
                <Animated.View
                    style={[
                        styles.checkCircle,
                        { opacity, transform: [{ scale }] },
                    ]}
                >
                    <Text style={styles.check}>✓</Text>
                </Animated.View>

                <Animated.View style={[styles.copy, { opacity }]}>
                    <Text style={styles.eyebrow}>ACCOUNT READY</Text>
                    <Text style={styles.title}>Welcome to LatePlate</Text>
                    <Text style={styles.subtitle}>
                        {user?.full_name ? `${user.full_name}, your` : "Your"}
                        {" account is ready. Let’s rescue good food together."}
                    </Text>
                </Animated.View>

                <Pressable
                    onPress={() => router.replace("/")}
                    style={({ pressed }) => [
                        styles.button,
                        pressed && styles.pressed,
                    ]}
                >
                    <Text style={styles.buttonText}>Open Explore</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        backgroundColor: authColors.background,
        flex: 1,
    },
    content: {
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
        padding: 28,
    },
    checkCircle: {
        alignItems: "center",
        backgroundColor: authColors.green,
        borderRadius: 999,
        height: 108,
        justifyContent: "center",
        shadowColor: authColors.green,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        width: 108,
        elevation: 7,
    },
    check: {
        color: "#FFFFFF",
        fontSize: 54,
        fontWeight: "700",
    },
    copy: {
        alignItems: "center",
        marginTop: 34,
    },
    eyebrow: {
        color: authColors.accent,
        fontSize: 12,
        fontWeight: "900",
        letterSpacing: 1.2,
    },
    title: {
        color: authColors.text,
        fontSize: 31,
        fontWeight: "900",
        letterSpacing: -0.7,
        marginTop: 10,
        textAlign: "center",
    },
    subtitle: {
        color: authColors.muted,
        fontSize: 16,
        lineHeight: 24,
        marginTop: 12,
        maxWidth: 330,
        textAlign: "center",
    },
    button: {
        backgroundColor: authColors.green,
        borderRadius: 999,
        marginTop: 40,
        minWidth: 230,
        paddingHorizontal: 28,
        paddingVertical: 18,
        shadowColor: authColors.green,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 5,
    },
    buttonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "800",
        textAlign: "center",
    },
    pressed: {
        opacity: 0.86,
        transform: [{ scale: 0.98 }],
    },
});
