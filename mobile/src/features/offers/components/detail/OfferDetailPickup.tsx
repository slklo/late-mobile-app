import { Text, View } from "react-native";

import { NativeWindSymbol } from "@/shared/ui/nativewindInterop";

import type { OfferDetailViewModel } from "../../types/offerDetail.types";

type OfferDetailPickupProps = {
    offer: OfferDetailViewModel;
};

function FallbackIcon({ children }: { children: string }) {
    return (
        <Text className="text-[10px] font-extrabold text-offer-primary">
            {children}
        </Text>
    );
}

export function OfferDetailPickup({ offer }: OfferDetailPickupProps) {
    return (
        <View className="mt-7">
            <Text className="mb-2.5 text-section-title font-black text-content-primary">
                Pickup details
            </Text>

            <View className="overflow-hidden rounded-panel border border-offer-border bg-offer-card px-4">
                <View className="flex-row items-center gap-3.5 py-4">
                    <View className="size-[38px] items-center justify-center rounded-pill bg-offer-secondary">
                        <NativeWindSymbol
                            className="text-offer-primary"
                            fallback={<FallbackIcon>Time</FallbackIcon>}
                            name="clock"
                            size={19}
                            weight="semibold"
                        />
                    </View>
                    <View className="flex-1">
                        <Text className="text-[11px] font-bold uppercase text-offer-muted-text">
                            Pickup date and time
                        </Text>
                        <Text className="mt-1 text-[14px] font-extrabold leading-[19px] text-offer-deep-green">
                            {offer.pickupDateLabel}
                        </Text>
                        <Text className="mt-[3px] text-xs leading-[17px] text-offer-muted-text">
                            {offer.pickupWindowLabel}
                        </Text>
                    </View>
                </View>

                <View className="ml-[54px] h-px bg-offer-border" />

                <View className="flex-row items-center gap-3.5 py-4">
                    <View className="size-[38px] items-center justify-center rounded-pill bg-offer-secondary">
                        <NativeWindSymbol
                            className="text-offer-primary"
                            fallback={<FallbackIcon>Place</FallbackIcon>}
                            name="location.fill"
                            size={19}
                            weight="semibold"
                        />
                    </View>
                    <View className="flex-1">
                        <Text className="text-[11px] font-bold uppercase text-offer-muted-text">
                            Restaurant address
                        </Text>
                        <Text className="mt-1 text-[14px] font-extrabold leading-[19px] text-offer-deep-green">
                            {offer.restaurantAddress}
                        </Text>
                    </View>
                </View>

                <View className="ml-[54px] h-px bg-offer-border" />

                <View className="flex-row items-center gap-3.5 py-4">
                    <View className="size-[38px] items-center justify-center rounded-pill bg-offer-secondary">
                        <NativeWindSymbol
                            className="text-offer-primary"
                            fallback={<FallbackIcon>Qty</FallbackIcon>}
                            name="shippingbox.fill"
                            size={19}
                            weight="semibold"
                        />
                    </View>
                    <View className="flex-1">
                        <Text className="text-[11px] font-bold uppercase text-offer-muted-text">
                            Remaining quantity
                        </Text>
                        <Text className="mt-1 text-[14px] font-extrabold leading-[19px] text-offer-deep-green">
                            {offer.quantityLabel}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}
