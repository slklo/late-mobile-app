import { FlatList, Text, View } from "react-native";

import type { OfferCardViewModel } from "../types/offerCard.types";
import { OfferCard } from "./OfferCard";

type OfferSectionProps = {
    emptyLabel: string;
    favoriteDisabled?: boolean;
    onFavoritePress?: (offer: OfferCardViewModel) => void;
    onOfferPress?: (offer: OfferCardViewModel) => void;
    offers: OfferCardViewModel[];
    savedOfferIds?: ReadonlySet<number>;
    title: string;
};

function CardSeparator() {
    return <View className="w-3.5" />;
}

export function OfferSection({
    emptyLabel,
    favoriteDisabled,
    onFavoritePress,
    onOfferPress,
    offers,
    savedOfferIds,
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
                            favoriteDisabled={favoriteDisabled}
                            isFavorite={savedOfferIds?.has(item.id) ?? false}
                            offer={item}
                            onFavoritePress={
                                onFavoritePress
                                    ? () => onFavoritePress(item)
                                    : undefined
                            }
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
