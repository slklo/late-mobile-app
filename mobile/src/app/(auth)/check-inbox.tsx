import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
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
import { authColors } from "@/features/auth/theme";
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
    const [now, setNow] = useState(Date.now());
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
        <SafeAreaView style={styles.screen}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.flex}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                >
                    <Pressable onPress={changeEmail} style={styles.backButton}>
                        <Text style={styles.backText}>‹ Change email</Text>
                    </Pressable>

                    <View style={styles.iconBox}>
                        <Text style={styles.icon}>✉</Text>
                    </View>
                    <Text style={styles.title}>Check your inbox</Text>
                    <Text style={styles.subtitle}>
                        We sent sign-in instructions to{" "}
                        <Text style={styles.email}>{maskEmail(email)}</Text>.
                        Open the link in the email, or enter the six-digit code
                        if your email contains one.
                    </Text>

                    <Text style={styles.expiryText}>
                        {isExpired
                            ? "These instructions have expired."
                            : `Instructions expire in ${formatTime(expiresIn)}.`}
                    </Text>

                    <Pressable
                        onPress={() => inputRef.current?.focus()}
                        style={styles.otpRow}
                    >
                        {Array.from({ length: 6 }, (_, index) => {
                            const digit = code[index] ?? "";
                            const isActive = index === code.length;

                            return (
                                <View
                                    key={index}
                                    style={[
                                        styles.otpCell,
                                        digit && styles.otpCellFilled,
                                        isActive && styles.otpCellActive,
                                        verify.isError && styles.otpCellError,
                                    ]}
                                >
                                    <Text style={styles.otpDigit}>{digit}</Text>
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
                            style={styles.hiddenInput}
                            textContentType="oneTimeCode"
                            value={code}
                        />
                    </Pressable>

                    {verify.isError ? (
                        <Text accessibilityRole="alert" style={styles.error}>
                            {verificationErrorMessage(verify.error)}
                        </Text>
                    ) : null}
                    {isExpired && !verify.isError ? (
                        <Text accessibilityRole="alert" style={styles.error}>
                            Request new instructions to continue.
                        </Text>
                    ) : null}
                    {resentMessage ? (
                        <View style={styles.successNotice}>
                            <Text style={styles.successText}>{resentMessage}</Text>
                        </View>
                    ) : null}
                    {resendError ? (
                        <Text accessibilityRole="alert" style={styles.error}>
                            {resendError}
                        </Text>
                    ) : null}

                    <View style={styles.verifyButton}>
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
                        disabled={resendIn > 0 || resend.isPending}
                        onPress={() => {
                            setResentMessage(null);
                            resend.mutate({ email });
                        }}
                        style={styles.linkButton}
                    >
                        <Text
                            style={[
                                styles.linkText,
                                resendIn > 0 && styles.linkTextDisabled,
                            ]}
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

const styles = StyleSheet.create({
    flex: { flex: 1 },
    screen: {
        backgroundColor: authColors.background,
        flex: 1,
    },
    content: {
        flexGrow: 1,
        padding: 24,
        paddingBottom: 40,
    },
    backButton: {
        alignSelf: "flex-start",
        paddingVertical: 6,
    },
    backText: {
        color: authColors.green,
        fontSize: 15,
        fontWeight: "700",
    },
    iconBox: {
        alignItems: "center",
        backgroundColor: authColors.greenLight,
        borderRadius: 20,
        height: 66,
        justifyContent: "center",
        marginTop: 32,
        width: 66,
    },
    icon: {
        color: authColors.green,
        fontSize: 31,
        fontWeight: "700",
    },
    title: {
        color: authColors.text,
        fontSize: 29,
        fontWeight: "900",
        letterSpacing: -0.5,
        marginTop: 22,
    },
    subtitle: {
        color: authColors.muted,
        fontSize: 15,
        lineHeight: 23,
        marginTop: 10,
    },
    email: {
        color: authColors.text,
        fontWeight: "800",
    },
    expiryText: {
        color: authColors.muted,
        fontSize: 13,
        marginTop: 12,
    },
    otpRow: {
        flexDirection: "row",
        gap: 5,
        justifyContent: "center",
        marginTop: 34,
        position: "relative",
    },
    otpCell: {
        alignItems: "center",
        backgroundColor: authColors.card,
        borderColor: authColors.border,
        borderRadius: 13,
        borderWidth: 1.5,
        height: 56,
        justifyContent: "center",
        width: 39,
    },
    otpCellFilled: {
        backgroundColor: authColors.greenLight,
        borderColor: authColors.green,
    },
    otpCellActive: {
        borderColor: authColors.green,
    },
    otpCellError: {
        borderColor: authColors.errorBorder,
    },
    otpDigit: {
        color: authColors.text,
        fontSize: 22,
        fontWeight: "800",
    },
    hiddenInput: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.01,
    },
    error: {
        color: authColors.errorText,
        fontSize: 13,
        lineHeight: 19,
        marginTop: 14,
        textAlign: "center",
    },
    successNotice: {
        backgroundColor: authColors.success,
        borderRadius: 12,
        marginTop: 16,
        padding: 12,
    },
    successText: {
        color: authColors.successText,
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
    },
    verifyButton: {
        marginTop: 30,
    },
    linkButton: {
        alignSelf: "center",
        marginTop: 22,
        padding: 8,
    },
    linkText: {
        color: authColors.green,
        fontSize: 14,
        fontWeight: "700",
    },
    linkTextDisabled: {
        color: authColors.placeholder,
    },
});
