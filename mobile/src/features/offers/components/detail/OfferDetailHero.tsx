import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FavoriteHeartButton } from "@/features/saved-offers/components/FavoriteHeartButton";
import { NativeWindSymbol } from "@/shared/ui/nativewindInterop";

import type { OfferDetailViewModel } from "../../types/offerDetail.types";
import { OfferImage } from "../OfferImage";

type OfferDetailHeroProps = {
    isFavorite?: boolean;
    isFavoriteUpdating?: boolean;
    offer: OfferDetailViewModel;
    onBack: () => void;
    onToggleFavorite?: () => void;
};

function FallbackIcon({ children }: { children: string }) {
    return (
        <Text className="text-[10px] font-extrabold text-white">
            {children}
        </Text>
    );
}

function getStatusBadgeClass(statusLabel: string): string {
    if (statusLabel === "Expired") {
        return "bg-offer-expired";
    }

    if (statusLabel === "Sold out") {
        return "bg-offer-sold-out";
    }

    if (statusLabel === "Unavailable") {
        return "bg-offer-urgent";
    }

    return "bg-offer-deep-green";
}

export function OfferDetailHero({
    isFavorite = false,
    isFavoriteUpdating = false,
    offer,
    onBack,
    onToggleFavorite,
}: OfferDetailHeroProps) {
    const insets = useSafeAreaInsets();

    return (
        <View className="relative bg-offer-secondary">
            <OfferImage
                imageUrl={offer.imageUrl}
                offerTitle={offer.title}
                placeholderLabel={offer.imagePlaceholderLabel}
                variant="hero"
            />
            <View
                className="absolute inset-x-0 top-0 h-[92px] bg-offer-hero-scrim"
                pointerEvents="none"
            />

            <View
                className="absolute inset-x-4 flex-row justify-between"
                style={{ top: insets.top + 10 }}
            >
                <TouchableOpacity
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                    activeOpacity={0.76}
                    className="size-11 items-center justify-center rounded-pill border border-offer-hero-action-border bg-offer-hero-action"
                    onPress={onBack}
                >
                    <NativeWindSymbol
                        className="text-white"
                        fallback={<FallbackIcon>Back</FallbackIcon>}
                        name="chevron.left"
                        size={19}
                        weight="bold"
                    />
                </TouchableOpacity>

                <FavoriteHeartButton
                    accessibilityLabel={
                        isFavorite
                            ? "Remove offer from favorites"
                            : "Add offer to favorites"
                    }
                    disabled={isFavoriteUpdating || !onToggleFavorite}
                    isFavorite={isFavorite}
                    onPress={onToggleFavorite}
                    size="hero"
                />
            </View>

            <View
                className={`absolute bottom-[46px] right-[18px] rounded-pill px-3 py-[7px] ${getStatusBadgeClass(offer.statusLabel)}`}
            >
                <Text className="text-[11px] font-extrabold text-white">
                    {offer.statusLabel}
                </Text>
            </View>
        </View>
    );
}
