import {
    ActivityIndicator,
    Text,
    TouchableOpacity,
    type TouchableOpacityProps,
} from "react-native";

type AuthButtonProps = {
    label: string;
    loading?: boolean;
} & Pick<TouchableOpacityProps, "disabled" | "onPress">;

export function AuthButton({
    disabled = false,
    label,
    loading = false,
    onPress,
}: AuthButtonProps) {
    const isDisabled = disabled || loading;

    return (
        <TouchableOpacity
            activeOpacity={0.88}
            accessibilityRole="button"
            className={`min-h-14 items-center justify-center rounded-pill px-6 ${
                isDisabled
                    ? "bg-auth-disabled shadow-none elevation-none"
                    : "bg-auth-green shadow-auth-control elevation-auth-control"
            }`}
            disabled={isDisabled}
            onPress={onPress}
        >
            {loading ? (
                <ActivityIndicator className="text-white" />
            ) : (
                <Text className="text-button font-extrabold tracking-[0.1px] text-white">
                    {label}
                </Text>
            )}
        </TouchableOpacity>
    );
}
