import { useState } from "react";
import {
    Pressable,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { NativeWindSymbol } from "@/shared/ui/nativewindInterop";

import type {
    OfferBadgeType,
    OfferCardViewModel,
} from "../types/offerCard.types";
import { OfferImage } from "./OfferImage";

type OfferCardProps = {
    offer: OfferCardViewModel;
    onPress?: () => void;
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

export function OfferCard({
    offer,
    onPress,
}: OfferCardProps) {
    const [isFavorite, setFavorite] = useState(false);

    return (
        <View className="w-[calc(100vw-72px)] min-w-[248px] max-w-[276px] rounded-card bg-offer-card shadow-offer-tile elevation-offer-tile">
            <Pressable
                accessibilityLabel={`View ${offer.offerTitle} from ${offer.restaurantName}`}
                accessibilityRole={onPress ? "button" : undefined}
                className="overflow-hidden rounded-card border border-offer-border bg-offer-card active:scale-[0.99] active:opacity-[0.92]"
                disabled={!onPress}
                onPress={onPress}
            >
                <View className="relative bg-offer-secondary">
                    <OfferImage
                        imageUrl={offer.imageUrl}
                        offerTitle={offer.offerTitle}
                        placeholderLabel={offer.imagePlaceholderLabel}
                    />
                    <View
                        className="absolute inset-x-0 top-0 h-[54px] bg-offer-image-scrim"
                        pointerEvents="none"
                    />

                    {offer.badge ? (
                        <View
                            className={`absolute left-3 top-3 rounded-pill px-2.5 py-[5px] ${badgeClasses[offer.badge.type]}`}
                        >
                            <Text className="text-[10.5px] font-extrabold tracking-[0.2px] text-white">
                                {offer.badge.label}
                            </Text>
                        </View>
                    ) : null}

                    <TouchableOpacity
                        accessibilityLabel={
                            isFavorite
                                ? `Remove ${offer.offerTitle} from favorites`
                                : `Add ${offer.offerTitle} to favorites`
                        }
                        accessibilityRole="button"
                        accessibilityState={{ selected: isFavorite }}
                        activeOpacity={0.78}
                        className="absolute right-3 top-3 size-8 items-center justify-center rounded-pill bg-offer-favorite-overlay"
                        onPress={(event) => {
                            event.stopPropagation();
                            setFavorite((current) => !current);
                        }}
                    >
                        <NativeWindSymbol
                            className={
                                isFavorite
                                    ? "text-offer-urgent"
                                    : "text-white"
                            }
                            fallback={(
                                <FallbackIcon>
                                    {isFavorite ? "♥" : "♡"}
                                </FallbackIcon>
                            )}
                            name={isFavorite ? "heart.fill" : "heart"}
                            size={17}
                            weight="semibold"
                        />
                    </TouchableOpacity>
                </View>

                <View className="gap-1 px-3.5 py-[13px]">
                    <Text
                        className="text-[15px] font-bold text-content-primary"
                        numberOfLines={1}
                    >
                        {offer.restaurantName}
                    </Text>
                    <Text
                        className="text-[13px] font-semibold text-offer-deep-green"
                        numberOfLines={1}
                    >
                        {offer.offerTitle}
                    </Text>
                    <Text
                        className="text-[11.5px] leading-4 text-offer-muted-text"
                        numberOfLines={1}
                    >
                        {offer.subtitle}
                    </Text>

                    <View className="mt-1.5 flex-row flex-wrap gap-[7px]">
                        <View className="max-w-full flex-row items-center gap-[5px] rounded-pill border border-offer-metadata-border bg-offer-secondary px-[9px] py-[5px]">
                            <NativeWindSymbol
                                className="text-offer-primary"
                                fallback={<FallbackIcon>◷</FallbackIcon>}
                                name="clock"
                                size={11}
                                weight="medium"
                            />
                            <Text
                                className="shrink text-[10.5px] font-semibold text-offer-primary"
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
                                    size={10}
                                    weight="medium"
                                />
                                <Text
                                    numberOfLines={1}
                                    className="shrink text-[10.5px] font-semibold text-offer-primary"
                                >
                                    {offer.distanceLabel}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    <View className="mt-[5px] flex-row items-baseline gap-2">
                        <Text className="text-xs text-offer-old-price line-through">
                            {offer.originalPriceLabel}
                        </Text>
                        <Text className="text-section-title font-extrabold text-offer-deep-green">
                            {offer.discountedPriceLabel}
                        </Text>
                    </View>
                </View>
            </Pressable>
        </View>
    );
}
