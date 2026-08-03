import { StyleSheet, Text, View } from "react-native";

import type { OfferDetailViewModel } from "../../types/offerDetail.types";

type OfferDetailInfoProps = {
    offer: OfferDetailViewModel;
};

export function OfferDetailInfo({ offer }: OfferDetailInfoProps) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>What you get</Text>
            <Text style={styles.bodyText}>{offer.description}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    bodyText: {
        color: "#53604E",
        fontSize: 15,
        lineHeight: 23,
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
