import { View } from "react-native";

import { OfferCard } from "@/features/offers/components/OfferCard";
import type { OfferCardViewModel } from "@/features/offers/types/offerCard.types";


type SavedOfferCardProps = {
    disabled?: boolean;
    offer: OfferCardViewModel;
    onPress: () => void;
    onRemove: () => void;
};


export function SavedOfferCard({
    disabled = false,
    offer,
    onPress,
    onRemove,
}: SavedOfferCardProps) {
    return (
        <View className="items-center px-4">
            <OfferCard
                favoriteDisabled={disabled}
                isFavorite
                offer={offer}
                onFavoritePress={onRemove}
                onPress={onPress}
            />
        </View>
    );
}
