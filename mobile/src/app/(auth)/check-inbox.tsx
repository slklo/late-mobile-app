import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    requestEmailChallenge,
    verifyEmailCode,
} from "@/features/auth/api/authApi";
import { AuthButton } from "@/features/auth/components/AuthButton";
import {
    AuthSessionStorageError,
    completeAuthSession,
} from "@/features/auth/services/completeAuthSession";
import { useAuthFlowStore } from "@/features/auth/store/authFlowStore";
import { getApiErrorCode, getApiErrorMessage } from "@/shared/api/errors";

function maskEmail(email: string): string {
    const [localPart, domain] = email.split("@");

    if (!localPart || !domain) {
        return email;
    }

    return `${localPart[0]}${"*".repeat(Math.max(3, localPart.length - 1))}@${domain}`;
}

function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function verificationErrorMessage(error: unknown): string {
    if (error instanceof AuthSessionStorageError) {
        return (
            "Your code was accepted, but this device could not store the " +
            "session securely. Request a new email and try again."
        );
    }

    switch (getApiErrorCode(error)) {
        case "INVALID_EMAIL_VERIFICATION":
            return "The code is invalid or has expired.";
        case "EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED":
            return "Too many attempts. Request new sign-in instructions.";
        case "AUTHENTICATION_SERVICE_UNAVAILABLE":
            return "Sign-in is temporarily unavailable. Please try again.";
        default:
            return getApiErrorMessage(
                error,
                "The server could not verify the code. Please try again.",
            );
    }
}

