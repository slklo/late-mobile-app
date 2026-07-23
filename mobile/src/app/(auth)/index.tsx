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
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { requestEmailChallenge } from "@/features/auth/api/authApi";
import { AuthButton } from "@/features/auth/components/AuthButton";
import { useAuthFlowStore } from "@/features/auth/store/authFlowStore";
import { authColors } from "@/features/auth/theme";
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
        <View style={styles.screen}>
            <ScrollView
                bounces={false}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <ImageBackground
                    resizeMode="cover"
                    source={HERO_IMAGE}
                    style={styles.hero}
                >
                    <View style={styles.heroShade} />
                    <SafeAreaView edges={["top"]} style={styles.heroSafeArea}>
                        <View style={styles.logoChip}>
                            <Text style={styles.logoLeaf}>●</Text>
                            <Text style={styles.logoText}>LatePlate</Text>
                        </View>

                        <View style={styles.rescueBadge}>
                            <Text style={styles.rescueBadgeText}>FOOD RESCUE</Text>
                        </View>
                    </SafeAreaView>
                </ImageBackground>

                <View style={styles.content}>
                    <Text style={styles.title}>
                        Rescue good food{"\n"}
                        <Text style={styles.titleAccent}>near you</Text>
                    </Text>
                    <Text style={styles.subtitle}>
                        Discover discounted surprise meals from restaurants,
                        cafés, and bakeries around you — and help fight food
                        waste.
                    </Text>

                    <View style={styles.trustRow}>
                        {[
                            "Eco-friendly",
                            "Up to 70% off",
                            "Local spots",
                        ].map((label) => (
                            <View key={label} style={styles.trustChip}>
                                <View style={styles.trustDot} />
                                <Text style={styles.trustText}>{label}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.actionArea}>
                        <AuthButton
                            label="Continue with Email"
                            onPress={() => setSheetOpen(true)}
                        />
                        <Text style={styles.legal}>
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
                    style={styles.modalRoot}
                >
                    <Pressable
                        accessibilityLabel="Close email form"
                        onPress={() => setSheetOpen(false)}
                        style={styles.overlay}
                    />
                    <View style={styles.sheet}>
                        <View style={styles.handle} />
                        <Text style={styles.sheetTitle}>Continue with Email</Text>
                        <Text style={styles.sheetSubtitle}>
                            We’ll send secure sign-in instructions to your inbox.
                        </Text>

                        <Text style={styles.inputLabel}>Email address</Text>
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
                            placeholderTextColor={authColors.placeholder}
                            returnKeyType="send"
                            style={[
                                styles.input,
                                (validationError || requestError) && (
                                    styles.inputError
                                ),
                            ]}
                            value={email}
                        />
                        {validationError || requestError ? (
                            <Text accessibilityRole="alert" style={styles.error}>
                                {validationError ?? requestError}
                            </Text>
                        ) : null}

                        <View style={styles.sheetButton}>
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

const styles = StyleSheet.create({
    screen: {
        backgroundColor: authColors.background,
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    hero: {
        backgroundColor: authColors.greenDark,
        height: 310,
    },
    heroShade: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(18, 48, 16, 0.46)",
    },
    heroSafeArea: {
        flex: 1,
        justifyContent: "space-between",
        padding: 20,
    },
    logoChip: {
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: "rgba(255,255,255,0.18)",
        borderColor: "rgba(255,255,255,0.30)",
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    logoLeaf: {
        color: "#BCE8A9",
        fontSize: 13,
    },
    logoText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "800",
        letterSpacing: 0.2,
    },
    rescueBadge: {
        alignSelf: "flex-end",
        backgroundColor: authColors.accent,
        borderRadius: 999,
        paddingHorizontal: 13,
        paddingVertical: 7,
    },
    rescueBadgeText: {
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: "900",
        letterSpacing: 0.8,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 28,
    },
    title: {
        color: authColors.text,
        fontSize: 32,
        fontWeight: "900",
        letterSpacing: -0.8,
        lineHeight: 38,
    },
    titleAccent: {
        color: authColors.green,
    },
    subtitle: {
        color: authColors.muted,
        fontSize: 15,
        lineHeight: 23,
        marginTop: 12,
    },
    trustRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 18,
    },
    trustChip: {
        alignItems: "center",
        backgroundColor: authColors.greenLight,
        borderRadius: 999,
        flexDirection: "row",
        gap: 6,
        paddingHorizontal: 11,
        paddingVertical: 7,
    },
    trustDot: {
        backgroundColor: authColors.green,
        borderRadius: 999,
        height: 6,
        width: 6,
    },
    trustText: {
        color: authColors.green,
        fontSize: 12,
        fontWeight: "700",
    },
    actionArea: {
        marginTop: "auto",
        paddingBottom: 24,
        paddingTop: 30,
    },
    legal: {
        color: authColors.muted,
        fontSize: 11.5,
        lineHeight: 17,
        marginTop: 16,
        textAlign: "center",
    },
    modalRoot: {
        flex: 1,
        justifyContent: "flex-end",
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: authColors.overlay,
    },
    sheet: {
        backgroundColor: authColors.card,
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        paddingBottom: Platform.OS === "ios" ? 38 : 28,
        paddingHorizontal: 24,
    },
    handle: {
        alignSelf: "center",
        backgroundColor: authColors.border,
        borderRadius: 999,
        height: 4,
        marginBottom: 24,
        marginTop: 12,
        width: 42,
    },
    sheetTitle: {
        color: authColors.text,
        fontSize: 22,
        fontWeight: "900",
    },
    sheetSubtitle: {
        color: authColors.muted,
        fontSize: 14,
        lineHeight: 21,
        marginBottom: 24,
        marginTop: 7,
    },
    inputLabel: {
        color: authColors.text,
        fontSize: 13,
        fontWeight: "700",
        marginBottom: 7,
    },
    input: {
        backgroundColor: authColors.card,
        borderColor: authColors.border,
        borderRadius: 14,
        borderWidth: 1.5,
        color: authColors.text,
        fontSize: 16,
        minHeight: 54,
        paddingHorizontal: 16,
    },
    inputError: {
        borderColor: authColors.errorBorder,
    },
    error: {
        color: authColors.errorText,
        fontSize: 13,
        lineHeight: 18,
        marginTop: 7,
    },
    sheetButton: {
        marginTop: 22,
    },
});
