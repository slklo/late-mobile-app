import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    type PressableProps,
} from "react-native";

import { authColors } from "../theme";

type AuthButtonProps = {
    label: string;
    loading?: boolean;
} & Pick<PressableProps, "disabled" | "onPress">;

export function AuthButton({
    disabled = false,
    label,
    loading = false,
    onPress,
}: AuthButtonProps) {
    const isDisabled = disabled || loading;

    return (
        <Pressable
            accessibilityRole="button"
            disabled={isDisabled}
            onPress={onPress}
            style={({ pressed }) => [
                styles.button,
                isDisabled && styles.disabled,
                pressed && !isDisabled && styles.pressed,
            ]}
        >
            {loading ? (
                <ActivityIndicator color="#FFFFFF" />
            ) : (
                <Text style={styles.label}>{label}</Text>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        alignItems: "center",
        backgroundColor: authColors.green,
        borderRadius: 999,
        justifyContent: "center",
        minHeight: 56,
        paddingHorizontal: 24,
        shadowColor: authColors.green,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 5,
    },
    label: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "800",
        letterSpacing: 0.1,
    },
    disabled: {
        backgroundColor: "#BFCDBD",
        elevation: 0,
        shadowOpacity: 0,
    },
    pressed: {
        opacity: 0.88,
        transform: [{ scale: 0.98 }],
    },
});
