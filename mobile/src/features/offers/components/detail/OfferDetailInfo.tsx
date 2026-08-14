import { Text, View } from "react-native";

import type { OfferDetailViewModel } from "../../types/offerDetail.types";

type OfferDetailInfoProps = {
    offer: OfferDetailViewModel;
};

export function OfferDetailInfo({ offer }: OfferDetailInfoProps) {
    return (
        <View className="mt-section">
            <Text className="mb-section-title text-section-title font-black text-content-primary">
                What you get
            </Text>
            <Text className="text-detail-body text-content-secondary">
                {offer.description}
            </Text>
        </View>
    );
}
