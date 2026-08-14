import { Text, View } from "react-native";

import type { OfferDetailViewModel } from "../../types/offerDetail.types";

type OfferDetailPriceProps = {
    offer: OfferDetailViewModel;
};

export function OfferDetailPrice({ offer }: OfferDetailPriceProps) {
    return (
        <View className="mt-7 flex-row items-end justify-between rounded-panel border border-offer-border bg-offer-card p-[18px]">
            <View>
                <Text className="mb-[5px] text-[11px] font-bold uppercase text-offer-muted-text">
                    Original price
                </Text>
                <Text className="text-[15px] text-offer-detail-old-price line-through">
                    {offer.originalPriceLabel}
                </Text>
            </View>

            <View className="items-end">
                <Text className="mb-[5px] text-[11px] font-bold uppercase text-offer-muted-text">
                    Today&apos;s price
                </Text>
                <Text className="text-[27px] font-black text-offer-deep-green">
                    {offer.discountedPriceLabel}
                </Text>
                {offer.savingsLabel ? (
                    <Text className="text-xs font-extrabold text-offer-primary">
                        {offer.savingsLabel}
                    </Text>
                ) : null}
            </View>
        </View>
    );
}
