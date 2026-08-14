import { StatusBar } from "expo-status-bar";
import {
    ActivityIndicator,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type OfferDetailStateProps = {
    actionLabel?: string;
    description: string;
    isLoading?: boolean;
    onAction?: () => void;
    onBack: () => void;
    title: string;
};

export function OfferDetailState({
    actionLabel,
    description,
    isLoading = false,
    onAction,
    onBack,
    title,
}: OfferDetailStateProps) {
    return (
        <SafeAreaView className="flex-1 bg-offer-background">
            <StatusBar style="dark" />

            <View className="items-start px-[18px] pt-2">
                <TouchableOpacity
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                    activeOpacity={0.75}
                    className="min-h-[42px] items-center justify-center rounded-pill border border-offer-border px-4"
                    onPress={onBack}
                >
                    <Text className="text-[14px] font-bold text-offer-deep-green">
                        Back
                    </Text>
                </TouchableOpacity>
            </View>

            <View className="flex-1 items-center justify-center px-7 pb-[72px]">
                {isLoading ? (
                    <ActivityIndicator
                        className="mb-[22px] text-offer-primary"
                        size="large"
                    />
                ) : null}
                <Text
                    accessibilityRole="header"
                    className="text-center text-[23px] font-extrabold text-offer-deep-green"
                >
                    {title}
                </Text>
                <Text className="mt-[9px] max-w-[420px] text-center text-[15px] leading-[22px] text-offer-muted-text">
                    {description}
                </Text>

                {actionLabel && onAction ? (
                    <TouchableOpacity
                        accessibilityRole="button"
                        activeOpacity={0.82}
                        className="mt-[22px] rounded-pill bg-offer-primary px-6 py-[13px]"
                        onPress={onAction}
                    >
                        <Text className="text-[14px] font-extrabold text-offer-card">
                            {actionLabel}
                        </Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        </SafeAreaView>
    );
}
