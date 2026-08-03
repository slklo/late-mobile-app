import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    type DimensionValue,
    type StyleProp,
    type ViewStyle,
} from "react-native";

import { offerColors } from "../theme";
import type {
    OfferBadgeType,
    OfferCardViewModel,
} from "../types/offerCard.types";
import { OfferImage } from "./OfferImage";

type OfferCardProps = {
    offer: OfferCardViewModel;
    onPress?: () => void;
    width?: DimensionValue;
};

const badgeStyles: Record<OfferBadgeType, StyleProp<ViewStyle>> = {
    discount: { backgroundColor: offerColors.discount },
    expired: { backgroundColor: offerColors.expired },
    new: { backgroundColor: offerColors.deepGreen },
    sold_out: { backgroundColor: offerColors.soldOut },
    urgent: { backgroundColor: offerColors.urgent },
};

function FallbackIcon({ children }: { children: string }) {
    return <Text style={styles.fallbackIcon}>{children}</Text>;
}

export function OfferCard({
    offer,
    onPress,
    width = "100%",
}: OfferCardProps) {
    const [isFavorite, setFavorite] = useState(false);

    return (
        <View style={[styles.shadowContainer, { width }]}>
            <Pressable
                accessibilityLabel={`View ${offer.offerTitle} from ${offer.restaurantName}`}
                accessibilityRole={onPress ? "button" : undefined}
                disabled={!onPress}
                onPress={onPress}
                style={({ pressed }) => [
                    styles.card,
                    pressed && styles.cardPressed,
                ]}
            >
                <View style={styles.imageArea}>
                    <OfferImage
                        height={156}
                        imageUrl={offer.imageUrl}
                        offerTitle={offer.offerTitle}
                        placeholderLabel={offer.imagePlaceholderLabel}
                    />
                    <View pointerEvents="none" style={styles.imageScrim} />

                    {offer.badge ? (
                        <View
                            style={[
                                styles.badge,
                                badgeStyles[offer.badge.type],
                            ]}
                        >
                            <Text style={styles.badgeText}>
                                {offer.badge.label}
                            </Text>
                        </View>
                    ) : null}

                    <TouchableOpacity
                        accessibilityLabel={
                            isFavorite
                                ? `Remove ${offer.offerTitle} from favorites`
                                : `Add ${offer.offerTitle} to favorites`
                        }
                        accessibilityRole="button"
                        accessibilityState={{ selected: isFavorite }}
                        activeOpacity={0.78}
                        onPress={(event) => {
                            event.stopPropagation();
                            setFavorite((current) => !current);
                        }}
                        style={styles.favoriteButton}
                    >
                        <SymbolView
                            fallback={(
                                <FallbackIcon>
                                    {isFavorite ? "♥" : "♡"}
                                </FallbackIcon>
                            )}
                            name={isFavorite ? "heart.fill" : "heart"}
                            size={17}
                            tintColor={
                                isFavorite ? offerColors.urgent : "#FFFFFF"
                            }
                            weight="semibold"
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <Text numberOfLines={1} style={styles.restaurantName}>
                        {offer.restaurantName}
                    </Text>
                    <Text numberOfLines={1} style={styles.offerTitle}>
                        {offer.offerTitle}
                    </Text>
                    <Text numberOfLines={1} style={styles.subtitle}>
                        {offer.subtitle}
                    </Text>

                    <View style={styles.metadataRow}>
                        <View style={styles.metadataChip}>
                            <SymbolView
                                fallback={<FallbackIcon>◷</FallbackIcon>}
                                name="clock"
                                size={11}
                                tintColor={offerColors.primary}
                                weight="medium"
                            />
                            <Text numberOfLines={1} style={styles.metadataText}>
                                {offer.pickupWindowLabel}
                            </Text>
                        </View>

                        {offer.distanceLabel ? (
                            <View style={styles.metadataChip}>
                                <SymbolView
                                    fallback={<FallbackIcon>●</FallbackIcon>}
                                    name="location.fill"
                                    size={10}
                                    tintColor={offerColors.primary}
                                    weight="medium"
                                />
                                <Text
                                    numberOfLines={1}
                                    style={styles.metadataText}
                                >
                                    {offer.distanceLabel}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    <View style={styles.priceRow}>
                        <Text style={styles.originalPrice}>
                            {offer.originalPriceLabel}
                        </Text>
                        <Text style={styles.discountedPrice}>
                            {offer.discountedPriceLabel}
                        </Text>
                    </View>
                </View>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        borderRadius: 999,
        left: 12,
        paddingHorizontal: 10,
        paddingVertical: 5,
        position: "absolute",
        top: 12,
    },
    badgeText: {
        color: "#FFFFFF",
        fontSize: 10.5,
        fontWeight: "800",
        letterSpacing: 0.2,
    },
    card: {
        backgroundColor: offerColors.card,
        borderColor: offerColors.border,
        borderRadius: 22,
        borderWidth: 1,
        overflow: "hidden",
    },
    cardPressed: {
        opacity: 0.92,
        transform: [{ scale: 0.99 }],
    },
    content: {
        gap: 4,
        paddingHorizontal: 14,
        paddingVertical: 13,
    },
    discountedPrice: {
        color: offerColors.deepGreen,
        fontSize: 19,
        fontWeight: "800",
    },
    fallbackIcon: {
        color: offerColors.primary,
        fontSize: 13,
        fontWeight: "700",
        lineHeight: 16,
    },
    favoriteButton: {
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.32)",
        borderRadius: 999,
        height: 32,
        justifyContent: "center",
        position: "absolute",
        right: 12,
        top: 12,
        width: 32,
    },
    imageArea: {
        backgroundColor: offerColors.secondary,
        position: "relative",
    },
    imageScrim: {
        backgroundColor: "rgba(0, 0, 0, 0.10)",
        height: 54,
        left: 0,
        position: "absolute",
        right: 0,
        top: 0,
    },
    metadataChip: {
        alignItems: "center",
        backgroundColor: offerColors.secondary,
        borderColor: "#D8D3C7",
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: "row",
        gap: 5,
        maxWidth: "100%",
        paddingHorizontal: 9,
        paddingVertical: 5,
    },
    metadataRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 7,
        marginTop: 6,
    },
    metadataText: {
        color: offerColors.primary,
        flexShrink: 1,
        fontSize: 10.5,
        fontWeight: "600",
    },
    offerTitle: {
        color: offerColors.deepGreen,
        fontSize: 13,
        fontWeight: "600",
    },
    originalPrice: {
        color: "#A9B3A5",
        fontSize: 12,
        textDecorationLine: "line-through",
    },
    priceRow: {
        alignItems: "baseline",
        flexDirection: "row",
        gap: 8,
        marginTop: 5,
    },
    restaurantName: {
        color: "#1C2B1A",
        fontSize: 15,
        fontWeight: "700",
    },
    shadowContainer: {
        backgroundColor: offerColors.card,
        borderRadius: 22,
        elevation: 4,
        shadowColor: "#1C2B1A",
        shadowOffset: { height: 4, width: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
    },
    subtitle: {
        color: offerColors.mutedText,
        fontSize: 11.5,
        lineHeight: 16,
    },
});
