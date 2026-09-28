import type { ReactElement } from "react";
import {
    FlatList,
    View,
    type RefreshControlProps,
} from "react-native";

import type { OfferCardViewModel } from "@/features/offers/types/offerCard.types";

import { SavedOfferCard } from "./SavedOfferCard";


type SavedOffersListProps = {
    disabled?: boolean;
    disabledOfferIds?: ReadonlySet<number>;
    offers: OfferCardViewModel[];
    onOfferPress: (offer: OfferCardViewModel) => void;
    onRemove: (offer: OfferCardViewModel) => void;
    refreshControl?: ReactElement<RefreshControlProps>;
};


function Separator() {
    return <View className="h-4" />;
}


export function SavedOffersList({
    disabled = false,
    disabledOfferIds,
    offers,
    onOfferPress,
    onRemove,
    refreshControl,
}: SavedOffersListProps) {
    return (
        <FlatList
            contentContainerClassName="px-4 pb-10 pt-4"
            data={offers}
            ItemSeparatorComponent={Separator}
            keyExtractor={(offer) => String(offer.id)}
            renderItem={({ item }) => (
                <SavedOfferCard
                    disabled={disabled || disabledOfferIds?.has(item.id)}
                    offer={item}
                    onPress={() => onOfferPress(item)}
                    onRemove={() => onRemove(item)}
                />
            )}
            refreshControl={refreshControl}
            showsVerticalScrollIndicator={false}
        />
    );
}
