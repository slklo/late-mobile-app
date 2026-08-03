import { StyleSheet, Text, View } from "react-native";

import { offerColors } from "../../theme";
import type { OfferDetailViewModel } from "../../types/offerDetail.types";

type OfferDetailPriceProps = {
    offer: OfferDetailViewModel;
};

export function OfferDetailPrice({ offer }: OfferDetailPriceProps) {
    return (
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
    );
}

const styles = StyleSheet.create({
    currentPriceContainer: {
        alignItems: "flex-end",
    },
    discountedPrice: {
        color: offerColors.deepGreen,
        fontSize: 27,
        fontWeight: "900",
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
    savingsLabel: {
        color: offerColors.primary,
        fontSize: 12,
        fontWeight: "800",
    },
});
