import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SavedOffersList } from "@/features/saved-offers/components/SavedOffersList";
import { useSavedOffersQuery } from "@/features/saved-offers/hooks/useSavedOffersQuery";
import { useToggleSavedOffer } from "@/features/saved-offers/hooks/useToggleSavedOffer";
import { mapSavedOffersToCardViewModels } from "@/features/saved-offers/mappers/savedOfferCard.mapper";
import type { OfferCardViewModel } from "@/features/offers/types/offerCard.types";
import { NativeWindRefreshControl } from "@/shared/ui/nativewindInterop";

export default function FavoriteTabScreen() {
    const router = useRouter();
    const navigationLocked = useRef(false);
    const {
        data: savedOffers,
        isError,
        isLoading,
        isRefetching,
        refetch,
    } = useSavedOffersQuery();
    const toggleSavedOffer = useToggleSavedOffer();
    const offers = useMemo(
        () => mapSavedOffersToCardViewModels(savedOffers ?? []),
        [savedOffers],
    );
    const removeIsPending = toggleSavedOffer.isPending;

    useFocusEffect(useCallback(() => {
        navigationLocked.current = false;
    }, []));

    const handleOfferPress = useCallback((offer: OfferCardViewModel) => {
        if (navigationLocked.current) {
            return;
        }

        navigationLocked.current = true;
        router.push({
            pathname: "/offers/[offerId]",
            params: {
                offerId: String(offer.id),
                from: "favorite",
            },
        });
    }, [router]);

    const handleRemove = useCallback((offer: OfferCardViewModel) => {
        if (removeIsPending) {
            return;
        }

        toggleSavedOffer.mutate({
            offerId: offer.id,
            isCurrentlySaved: true,
        });
    }, [removeIsPending, toggleSavedOffer]);

    const handleBrowseOffers = useCallback(() => {
        router.replace("/");
    }, [router]);

    const refreshControl = (
        <NativeWindRefreshControl
            className="text-offer-primary"
            onRefresh={refetch}
            refreshing={isRefetching}
        />
    );

    if (isLoading) {
        return (
            <SafeAreaView
                className="flex-1 bg-offer-background"
                edges={["top"]}
            >
                <StatusBar style="dark" />
                <View className="flex-1 items-center justify-center px-7">
                    <Text className="text-center text-[14px] leading-[21px] text-offer-muted-text">
                        Loading saved offers...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (isError) {
        return (
            <SafeAreaView
                className="flex-1 bg-offer-background"
                edges={["top"]}
            >
                <StatusBar style="dark" />
                <View className="flex-1 items-center justify-center px-7">
                    <Text className="text-center text-xl font-extrabold text-offer-deep-green">
                        Saved offers are unavailable
                    </Text>
                    <Text className="mt-[7px] text-center text-[14px] leading-[21px] text-offer-muted-text">
                        Please check your connection and try again.
                    </Text>
                    <TouchableOpacity
                        activeOpacity={0.82}
                        className="mt-[18px] rounded-pill bg-offer-primary px-5 py-[11px]"
                        onPress={() => void refetch()}
                    >
                        <Text className="text-[14px] font-bold text-offer-card">
                            Try again
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (offers.length === 0) {
        return (
            <SafeAreaView
                className="flex-1 bg-offer-background"
                edges={["top"]}
            >
                <StatusBar style="dark" />
                <View className="flex-1 items-center justify-center px-7">
                    <Text className="text-center text-xl font-extrabold text-offer-deep-green">
                        No saved offers yet
                    </Text>
                    <Text className="mt-[7px] text-center text-[14px] leading-[21px] text-offer-muted-text">
                        Tap the heart on offers you want to find again.
                    </Text>
                    <TouchableOpacity
                        activeOpacity={0.82}
                        className="mt-[18px] rounded-pill bg-offer-primary px-5 py-[11px]"
                        onPress={handleBrowseOffers}
                    >
                        <Text className="text-[14px] font-bold text-offer-card">
                            Browse offers
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-offer-background" edges={["top"]}>
            <StatusBar style="dark" />
            <View className="px-5 pb-2 pt-[18px]">
                <Text className="text-2xl font-extrabold tracking-[-0.4px] text-offer-deep-green">
                    Favorite offers
                </Text>
                <Text className="mt-[5px] text-label text-offer-muted-text">
                    Offers you saved for later.
                </Text>
            </View>
            <SavedOffersList
                disabled={removeIsPending}
                offers={offers}
                onOfferPress={handleOfferPress}
                onRemove={handleRemove}
                refreshControl={refreshControl}
            />
        </SafeAreaView>
    );
}
