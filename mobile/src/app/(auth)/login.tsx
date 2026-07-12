import { Link } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { useLoginMutation } from "@/features/auth/hooks/useLoginMutation";
import { getApiErrorMessage } from "@/shared/api/errors";

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const loginMutation = useLoginMutation();

    const errorMessage = loginMutation.isError
        ? getApiErrorMessage(loginMutation.error, "Login fehlgeschlagen")
        : null;

    function handleSubmit() {
        loginMutation.mutate({
            email: email.trim(),
            password,
        });
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.screen}
        >
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Einloggen</Text>
                    <Text style={styles.subtitle}>
                        Melde dich an, um deine LatePlate Angebote zu testen.
                    </Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.field}>
                        <Text style={styles.label}>E-Mail</Text>
                        <TextInput
                            autoCapitalize="none"
                            autoComplete="email"
                            keyboardType="email-address"
                            onChangeText={setEmail}
                            placeholder="name@example.com"
                            style={styles.input}
                            value={email}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Passwort</Text>
                        <TextInput
                            autoCapitalize="none"
                            onChangeText={setPassword}
                            placeholder="Mindestens 8 Zeichen"
                            secureTextEntry
                            style={styles.input}
                            value={password}
                        />
                    </View>

                    {errorMessage ? (
                        <Text style={styles.error}>{errorMessage}</Text>
                    ) : null}

                    <Pressable
                        disabled={loginMutation.isPending}
                        onPress={handleSubmit}
                        style={({ pressed }) => [
                            styles.primaryButton,
                            pressed && styles.pressed,
                            loginMutation.isPending && styles.disabledButton,
                        ]}
                    >
                        {loginMutation.isPending ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Einloggen</Text>
                        )}
                    </Pressable>

                    <Link href="./register" style={styles.link}>
                        Noch keinen Account? Registrieren
                    </Link>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#f7f7f8",
    },
    content: {
        flexGrow: 1,
        justifyContent: "center",
        padding: 24,
    },
    header: {
        marginBottom: 28,
    },
    title: {
        color: "#111827",
        fontSize: 32,
        fontWeight: "700",
    },
    subtitle: {
        color: "#6b7280",
        fontSize: 16,
        lineHeight: 23,
        marginTop: 8,
    },
    form: {
        gap: 16,
    },
    field: {
        gap: 8,
    },
    label: {
        color: "#374151",
        fontSize: 14,
        fontWeight: "600",
    },
    input: {
        backgroundColor: "#fff",
        borderColor: "#d1d5db",
        borderRadius: 8,
        borderWidth: 1,
        color: "#111827",
        fontSize: 16,
        minHeight: 48,
        paddingHorizontal: 14,
    },
    error: {
        color: "#b91c1c",
        fontSize: 14,
        lineHeight: 20,
    },
    primaryButton: {
        alignItems: "center",
        backgroundColor: "#111827",
        borderRadius: 8,
        justifyContent: "center",
        minHeight: 50,
        paddingHorizontal: 16,
    },
    disabledButton: {
        opacity: 0.7,
    },
    pressed: {
        opacity: 0.85,
    },
    primaryButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    link: {
        color: "#2563eb",
        fontSize: 15,
        fontWeight: "600",
        marginTop: 4,
        textAlign: "center",
    },
});
