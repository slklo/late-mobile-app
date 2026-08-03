import { SymbolView } from "expo-symbols";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
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
    offer: OfferDetailViewModel;
    onBack: () => void;
};

function FallbackIcon({ children }: { children: string }) {
    return <Text style={styles.fallbackIcon}>{children}</Text>;
}

export function OfferDetailView({ offer, onBack }: OfferDetailViewProps) {
    const insets = useSafeAreaInsets();
    const [isFavorite, setFavorite] = useState(false);

    return (
        <View style={styles.screen}>
            <StatusBar style="light" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
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
                </View>

                <View style={styles.contentCard}>
                    <View style={styles.titleRow}>
                        <View style={styles.titleContent}>
                            <Text style={styles.restaurantName}>
                                {offer.restaurantName}
                            </Text>
                            <Text style={styles.offerTitle}>
                                {offer.title}
                            </Text>
                        </View>

                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {offer.statusLabel}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.priceRow}>
                        <Text style={styles.discountedPrice}>
                            {offer.discountedPriceLabel}
                        </Text>
                        <Text style={styles.originalPrice}>
                            {offer.originalPriceLabel}
                        </Text>
                        {offer.savingsLabel ? (
                            <Text style={styles.savingsLabel}>
                                {offer.savingsLabel}
                            </Text>
                        ) : null}
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
                            <Text style={styles.availableText}>
                                {offer.quantityLabel}
                            </Text>
                        </View>
                    )}

                    <View style={styles.infoGrid}>
                        <View style={styles.infoCard}>
                            <SymbolView
                                fallback={<FallbackIcon>Time</FallbackIcon>}
                                name="clock"
                                size={20}
                                tintColor={offerColors.primary}
                                weight="semibold"
                            />
                            <Text style={styles.infoLabel}>Pickup</Text>
                            <Text style={styles.infoValue}>
                                {offer.pickupDateLabel}
                            </Text>
                            <Text style={styles.infoSecondary}>
                                {offer.pickupWindowLabel}
                            </Text>
                        </View>

                        <View style={styles.infoCard}>
                            <SymbolView
                                fallback={<FallbackIcon>Place</FallbackIcon>}
                                name="location.fill"
                                size={20}
                                tintColor={offerColors.primary}
                                weight="semibold"
                            />
                            <Text style={styles.infoLabel}>Location</Text>
                            <Text style={styles.infoValue}>
                                {offer.restaurantName}
                            </Text>
                            <Text style={styles.infoSecondary}>
                                {offer.restaurantAddress}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>What you get</Text>
                        <Text style={styles.bodyText}>
                            {offer.description}
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Offer details</Text>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Category</Text>
                            <Text style={styles.detailValue}>
                                {offer.categoryName}
                            </Text>
                        </View>
                        <View style={styles.detailDivider} />
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Quantity</Text>
                            <Text style={styles.detailValue}>
                                {offer.quantityLabel}
                            </Text>
                        </View>
                        <View style={styles.detailDivider} />
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Pickup window</Text>
                            <Text style={styles.detailValue}>
                                {offer.pickupWindowLabel}
                            </Text>
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
    availableText: {
        color: offerColors.mutedText,
        fontSize: 13,
        marginTop: 3,
    },
    availableTitle: {
        color: offerColors.primary,
        fontSize: 14,
        fontWeight: "800",
    },
    badge: {
        alignSelf: "flex-start",
        backgroundColor: offerColors.deepGreen,
        borderRadius: 999,
        paddingHorizontal: 11,
        paddingVertical: 6,
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
    contentCard: {
        backgroundColor: offerColors.background,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        marginTop: -28,
        paddingHorizontal: 20,
        paddingTop: 26,
        position: "relative",
    },
    detailDivider: {
        backgroundColor: offerColors.border,
        height: 1,
    },
    detailLabel: {
        color: offerColors.mutedText,
        fontSize: 14,
    },
    detailRow: {
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 13,
    },
    detailValue: {
        color: offerColors.deepGreen,
        flexShrink: 1,
        fontSize: 14,
        fontWeight: "700",
        marginLeft: 20,
        textAlign: "right",
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
    heroScrim: {
        backgroundColor: "rgba(0, 0, 0, 0.18)",
        height: 92,
        left: 0,
        position: "absolute",
        right: 0,
        top: 0,
    },
    infoCard: {
        backgroundColor: offerColors.card,
        borderColor: offerColors.border,
        borderRadius: 18,
        borderWidth: 1,
        flex: 1,
        minHeight: 154,
        padding: 15,
    },
    infoGrid: {
        flexDirection: "row",
        gap: 12,
        marginTop: 22,
    },
    infoLabel: {
        color: offerColors.mutedText,
        fontSize: 11,
        fontWeight: "700",
        marginTop: 12,
        textTransform: "uppercase",
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
    priceRow: {
        alignItems: "baseline",
        flexDirection: "row",
        gap: 10,
        marginTop: 14,
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
    titleContent: {
        flex: 1,
        paddingRight: 12,
    },
    titleRow: {
        alignItems: "flex-start",
        flexDirection: "row",
        justifyContent: "space-between",
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