export default function CheckInboxScreen() {
    const email = useAuthFlowStore((state) => state.email);
    const challengeId = useAuthFlowStore((state) => state.challengeId);
    const expiresAt = useAuthFlowStore((state) => state.expiresAt);
    const resendAvailableAt = useAuthFlowStore(
        (state) => state.resendAvailableAt,
    );
    const setChallenge = useAuthFlowStore((state) => state.setChallenge);
    const clearChallenge = useAuthFlowStore((state) => state.clearChallenge);
    const [code, setCode] = useState("");
    const [now, setNow] = useState(() => Date.now());
    const [isLocked, setLocked] = useState(false);
    const [resentMessage, setResentMessage] = useState<string | null>(null);
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        if (!email || !challengeId || !expiresAt) {
            router.replace("/");
        }
    }, [challengeId, email, expiresAt]);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const expiresIn = Math.max(
        0,
        Math.ceil(((expiresAt ?? now) - now) / 1000),
    );
    const resendIn = Math.max(
        0,
        Math.ceil(((resendAvailableAt ?? now) - now) / 1000),
    );
    const isExpired = expiresIn === 0;

    const verify = useMutation({
        mutationFn: async () => {
            if (!challengeId) {
                throw new Error("Missing email challenge");
            }

            const session = await verifyEmailCode({
                challenge_id: challengeId,
                code,
            });
            await completeAuthSession(session);
            return session;
        },
        onSuccess: (session) => {
            router.replace(
                session.next_step === "complete_profile"
                    ? "/complete-profile"
                    : "/",
            );
        },
        onError: (error) => {
            if (
                getApiErrorCode(error) === (
                    "EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED"
                )
            ) {
                setLocked(true);
            }
        },
    });

    const resend = useMutation({
        mutationFn: requestEmailChallenge,
        onSuccess: (challenge, variables) => {
            setChallenge(variables.email, challenge);
            setCode("");
            setLocked(false);
            setResentMessage("New sign-in instructions were sent.");
            verify.reset();
            inputRef.current?.focus();
        },
    });

    const resendError = useMemo(() => {
        if (!resend.isError) {
            return null;
        }

        if (
            getApiErrorCode(resend.error) === "EMAIL_CHALLENGE_RATE_LIMITED"
        ) {
            return "Please wait before requesting another email.";
        }

        return "We could not resend the instructions. Please try again.";
    }, [resend.error, resend.isError]);

    if (!email || !challengeId || !expiresAt) {
        return null;
    }

    const changeEmail = () => {
        clearChallenge(true);
        router.replace("/");
    };

    const submitCode = () => {
        if (code.length === 6 && !isExpired && !isLocked) {
            verify.mutate();
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-auth-background">
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                className="flex-1"
            >
                <ScrollView
                    contentContainerClassName="flex-grow p-6 pb-10"
                    keyboardShouldPersistTaps="handled"
                >
                    <Pressable
                        className="self-start py-1.5"
                        onPress={changeEmail}
                    >
                        <Text className="text-[15px] font-bold text-auth-green">
                            ‹ Change email
                        </Text>
                    </Pressable>

                    <View className="mt-8 size-[66px] items-center justify-center rounded-panel bg-auth-green-light">
                        <Text className="text-[31px] font-bold text-auth-green">
                            ✉
                        </Text>
                    </View>
                    <Text className="mt-[22px] text-heading-md font-black tracking-[-0.5px] text-auth-text">
                        Check your inbox
                    </Text>
                    <Text className="mt-2.5 text-body text-auth-muted">
                        We sent sign-in instructions to{" "}
                        <Text className="font-extrabold text-auth-text">
                            {maskEmail(email)}
                        </Text>
                        {". Open the link in the email, or enter the six-digit "}
                        code if your email contains one.
                    </Text>

                    <Text className="mt-3 text-label text-auth-muted">
                        {isExpired
                            ? "These instructions have expired."
                            : `Instructions expire in ${formatTime(expiresIn)}.`}
                    </Text>

                    <Pressable
                        className="relative mt-[34px] flex-row justify-center gap-[5px]"
                        onPress={() => inputRef.current?.focus()}
                    >
                        {Array.from({ length: 6 }, (_, index) => {
                            const digit = code[index] ?? "";
                            const isActive = index === code.length;

                            return (
                                <View
                                    className={`h-14 w-[39px] items-center justify-center rounded-otp border-[1.5px] bg-auth-card ${
                                        digit
                                            ? "border-auth-green bg-auth-green-light"
                                            : "border-auth-border"
                                    } ${
                                        isActive ? "border-auth-green" : ""
                                    } ${
                                        verify.isError
                                            ? "border-auth-error-border"
                                            : ""
                                    }`}
                                    key={index}
                                >
                                    <Text className="text-heading-sm font-extrabold text-auth-text">
                                        {digit}
                                    </Text>
                                </View>
                            );
                        })}
                        <TextInput
                            ref={inputRef}
                            accessibilityLabel="Six digit verification code"
                            autoFocus
                            caretHidden
                            editable={(
                                !verify.isPending && !isLocked && !isExpired
                            )}
                            keyboardType="number-pad"
                            maxLength={6}
                            onChangeText={(value) => {
                                setCode(value.replace(/\D/g, "").slice(0, 6));
                                verify.reset();
                            }}
                            onSubmitEditing={submitCode}
                            className="absolute inset-0 opacity-[0.01]"
                            textContentType="oneTimeCode"
                            value={code}
                        />
                    </Pressable>

                    {verify.isError ? (
                        <Text
                            accessibilityRole="alert"
                            className="mt-3.5 text-center text-label leading-[19px] text-auth-error-text"
                        >
                            {verificationErrorMessage(verify.error)}
                        </Text>
                    ) : null}
                    {isExpired && !verify.isError ? (
                        <Text
                            accessibilityRole="alert"
                            className="mt-3.5 text-center text-label leading-[19px] text-auth-error-text"
                        >
                            Request new instructions to continue.
                        </Text>
                    ) : null}
                    {resentMessage ? (
                        <View className="mt-4 rounded-xl bg-auth-success p-3">
                            <Text className="text-center text-label font-bold text-auth-success-text">
                                {resentMessage}
                            </Text>
                        </View>
                    ) : null}
                    {resendError ? (
                        <Text
                            accessibilityRole="alert"
                            className="mt-3.5 text-center text-label leading-[19px] text-auth-error-text"
                        >
                            {resendError}
                        </Text>
                    ) : null}

                    <View className="mt-[30px]">
                        <AuthButton
                            disabled={(
                                code.length !== 6 || isExpired || isLocked
                            )}
                            label="Verify"
                            loading={verify.isPending}
                            onPress={submitCode}
                        />
                    </View>

                    <Pressable
                        className="mt-[22px] self-center p-2"
                        disabled={resendIn > 0 || resend.isPending}
                        onPress={() => {
                            setResentMessage(null);
                            resend.mutate({ email });
                        }}
                    >
                        <Text
                            className={`text-[14px] font-bold ${
                                resendIn > 0
                                    ? "text-auth-placeholder"
                                    : "text-auth-green"
                            }`}
                        >
                            {resend.isPending
                                ? "Sending…"
                                : resendIn > 0
                                    ? `Resend available in ${formatTime(resendIn)}`
                                    : "Resend instructions"}
                        </Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
