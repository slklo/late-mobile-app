import { Text, View } from "react-native";

import type { OfferDetailViewModel } from "../../types/offerDetail.types";

type OfferDetailHeaderProps = {
    offer: OfferDetailViewModel;
};

export function OfferDetailHeader({ offer }: OfferDetailHeaderProps) {
    return (
        <>
            <Text className="text-[14px] font-extrabold uppercase text-offer-primary">
                {offer.restaurantName}
            </Text>
            <Text className="mt-[5px] text-[26px] font-black leading-[31px] tracking-[-0.5px] text-content-primary">
                {offer.title}
            </Text>

            <View className="mt-3 self-start rounded-pill border border-offer-metadata-border bg-offer-secondary px-3 py-1.5">
                <Text className="text-xs font-bold text-offer-primary">
                    {offer.categoryName}
                </Text>
            </View>

            {!offer.isAvailable ? (
                <View className="mt-[22px] rounded-control border border-offer-unavailable-border bg-offer-unavailable-background p-[15px]">
                    <Text className="text-[14px] font-extrabold text-offer-unavailable-title">
                        Offer unavailable
                    </Text>
                    <Text className="mt-[3px] text-[13px] text-offer-unavailable-text">
                        {offer.unavailableReason}
                    </Text>
                </View>
            ) : (
                <View className="mt-[22px] rounded-control border border-offer-available-border bg-offer-available-background p-[15px]">
                    <Text className="text-[14px] font-extrabold text-offer-primary">
                        Available today
                    </Text>
                </View>
            )}
        </>
    );
}
