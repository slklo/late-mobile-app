import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { offerColors } from "../../theme";
import type { OfferDetailViewModel } from "../../types/offerDetail.types";
import { OfferImage } from "../OfferImage";

type OfferDetailHeroProps = {
    offer: OfferDetailViewModel;
    onBack: () => void;
};

function FallbackIcon({ children }: { children: string }) {
    return <Text style={styles.fallbackIcon}>{children}</Text>;
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

export function OfferDetailHero({
    offer,
    onBack,
}: OfferDetailHeroProps) {
    const insets = useSafeAreaInsets();
    const [isFavorite, setFavorite] = useState(false);

    return (
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
                            isFavorite ? offerColors.urgent : "#FFFFFF"
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
                <Text style={styles.badgeText}>{offer.statusLabel}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    badgeText: {
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: "800",
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
});
