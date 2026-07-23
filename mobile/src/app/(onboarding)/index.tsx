import { router } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { AuthButton } from "@/features/auth/components/AuthButton";
import { useCompleteProfile } from "@/features/auth/hooks/useCompleteProfile";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { useAuthStore } from "@/features/auth/store/authStore";
import { authColors } from "@/features/auth/theme";
import { getApiErrorMessage } from "@/shared/api/errors";


export default function CompleteProfileScreen() {
    const user = useAuthStore((state) => state.user);
    const completeProfile = useCompleteProfile();
    const logout = useLogout();
    const [fullName, setFullName] = useState(user?.full_name ?? "");
    const [validationError, setValidationError] = useState<string | null>(
        null,
    );

    const submitProfile = () => {
        const normalizedName = fullName.trim();

        if (!normalizedName) {
            setValidationError("Please enter your name.");
            return;
        }

        setValidationError(null);
        completeProfile.mutate(
            { full_name: normalizedName },
            {
                onSuccess: () => router.replace("/auth-success"),
            },
        );
    };

    const requestError = completeProfile.isError
        ? getApiErrorMessage(
            completeProfile.error,
            "Your profile could not be saved.",
        )
        : null;
    const errorMessage = validationError ?? requestError;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.screen}
        >
            <View style={styles.content}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>ALMOST DONE</Text>
                </View>

                <View style={styles.heading}>
                    <Text style={styles.title}>How should we call you?</Text>
                    <Text style={styles.subtitle}>
                        Add your name before discovering the available food
                        near you.
                    </Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>FULL NAME</Text>
                    <TextInput
                        autoCapitalize="words"
                        autoComplete="name"
                        editable={!completeProfile.isPending}
                        maxLength={150}
                        onChangeText={(value) => {
                            setFullName(value);
                            setValidationError(null);
                        }}
                        onSubmitEditing={submitProfile}
                        placeholder="For example Alex Morgan"
                        returnKeyType="done"
                        style={styles.input}
                        value={fullName}
                    />

                    {errorMessage ? (
                        <Text accessibilityRole="alert" style={styles.error}>
                            {errorMessage}
                        </Text>
                    ) : null}

                    <AuthButton
                        disabled={completeProfile.isPending}
                        label="Complete profile"
                        loading={completeProfile.isPending}
                        onPress={submitProfile}
                    />
                </View>

                <Pressable
                    disabled={completeProfile.isPending}
                    onPress={() => void logout()}
                    style={({ pressed }) => pressed && styles.pressed}
                >
                    <Text style={styles.logoutText}>
                        Use another email address
                    </Text>
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}


const styles = StyleSheet.create({
    screen: {
        backgroundColor: authColors.background,
        flex: 1,
        justifyContent: "center",
        padding: 24,
    },
    content: {
        gap: 28,
    },
    badge: {
        alignSelf: "flex-start",
        backgroundColor: authColors.greenLight,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    badgeText: {
        color: authColors.green,
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 0.8,
    },
    heading: {
        gap: 12,
    },
    title: {
        color: authColors.text,
        fontSize: 34,
        fontWeight: "800",
        letterSpacing: -0.8,
        lineHeight: 40,
    },
    subtitle: {
        color: authColors.muted,
        fontSize: 17,
        lineHeight: 25,
    },
    form: {
        gap: 12,
    },
    label: {
        color: authColors.text,
        fontSize: 13,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: authColors.card,
        borderColor: authColors.border,
        borderRadius: 16,
        borderWidth: 1,
        color: authColors.text,
        fontSize: 17,
        minHeight: 56,
        paddingHorizontal: 16,
    },
    error: {
        color: authColors.errorText,
        fontSize: 14,
        lineHeight: 20,
    },
    logoutText: {
        color: authColors.green,
        fontSize: 15,
        fontWeight: "700",
        textAlign: "center",
    },
    pressed: {
        opacity: 0.72,
    },
});
