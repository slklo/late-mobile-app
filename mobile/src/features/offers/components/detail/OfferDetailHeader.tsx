import { StyleSheet, Text, View } from "react-native";

import { offerColors } from "../../theme";
import type { OfferDetailViewModel } from "../../types/offerDetail.types";

type OfferDetailHeaderProps = {
    offer: OfferDetailViewModel;
};

export function OfferDetailHeader({ offer }: OfferDetailHeaderProps) {
    return (
        <>
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
        </>
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
    offerTitle: {
        color: "#1C2B1A",
        fontSize: 26,
        fontWeight: "900",
        letterSpacing: -0.5,
        lineHeight: 31,
        marginTop: 5,
    },
    restaurantName: {
        color: offerColors.primary,
        fontSize: 14,
        fontWeight: "800",
        textTransform: "uppercase",
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
