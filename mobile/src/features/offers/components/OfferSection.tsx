import { FlatList, Text, View } from "react-native";

import type { OfferCardViewModel } from "../types/offerCard.types";
import { OfferCard } from "./OfferCard";

type OfferSectionProps = {
    emptyLabel: string;
    onOfferPress?: (offer: OfferCardViewModel) => void;
    offers: OfferCardViewModel[];
    title: string;
};

function CardSeparator() {
    return <View className="w-3.5" />;
}

export function OfferSection({
    emptyLabel,
    onOfferPress,
    offers,
    title,
}: OfferSectionProps) {
    return (
        <View className="gap-3">
            <Text className="px-4 text-section-title font-extrabold text-content-primary">
                {title}
            </Text>

            {offers.length > 0 ? (
                <FlatList
                    contentContainerClassName="px-4 pb-2.5"
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
                        />
                    )}
                    showsHorizontalScrollIndicator={false}
                />
            ) : (
                <Text className="px-4 py-5 text-label text-offer-muted-text">
                    {emptyLabel}
                </Text>
            )}
        </View>
    );
}
