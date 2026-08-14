import { router } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";

import { AuthButton } from "@/features/auth/components/AuthButton";
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
            className="flex-1 justify-center bg-auth-background p-6"
        >
            <View className="gap-7">
                <View className="self-start rounded-pill bg-auth-green-light px-3 py-[7px]">
                    <Text className="text-xs font-extrabold tracking-[0.8px] text-auth-green">
                        ALMOST DONE
                    </Text>
                </View>

                <View className="gap-3">
                    <Text className="text-display-large font-extrabold tracking-[-0.8px] text-auth-text">
                        How should we call you?
                    </Text>
                    <Text className="text-body-large text-auth-muted">
                        Add your name before discovering the available food
                        near you.
                    </Text>
                </View>

                <View className="gap-3">
                    <Text className="text-label font-bold tracking-[0.5px] text-auth-text">
                        FULL NAME
                    </Text>
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
                        className="min-h-14 rounded-control border border-auth-border bg-auth-card px-4 text-[17px] text-auth-text"
                        value={fullName}
                    />

                    {errorMessage ? (
                        <Text
                            accessibilityRole="alert"
                            className="text-[14px] leading-5 text-auth-error-text"
                        >
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
                    className="active:opacity-[0.72]"
                    disabled={completeProfile.isPending}
                    onPress={() => void logout()}
                >
                    <Text className="text-center text-[15px] font-bold text-auth-green">
                        Use another email address
                    </Text>
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}
