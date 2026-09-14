import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { consumeEmailLink } from "@/features/auth/api/authApi";
import { completeAuthSession } from "@/features/auth/services/completeAuthSession";
import { useAuthFlowStore } from "@/features/auth/store/authFlowStore";
import { useAuthStore } from "@/features/auth/store/authStore";
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
    const challengeId = singleParam(params.challenge_id);
    const token = singleParam(params.token);
    const linkKey = `${challengeId ?? ""}:${token ?? ""}`;
    const validationError = (
        !challengeId ||
        !token ||
        !UUID_PATTERN.test(challengeId) ||
        !TOKEN_PATTERN.test(token)
    )
        ? "This sign-in link is incomplete or invalid."
        : null;
    const [requestError, setRequestError] = useState<{
        key: string;
        message: string;
    } | null>(null);
    const error = validationError ?? (
        requestError?.key === linkKey ? requestError.message : null
    );

    useEffect(() => {
        if (validationError || !challengeId || !token) {
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

                setRequestError({
                    key: linkKey,
                    message: getApiErrorCode(requestError) === (
                        "INVALID_MAGIC_LINK"
                    )
                        ? "This sign-in link is invalid, expired, or already used."
                        : "We could not complete sign-in. Please request a new email.",
                });
            });

        return () => {
            isMounted = false;
        };
    }, [challengeId, linkKey, token, validationError]);

    const leaveCallback = () => {
        resetFlow();
        router.replace("/");
    };

    return (
        <SafeAreaView className="flex-1 bg-auth-background">
            <View className="flex-1 items-center justify-center p-7">
                <View className="size-[78px] items-center justify-center rounded-3xl bg-auth-green-light">
                    <Text className="text-[34px] font-black text-auth-green">
                        {error ? "!" : "✓"}
                    </Text>
                </View>
                <Text className="mt-6 text-center text-[28px] font-black text-auth-text">
                    {error ? "Link unavailable" : "Signing you in"}
                </Text>
                <Text className="mt-2.5 max-w-[330px] text-center text-body text-auth-muted">
                    {error
                        ? error
                        : "Please wait while we securely verify your email link."}
                </Text>

                {error ? (
                    <Pressable
                        className="mt-[30px] min-w-[220px] rounded-pill bg-auth-green px-6 py-[17px]"
                        onPress={leaveCallback}
                    >
                        <Text className="text-center text-[15px] font-extrabold text-white">
                            {user ? "Continue to app" : "Request a new email"}
                        </Text>
                    </Pressable>
                ) : (
                    <ActivityIndicator
                        className="mt-[30px] text-auth-green"
                        size="large"
                    />
                )}
            </View>
        </SafeAreaView>
    );
}
