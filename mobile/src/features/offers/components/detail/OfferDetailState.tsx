import { StatusBar } from "expo-status-bar";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { offerColors } from "../../theme";

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
        <SafeAreaView style={styles.safeArea}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <TouchableOpacity
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                    activeOpacity={0.75}
                    onPress={onBack}
                    style={styles.backButton}
                >
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {isLoading ? (
                    <ActivityIndicator
                        color={offerColors.primary}
                        size="large"
                        style={styles.indicator}
                    />
                ) : null}
                <Text accessibilityRole="header" style={styles.title}>
                    {title}
                </Text>
                <Text style={styles.description}>{description}</Text>

                {actionLabel && onAction ? (
                    <TouchableOpacity
                        accessibilityRole="button"
                        activeOpacity={0.82}
                        onPress={onAction}
                        style={styles.actionButton}
                    >
                        <Text style={styles.actionButtonText}>
                            {actionLabel}
                        </Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    actionButton: {
        backgroundColor: offerColors.primary,
        borderRadius: 999,
        marginTop: 22,
        paddingHorizontal: 24,
        paddingVertical: 13,
    },
    actionButtonText: {
        color: offerColors.card,
        fontSize: 14,
        fontWeight: "800",
    },
    backButton: {
        alignItems: "center",
        borderColor: offerColors.border,
        borderRadius: 999,
        borderWidth: 1,
        justifyContent: "center",
        minHeight: 42,
        paddingHorizontal: 16,
    },
    backButtonText: {
        color: offerColors.deepGreen,
        fontSize: 14,
        fontWeight: "700",
    },
    content: {
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
        paddingBottom: 72,
        paddingHorizontal: 28,
    },
    description: {
        color: offerColors.mutedText,
        fontSize: 15,
        lineHeight: 22,
        marginTop: 9,
        maxWidth: 420,
        textAlign: "center",
    },
    header: {
        alignItems: "flex-start",
        paddingHorizontal: 18,
        paddingTop: 8,
    },
    indicator: {
        marginBottom: 22,
    },
    safeArea: {
        backgroundColor: offerColors.background,
        flex: 1,
    },
    title: {
        color: offerColors.deepGreen,
        fontSize: 23,
        fontWeight: "800",
        textAlign: "center",
    },
});
