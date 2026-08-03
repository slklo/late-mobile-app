import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";

import { offerColors } from "../../theme";
import type { OfferDetailViewModel } from "../../types/offerDetail.types";

type OfferDetailPickupProps = {
    offer: OfferDetailViewModel;
};

function FallbackIcon({ children }: { children: string }) {
    return <Text style={styles.fallbackIcon}>{children}</Text>;
}

export function OfferDetailPickup({ offer }: OfferDetailPickupProps) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pickup details</Text>

            <View style={styles.detailsCard}>
                <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                        <SymbolView
                            fallback={<FallbackIcon>Time</FallbackIcon>}
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
                            fallback={<FallbackIcon>Place</FallbackIcon>}
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
                            fallback={<FallbackIcon>Qty</FallbackIcon>}
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
    );
}

const styles = StyleSheet.create({
    detailsCard: {
        backgroundColor: offerColors.card,
        borderColor: offerColors.border,
        borderRadius: 20,
        borderWidth: 1,
        overflow: "hidden",
        paddingHorizontal: 16,
    },
    fallbackIcon: {
        color: offerColors.primary,
        fontSize: 10,
        fontWeight: "800",
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
    section: {
        marginTop: 28,
    },
    sectionTitle: {
        color: "#1C2B1A",
        fontSize: 19,
        fontWeight: "900",
        marginBottom: 10,
    },
});
