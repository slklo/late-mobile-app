import {
    Pressable,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { OfferImage } from "@/features/offers/components/OfferImage";
import type {
    OfferBadgeType,
    OfferCardViewModel,
} from "@/features/offers/types/offerCard.types";
import { NativeWindSymbol } from "@/shared/ui/nativewindInterop";


type SavedOfferCardProps = {
    disabled?: boolean;
    offer: OfferCardViewModel;
    onPress: () => void;
    onRemove: () => void;
};


const badgeClasses: Record<OfferBadgeType, string> = {
    discount: "bg-offer-discount",
    expired: "bg-offer-expired",
    new: "bg-offer-deep-green",
    sold_out: "bg-offer-sold-out",
    urgent: "bg-offer-urgent",
};


function FallbackIcon({ children }: { children: string }) {
    return (
        <Text className="text-[13px] font-bold leading-4 text-offer-primary">
            {children}
        </Text>
    );
}


export function SavedOfferCard({
    disabled = false,
    offer,
    onPress,
    onRemove,
}: SavedOfferCardProps) {
    return (
        <View className="w-full rounded-card bg-offer-card shadow-offer-tile elevation-offer-tile">
            <Pressable
                accessibilityLabel={`View ${offer.offerTitle} from ${offer.restaurantName}`}
                accessibilityRole="button"
                className="overflow-hidden rounded-card border border-offer-border bg-offer-card active:scale-[0.99] active:opacity-[0.92]"
                onPress={onPress}
            >
                <View className="relative bg-offer-secondary">
                    <OfferImage
                        imageUrl={offer.imageUrl}
                        offerTitle={offer.offerTitle}
                        placeholderLabel={offer.imagePlaceholderLabel}
                        variant="saved"
                    />
                    <View
                        className="absolute inset-x-0 bottom-0 h-20 bg-offer-image-scrim"
                        pointerEvents="none"
                    />

                    {offer.badge ? (
                        <View
                            className={`absolute bottom-3 right-3 flex-row items-center gap-1 rounded-pill px-2.5 py-[4px] ${badgeClasses[offer.badge.type]}`}
                        >
                            <View className="size-[5px] rounded-pill bg-offer-card opacity-80" />
                            <Text
                                className="text-[11px] font-extrabold text-white"
                                numberOfLines={1}
                            >
                                {offer.badge.label}
                            </Text>
                        </View>
                    ) : null}

                    <TouchableOpacity
                        accessibilityLabel={`Remove ${offer.offerTitle} from favorites`}
                        accessibilityRole="button"
                        accessibilityState={{
                            disabled,
                            selected: true,
                        }}
                        activeOpacity={0.78}
                        className="absolute right-3 top-2.5 size-[34px] items-center justify-center rounded-pill bg-offer-card/90"
                        disabled={disabled}
                        onPress={(event) => {
                            event.stopPropagation();
                            onRemove();
                        }}
                    >
                        <NativeWindSymbol
                            className="text-offer-urgent"
                            fallback={<FallbackIcon>♥</FallbackIcon>}
                            name="heart.fill"
                            size={16}
                            weight="semibold"
                        />
                    </TouchableOpacity>
                </View>

                <View className="px-4 pb-4 pt-3.5">
                    <View className="flex-row items-start gap-2.5">
                        <View className="min-w-0 flex-1">
                            <Text
                                className="text-[16px] font-bold leading-[20px] text-content-primary"
                                numberOfLines={1}
                            >
                                {offer.restaurantName}
                            </Text>
                            <Text
                                className="mt-[3px] text-[12px] leading-[16px] text-offer-muted-text"
                                numberOfLines={1}
                            >
                                {offer.categoryName}
                            </Text>
                        </View>
                    </View>

                    <Text
                        className="mt-3 text-[14px] font-semibold leading-[18px] text-content-primary"
                        numberOfLines={1}
                    >
                        {offer.offerTitle}
                    </Text>
                    <Text
                        className="mt-[5px] text-[12px] leading-[17px] text-offer-muted-text"
                        numberOfLines={2}
                    >
                        {offer.subtitle}
                    </Text>

                    <View className="mt-3 flex-row flex-wrap gap-[7px]">
                        <View className="max-w-full flex-row items-center gap-[5px] rounded-pill border border-offer-metadata-border bg-offer-secondary px-[9px] py-[5px]">
                            <NativeWindSymbol
                                className="text-offer-primary"
                                fallback={<FallbackIcon>◷</FallbackIcon>}
                                name="clock"
                                size={12}
                                weight="medium"
                            />
                            <Text
                                className="shrink text-[11px] font-semibold text-offer-primary"
                                numberOfLines={1}
                            >
                                {offer.pickupWindowLabel}
                            </Text>
                        </View>

                        {offer.distanceLabel ? (
                            <View className="max-w-full flex-row items-center gap-[5px] rounded-pill border border-offer-metadata-border bg-offer-secondary px-[9px] py-[5px]">
                                <NativeWindSymbol
                                    className="text-offer-primary"
                                    fallback={<FallbackIcon>●</FallbackIcon>}
                                    name="location.fill"
                                    size={11}
                                    weight="medium"
                                />
                                <Text
                                    className="shrink text-[11px] font-semibold text-offer-primary"
                                    numberOfLines={1}
                                >
                                    {offer.distanceLabel}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    <View className="mt-3.5 flex-row items-baseline gap-1.5">
                        <Text className="text-[12px] text-offer-old-price line-through">
                            {offer.originalPriceLabel}
                        </Text>
                        <Text className="text-[20px] font-extrabold leading-[24px] text-offer-deep-green">
                            {offer.discountedPriceLabel}
                        </Text>
                    </View>
                </View>
            </Pressable>
        </View>
    );
}
