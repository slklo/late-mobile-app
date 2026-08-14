import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ImageBackground,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { requestEmailChallenge } from "@/features/auth/api/authApi";
import { AuthButton } from "@/features/auth/components/AuthButton";
import { useAuthFlowStore } from "@/features/auth/store/authFlowStore";
import { getApiErrorCode, getApiErrorMessage } from "@/shared/api/errors";

const HERO_IMAGE = require("../../../assets/auth/lateplate-auth-hero.png");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function WelcomeScreen() {
    const storedEmail = useAuthFlowStore((state) => state.email);
    const setStoredEmail = useAuthFlowStore((state) => state.setEmail);
    const setChallenge = useAuthFlowStore((state) => state.setChallenge);
    const [email, setEmail] = useState(storedEmail ?? "");
    const [isSheetOpen, setSheetOpen] = useState(Boolean(storedEmail));
    const [validationError, setValidationError] = useState<string | null>(
        null,
    );

    useEffect(() => {
        if (storedEmail) {
            setEmail(storedEmail);
            setSheetOpen(true);
        }
    }, [storedEmail]);

    const requestChallenge = useMutation({
        mutationFn: requestEmailChallenge,
        onSuccess: (challenge, variables) => {
            setChallenge(variables.email, challenge);
            setSheetOpen(false);
            router.push("/check-inbox");
        },
    });

    const submitEmail = () => {
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
            setValidationError("Please enter your email address.");
            return;
        }

        if (!EMAIL_PATTERN.test(normalizedEmail)) {
            setValidationError("Please enter a valid email address.");
            return;
        }

        setValidationError(null);
        setStoredEmail(normalizedEmail);
        requestChallenge.mutate({ email: normalizedEmail });
    };

    const requestError = requestChallenge.isError
        ? getApiErrorCode(requestChallenge.error) === (
            "EMAIL_CHALLENGE_RATE_LIMITED"
        )
            ? "Please wait a moment before requesting another email."
            : getApiErrorMessage(
                requestChallenge.error,
                "We could not send the sign-in email. Please try again.",
            )
        : null;

    return (
        <View className="flex-1 bg-auth-background">
            <ScrollView
                bounces={false}
                contentContainerClassName="flex-grow"
                showsVerticalScrollIndicator={false}
            >
                <ImageBackground
                    className="h-auth-hero bg-auth-green-dark"
                    resizeMode="cover"
                    source={HERO_IMAGE}
                >
                    <View className="absolute inset-0 bg-auth-hero-overlay" />
                    <SafeAreaView
                        className="flex-1 justify-between p-5"
                        edges={["top"]}
                    >
                        <View className="self-start flex-row items-center gap-2 rounded-pill border border-auth-glass-border bg-auth-glass px-3.5 py-2">
                            <Text className="text-[13px] text-auth-logo-leaf">
                                ●
                            </Text>
                            <Text className="text-[15px] font-extrabold tracking-[0.2px] text-white">
                                LatePlate
                            </Text>
                        </View>

                        <View className="self-end rounded-pill bg-auth-accent px-[13px] py-[7px]">
                            <Text className="text-[11px] font-black tracking-[0.8px] text-white">
                                FOOD RESCUE
                            </Text>
                        </View>
                    </SafeAreaView>
                </ImageBackground>

                <View className="flex-1 px-6 pt-7">
                    <Text className="text-display font-black tracking-[-0.8px] text-auth-text">
                        Rescue good food{"\n"}
                        <Text className="text-auth-green">near you</Text>
                    </Text>
                    <Text className="mt-3 text-body text-auth-muted">
                        Discover discounted surprise meals from restaurants,
                        cafés, and bakeries around you — and help fight food
                        waste.
                    </Text>

                    <View className="mt-[18px] flex-row flex-wrap gap-2">
                        {[
                            "Eco-friendly",
                            "Up to 70% off",
                            "Local spots",
                        ].map((label) => (
                            <View
                                className="flex-row items-center gap-1.5 rounded-pill bg-auth-green-light px-[11px] py-[7px]"
                                key={label}
                            >
                                <View className="size-1.5 rounded-pill bg-auth-green" />
                                <Text className="text-xs font-bold text-auth-green">
                                    {label}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <View className="mt-auto pb-6 pt-[30px]">
                        <AuthButton
                            label="Continue with Email"
                            onPress={() => setSheetOpen(true)}
                        />
                        <Text className="mt-4 text-center text-[11.5px] leading-[17px] text-auth-muted">
                            By continuing, you agree to our Terms of Service and
                            Privacy Policy.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <Modal
                animationType="slide"
                onRequestClose={() => setSheetOpen(false)}
                statusBarTranslucent
                transparent
                visible={isSheetOpen}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    className="flex-1 justify-end"
                >
                    <Pressable
                        accessibilityLabel="Close email form"
                        className="absolute inset-0 bg-auth-overlay"
                        onPress={() => setSheetOpen(false)}
                    />
                    <View className="rounded-t-sheet bg-auth-card px-6 pb-7 ios:pb-[38px]">
                        <View className="mb-6 mt-3 h-1 w-[42px] self-center rounded-pill bg-auth-border" />
                        <Text className="text-heading-sm font-black text-auth-text">
                            Continue with Email
                        </Text>
                        <Text className="mb-6 mt-[7px] text-[14px] leading-[21px] text-auth-muted">
                            We’ll send secure sign-in instructions to your inbox.
                        </Text>

                        <Text className="mb-[7px] text-label font-bold text-auth-text">
                            Email address
                        </Text>
                        <TextInput
                            autoCapitalize="none"
                            autoComplete="email"
                            autoCorrect={false}
                            autoFocus
                            editable={!requestChallenge.isPending}
                            keyboardType="email-address"
                            onChangeText={(value) => {
                                setEmail(value);
                                setValidationError(null);
                                requestChallenge.reset();
                            }}
                            onSubmitEditing={submitEmail}
                            placeholder="you@example.com"
                            placeholderClassName="text-auth-placeholder"
                            returnKeyType="send"
                            className={`min-h-[54px] rounded-input border-[1.5px] bg-auth-card px-4 text-button text-auth-text ${
                                validationError || requestError
                                    ? "border-auth-error-border"
                                    : "border-auth-border"
                            }`}
                            value={email}
                        />
                        {validationError || requestError ? (
                            <Text
                                accessibilityRole="alert"
                                className="mt-[7px] text-[13px] leading-[18px] text-auth-error-text"
                            >
                                {validationError ?? requestError}
                            </Text>
                        ) : null}

                        <View className="mt-[22px]">
                            <AuthButton
                                label="Send instructions"
                                loading={requestChallenge.isPending}
                                onPress={submitEmail}
                            />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
