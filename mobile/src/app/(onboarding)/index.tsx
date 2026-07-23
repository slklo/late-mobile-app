import { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { useCompleteProfile } from "@/features/auth/hooks/useCompleteProfile";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { useAuthStore } from "@/features/auth/store/authStore";
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
            setValidationError("Bitte gib deinen Namen ein.");
            return;
        }

        setValidationError(null);
        completeProfile.mutate({ full_name: normalizedName });
    };

    const requestError = completeProfile.isError
        ? getApiErrorMessage(
            completeProfile.error,
            "Dein Profil konnte nicht gespeichert werden.",
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
                    <Text style={styles.badgeText}>FAST GESCHAFFT</Text>
                </View>

                <View style={styles.heading}>
                    <Text style={styles.title}>Wie dürfen wir dich nennen?</Text>
                    <Text style={styles.subtitle}>
                        Ergänze deinen Namen, bevor du die verfügbaren Angebote
                        entdeckst.
                    </Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Vollständiger Name</Text>
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
                        placeholder="Zum Beispiel Alex Morgan"
                        returnKeyType="done"
                        style={styles.input}
                        value={fullName}
                    />

                    {errorMessage ? (
                        <Text accessibilityRole="alert" style={styles.error}>
                            {errorMessage}
                        </Text>
                    ) : null}

                    <Pressable
                        disabled={completeProfile.isPending}
                        onPress={submitProfile}
                        style={({ pressed }) => [
                            styles.primaryButton,
                            pressed && styles.pressed,
                            completeProfile.isPending && styles.disabled,
                        ]}
                    >
                        {completeProfile.isPending ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.primaryButtonText}>
                                Angebote entdecken
                            </Text>
                        )}
                    </Pressable>
                </View>

                <Pressable
                    disabled={completeProfile.isPending}
                    onPress={() => void logout()}
                    style={({ pressed }) => pressed && styles.pressed}
                >
                    <Text style={styles.logoutText}>
                        Andere E-Mail-Adresse verwenden
                    </Text>
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}


const styles = StyleSheet.create({
    screen: {
        backgroundColor: "#f7f3ec",
        flex: 1,
        justifyContent: "center",
        padding: 24,
    },
    content: {
        gap: 28,
    },
    badge: {
        alignSelf: "flex-start",
        backgroundColor: "#dff3e4",
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    badgeText: {
        color: "#0b5d4e",
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 0.8,
    },
    heading: {
        gap: 12,
    },
    title: {
        color: "#1f2a24",
        fontSize: 34,
        fontWeight: "800",
        letterSpacing: -0.8,
        lineHeight: 40,
    },
    subtitle: {
        color: "#68716c",
        fontSize: 17,
        lineHeight: 25,
    },
    form: {
        gap: 12,
    },
    label: {
        color: "#34443c",
        fontSize: 13,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: "#ffffff",
        borderColor: "#d8ddd9",
        borderRadius: 16,
        borderWidth: 1,
        color: "#1f2a24",
        fontSize: 17,
        minHeight: 56,
        paddingHorizontal: 16,
    },
    error: {
        color: "#b42318",
        fontSize: 14,
        lineHeight: 20,
    },
    primaryButton: {
        alignItems: "center",
        backgroundColor: "#0a6b55",
        borderRadius: 16,
        justifyContent: "center",
        minHeight: 56,
        paddingHorizontal: 18,
    },
    primaryButtonText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "800",
    },
    logoutText: {
        color: "#0a6b55",
        fontSize: 15,
        fontWeight: "700",
        textAlign: "center",
    },
    pressed: {
        opacity: 0.72,
    },
    disabled: {
        opacity: 0.6,
    },
});
