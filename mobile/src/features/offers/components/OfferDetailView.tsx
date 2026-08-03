import { SymbolView } from "expo-symbols";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { offerColors } from "../theme";
import type { OfferDetailViewModel } from "../types/offerDetail.types";
import { OfferImage } from "./OfferImage";

type OfferDetailViewProps = {
    isRefetching: boolean;
    offer: OfferDetailViewModel;
    onBack: () => void;
    onRefresh: () => void;
};

function FallbackIcon({
    children,
    dark = false,
}: {
    children: string;
    dark?: boolean;
}) {
    return (
        <Text
            style={[
                styles.fallbackIcon,
                dark && styles.fallbackIconDark,
            ]}
        >
            {children}
        </Text>
    );
}

function getStatusBadgeColor(statusLabel: string): string {
    if (statusLabel === "Expired") {
        return offerColors.expired;
    }

    if (statusLabel === "Sold out") {
        return offerColors.soldOut;
    }

    if (statusLabel === "Unavailable") {
        return offerColors.urgent;
    }

    return offerColors.deepGreen;
}

export function OfferDetailView({
    isRefetching,
    offer,
    onBack,
    onRefresh,
}: OfferDetailViewProps) {
    const insets = useSafeAreaInsets();
    const [isFavorite, setFavorite] = useState(false);

    return (
        <View style={styles.screen}>
            <StatusBar style="light" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={(
                    <RefreshControl
                        onRefresh={onRefresh}
                        refreshing={isRefetching}
                        tintColor={offerColors.primary}
                    />
                )}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.hero}>
                    <OfferImage
                        height={330}
                        imageUrl={offer.imageUrl}
                        offerTitle={offer.title}
                        placeholderLabel={offer.imagePlaceholderLabel}
                    />
                    <View pointerEvents="none" style={styles.heroScrim} />

                    <View
                        style={[
                            styles.heroActions,
                            { top: insets.top + 10 },
                        ]}
                    >
                        <TouchableOpacity
                            accessibilityLabel="Go back"
                            accessibilityRole="button"
                            activeOpacity={0.76}
                            onPress={onBack}
                            style={styles.roundButton}
                        >
                            <SymbolView
                                fallback={<FallbackIcon>Back</FallbackIcon>}
                                name="chevron.left"
                                size={19}
                                tintColor="#FFFFFF"
                                weight="bold"
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            accessibilityLabel={
                                isFavorite
                                    ? "Remove offer from favorites"
                                    : "Add offer to favorites"
                            }
                            accessibilityRole="button"
                            accessibilityState={{ selected: isFavorite }}
                            activeOpacity={0.76}
                            onPress={() => setFavorite((current) => !current)}
                            style={styles.roundButton}
                        >
                            <SymbolView
                                fallback={(
                                    <FallbackIcon>
                                        {isFavorite ? "Liked" : "Like"}
                                    </FallbackIcon>
                                )}
                                name={isFavorite ? "heart.fill" : "heart"}
                                size={20}
                                tintColor={
                                    isFavorite
                                        ? offerColors.urgent
                                        : "#FFFFFF"
                                }
                                weight="semibold"
                            />
                        </TouchableOpacity>
                    </View>

                    <View
                        style={[
                            styles.heroBadge,
                            {
                                backgroundColor: getStatusBadgeColor(
                                    offer.statusLabel,
                                ),
                            },
                        ]}
                    >
                        <Text style={styles.badgeText}>
                            {offer.statusLabel}
                        </Text>
                    </View>
                </View>

                <View style={styles.contentCard}>
                    <Text style={styles.restaurantName}>
                        {offer.restaurantName}
                    </Text>
                    <Text style={styles.offerTitle}>{offer.title}</Text>
                    <View style={styles.categoryChip}>
                        <Text style={styles.categoryText}>
                            {offer.categoryName}
                        </Text>
                    </View>

                    {!offer.isAvailable ? (
                        <View style={styles.unavailableBanner}>
                            <Text style={styles.unavailableTitle}>
                                Offer unavailable
                            </Text>
                            <Text style={styles.unavailableText}>
                                {offer.unavailableReason}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.availableBanner}>
                            <Text style={styles.availableTitle}>
                                Available today
                            </Text>
                        </View>
                    )}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>What you get</Text>
                        <Text style={styles.bodyText}>
                            {offer.description}
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            Pickup details
                        </Text>
                        <View style={styles.detailsCard}>
                            <View style={styles.infoRow}>
                                <View style={styles.infoIcon}>
                                    <SymbolView
                                        fallback={(
                                            <FallbackIcon dark>Time</FallbackIcon>
                                        )}
                                        name="clock"
                                        size={19}
                                        tintColor={offerColors.primary}
                                        weight="semibold"
                                    />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>
                                        Pickup date and time
                                    </Text>
                                    <Text style={styles.infoValue}>
                                        {offer.pickupDateLabel}
                                    </Text>
                                    <Text style={styles.infoSecondary}>
                                        {offer.pickupWindowLabel}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.infoDivider} />

                            <View style={styles.infoRow}>
                                <View style={styles.infoIcon}>
                                    <SymbolView
                                        fallback={(
                                            <FallbackIcon dark>Place</FallbackIcon>
                                        )}
                                        name="location.fill"
                                        size={19}
                                        tintColor={offerColors.primary}
                                        weight="semibold"
                                    />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>
                                        Restaurant address
                                    </Text>
                                    <Text style={styles.infoValue}>
                                        {offer.restaurantAddress}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.infoDivider} />

                            <View style={styles.infoRow}>
                                <View style={styles.infoIcon}>
                                    <SymbolView
                                        fallback={(
                                            <FallbackIcon dark>Qty</FallbackIcon>
                                        )}
                                        name="shippingbox.fill"
                                        size={19}
                                        tintColor={offerColors.primary}
                                        weight="semibold"
                                    />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>
                                        Remaining quantity
                                    </Text>
                                    <Text style={styles.infoValue}>
                                        {offer.quantityLabel}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={styles.priceSection}>
                        <View>
                            <Text style={styles.priceLabel}>Original price</Text>
                            <Text style={styles.originalPrice}>
                                {offer.originalPriceLabel}
                            </Text>
                        </View>

                        <View style={styles.currentPriceContainer}>
                            <Text style={styles.priceLabel}>Today&apos;s price</Text>
                            <Text style={styles.discountedPrice}>
                                {offer.discountedPriceLabel}
                            </Text>
                            {offer.savingsLabel ? (
                                <Text style={styles.savingsLabel}>
                                    {offer.savingsLabel}
                                </Text>
                            ) : null}
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    availableBanner: {
        backgroundColor: "#E6F2E3",
        borderColor: "#CADFC5",
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 22,
        padding: 15,
    },
    availableTitle: {
        color: offerColors.primary,
        fontSize: 14,
        fontWeight: "800",
    },
    badgeText: {
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: "800",
    },
    bodyText: {
        color: "#53604E",
        fontSize: 15,
        lineHeight: 23,
    },
    categoryChip: {
        alignSelf: "flex-start",
        backgroundColor: offerColors.secondary,
        borderColor: "#D8D3C7",
        borderRadius: 999,
        borderWidth: 1,
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    categoryText: {
        color: offerColors.primary,
        fontSize: 12,
        fontWeight: "700",
    },
    contentCard: {
        backgroundColor: offerColors.background,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        marginTop: -28,
        paddingHorizontal: 20,
        paddingTop: 26,
        position: "relative",
    },
    currentPriceContainer: {
        alignItems: "flex-end",
    },
    detailsCard: {
        backgroundColor: offerColors.card,
        borderColor: offerColors.border,
        borderRadius: 20,
        borderWidth: 1,
        overflow: "hidden",
        paddingHorizontal: 16,
    },
    discountedPrice: {
        color: offerColors.deepGreen,
        fontSize: 27,
        fontWeight: "900",
    },
    fallbackIcon: {
        color: "#FFFFFF",
        fontSize: 10,
        fontWeight: "800",
    },
    fallbackIconDark: {
        color: offerColors.primary,
    },
    hero: {
        backgroundColor: offerColors.secondary,
        position: "relative",
    },
    heroActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        left: 16,
        position: "absolute",
        right: 16,
    },
    heroBadge: {
        borderRadius: 999,
        bottom: 46,
        paddingHorizontal: 12,
        paddingVertical: 7,
        position: "absolute",
        right: 18,
    },
    heroScrim: {
        backgroundColor: "rgba(0, 0, 0, 0.18)",
        height: 92,
        left: 0,
        position: "absolute",
        right: 0,
        top: 0,
    },
    infoContent: {
        flex: 1,
    },
    infoDivider: {
        backgroundColor: offerColors.border,
        height: 1,
        marginLeft: 54,
    },
    infoIcon: {
        alignItems: "center",
        backgroundColor: offerColors.secondary,
        borderRadius: 999,
        height: 38,
        justifyContent: "center",
        width: 38,
    },
    infoLabel: {
        color: offerColors.mutedText,
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    infoRow: {
        alignItems: "center",
        flexDirection: "row",
        gap: 14,
        paddingVertical: 16,
    },
    infoSecondary: {
        color: offerColors.mutedText,
        fontSize: 12,
        lineHeight: 17,
        marginTop: 3,
    },
    infoValue: {
        color: offerColors.deepGreen,
        fontSize: 14,
        fontWeight: "800",
        lineHeight: 19,
        marginTop: 4,
    },
    offerTitle: {
        color: "#1C2B1A",
        fontSize: 26,
        fontWeight: "900",
        letterSpacing: -0.5,
        lineHeight: 31,
        marginTop: 5,
    },
    originalPrice: {
        color: "#99A396",
        fontSize: 15,
        textDecorationLine: "line-through",
    },
    priceLabel: {
        color: offerColors.mutedText,
        fontSize: 11,
        fontWeight: "700",
        marginBottom: 5,
        textTransform: "uppercase",
    },
    priceSection: {
        alignItems: "flex-end",
        backgroundColor: offerColors.card,
        borderColor: offerColors.border,
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 28,
        padding: 18,
    },
    restaurantName: {
        color: offerColors.primary,
        fontSize: 14,
        fontWeight: "800",
        textTransform: "uppercase",
    },
    roundButton: {
        alignItems: "center",
        backgroundColor: "rgba(18, 31, 17, 0.68)",
        borderColor: "rgba(255, 255, 255, 0.26)",
        borderRadius: 999,
        borderWidth: 1,
        height: 44,
        justifyContent: "center",
        width: 44,
    },
    savingsLabel: {
        color: offerColors.primary,
        fontSize: 12,
        fontWeight: "800",
    },
    screen: {
        backgroundColor: offerColors.background,
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 42,
    },
    section: {
        marginTop: 28,
    },
    sectionTitle: {
        color: "#1C2B1A",
        fontSize: 19,
        fontWeight: "900",
        marginBottom: 10,
    },
    unavailableBanner: {
        backgroundColor: "#F2E8E4",
        borderColor: "#E1C9C0",
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 22,
        padding: 15,
    },
    unavailableText: {
        color: "#79645D",
        fontSize: 13,
        marginTop: 3,
    },
    unavailableTitle: {
        color: "#774737",
        fontSize: 14,
        fontWeight: "800",
    },
});
