import { FlatList, StyleSheet, Text, View } from "react-native";

import { offerColors } from "../theme";
import type { OfferCardViewModel } from "../types/offerCard.types";
import { OfferCard } from "./OfferCard";

type OfferSectionProps = {
    cardWidth: number;
    emptyLabel: string;
    onOfferPress?: (offer: OfferCardViewModel) => void;
    offers: OfferCardViewModel[];
    title: string;
};

function CardSeparator() {
    return <View style={styles.separator} />;
}

export function OfferSection({
    cardWidth,
    emptyLabel,
    onOfferPress,
    offers,
    title,
}: OfferSectionProps) {
    return (
        <View style={styles.section}>
            <Text style={styles.title}>{title}</Text>

            {offers.length > 0 ? (
                <FlatList
                    contentContainerStyle={styles.listContent}
                    data={offers}
                    horizontal
                    ItemSeparatorComponent={CardSeparator}
                    keyExtractor={(offer) => String(offer.id)}
                    removeClippedSubviews={false}
                    renderItem={({ item }) => (
                        <OfferCard
                            offer={item}
                            onPress={
                                onOfferPress
                                    ? () => onOfferPress(item)
                                    : undefined
                            }
                            width={cardWidth}
                        />
                    )}
                    showsHorizontalScrollIndicator={false}
                />
            ) : (
                <Text style={styles.emptyText}>{emptyLabel}</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    emptyText: {
        color: offerColors.mutedText,
        fontSize: 13,
        paddingHorizontal: 16,
        paddingVertical: 20,
    },
    listContent: {
        paddingBottom: 10,
        paddingHorizontal: 16,
    },
    section: {
        gap: 12,
    },
    separator: {
        width: 14,
    },
    title: {
        color: "#1C2B1A",
        fontSize: 19,
        fontWeight: "800",
        paddingHorizontal: 16,
    },
});
