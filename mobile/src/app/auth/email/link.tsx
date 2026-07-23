import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { consumeEmailLink } from "@/features/auth/api/authApi";
import { completeAuthSession } from "@/features/auth/services/completeAuthSession";
import { useAuthFlowStore } from "@/features/auth/store/authFlowStore";
import { useAuthStore } from "@/features/auth/store/authStore";
import { authColors } from "@/features/auth/theme";
import type { AuthSession } from "@/features/auth/types/auth.types";
import { getApiErrorCode } from "@/shared/api/errors";

const UUID_PATTERN = (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
);
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,256}$/;

const inFlightLinks = new Map<string, Promise<AuthSession>>();
const handledLinks = new Set<string>();

class LinkAlreadyHandledError extends Error {}

function consumeLinkOnce(
    challengeId: string,
    token: string,
): Promise<AuthSession> {
    const pending = inFlightLinks.get(challengeId);

    if (pending) {
        return pending;
    }

    if (handledLinks.has(challengeId)) {
        return Promise.reject(new LinkAlreadyHandledError());
    }

    handledLinks.add(challengeId);

    const request = (async () => {
        const session = await consumeEmailLink({
            challenge_id: challengeId,
            token,
        });
        await completeAuthSession(session);
        return session;
    })().finally(() => {
        inFlightLinks.delete(challengeId);
    });

    inFlightLinks.set(challengeId, request);
    return request;
}

function singleParam(value: string | string[] | undefined): string | null {
    return typeof value === "string" ? value : null;
}

export default function MagicLinkScreen() {
    const params = useLocalSearchParams<{
        challenge_id?: string | string[];
        token?: string | string[];
    }>();
    const user = useAuthStore((state) => state.user);
    const resetFlow = useAuthFlowStore((state) => state.reset);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const challengeId = singleParam(params.challenge_id);
        const token = singleParam(params.token);

        if (
            !challengeId ||
            !token ||
            !UUID_PATTERN.test(challengeId) ||
            !TOKEN_PATTERN.test(token)
        ) {
            setError("This sign-in link is incomplete or invalid.");
            return;
        }

        let isMounted = true;

        void consumeLinkOnce(challengeId, token)
            .then((session) => {
                if (!isMounted) {
                    return;
                }

                router.replace(
                    session.next_step === "complete_profile"
                        ? "/complete-profile"
                        : "/",
                );
            })
            .catch((requestError: unknown) => {
                if (!isMounted) {
                    return;
                }

                if (requestError instanceof LinkAlreadyHandledError) {
                    const currentUser = useAuthStore.getState().user;

                    if (currentUser) {
                        router.replace(
                            currentUser.profile_completed_at
                                ? "/"
                                : "/complete-profile",
                        );
                        return;
                    }
                }

                setError(
                    getApiErrorCode(requestError) === "INVALID_MAGIC_LINK"
                        ? "This sign-in link is invalid, expired, or already used."
                        : "We could not complete sign-in. Please request a new email.",
                );
            });

        return () => {
            isMounted = false;
        };
    }, [params.challenge_id, params.token]);

    const leaveCallback = () => {
        resetFlow();
        router.replace("/");
    };

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.content}>
                <View style={styles.iconBox}>
                    <Text style={styles.icon}>{error ? "!" : "✓"}</Text>
                </View>
                <Text style={styles.title}>
                    {error ? "Link unavailable" : "Signing you in"}
                </Text>
                <Text style={styles.subtitle}>
                    {error
                        ? error
                        : "Please wait while we securely verify your email link."}
                </Text>

                {error ? (
                    <Pressable onPress={leaveCallback} style={styles.button}>
                        <Text style={styles.buttonText}>
                            {user ? "Continue to app" : "Request a new email"}
                        </Text>
                    </Pressable>
                ) : (
                    <ActivityIndicator
                        color={authColors.green}
                        size="large"
                        style={styles.spinner}
                    />
                )}
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
    iconBox: {
        alignItems: "center",
        backgroundColor: authColors.greenLight,
        borderRadius: 24,
        height: 78,
        justifyContent: "center",
        width: 78,
    },
    icon: {
        color: authColors.green,
        fontSize: 34,
        fontWeight: "900",
    },
    title: {
        color: authColors.text,
        fontSize: 28,
        fontWeight: "900",
        marginTop: 24,
        textAlign: "center",
    },
    subtitle: {
        color: authColors.muted,
        fontSize: 15,
        lineHeight: 23,
        marginTop: 10,
        maxWidth: 330,
        textAlign: "center",
    },
    spinner: {
        marginTop: 30,
    },
    button: {
        backgroundColor: authColors.green,
        borderRadius: 999,
        marginTop: 30,
        minWidth: 220,
        paddingHorizontal: 24,
        paddingVertical: 17,
    },
    buttonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "800",
        textAlign: "center",
    },
});
