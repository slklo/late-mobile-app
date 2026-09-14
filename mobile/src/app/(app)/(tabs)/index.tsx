import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import {
    useCallback,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useLogout } from "@/features/auth/hooks/useLogout";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ExploreCategoryChips } from "@/features/offers/components/ExploreCategoryChips";
import { OfferSection } from "@/features/offers/components/OfferSection";
import { useOffersQuery } from "@/features/offers/hooks/useOffersQuery";
import { mapOffersToCardViewModels } from "@/features/offers/mappers/offerCard.mapper";
import type { OfferCardViewModel } from "@/features/offers/types/offerCard.types";
import {
    ALL_CATEGORIES,
    filterOffersByCategory,
    getExploreCategories,
    splitOffersForExplore,
} from "@/features/offers/utils/exploreOffers";
import { useSavedOffersQuery } from "@/features/saved-offers/hooks/useSavedOffersQuery";
import { useToggleSavedOffer } from "@/features/saved-offers/hooks/useToggleSavedOffer";
import { getSavedOfferIds } from "@/features/saved-offers/utils/getSavedOfferIds";
import { NativeWindRefreshControl } from "@/shared/ui/nativewindInterop";

function getGreeting(hour: number): string {
    if (hour < 12) {
        return "Good morning";
    }

    if (hour < 18) {
        return "Good afternoon";
    }

    return "Good evening";
}

export default function ExploreScreen() {
    const router = useRouter();
    const isOfferNavigationLocked = useRef(false);
    const { data, isLoading, isError, refetch, isRefetching } = (
        useOffersQuery()
    );
    const {
        data: savedOffers,
        isLoading: savedOffersAreLoading,
        refetch: refetchSavedOffers,
    } = useSavedOffersQuery();
    const toggleSavedOffer = useToggleSavedOffer();
    const user = useAuthStore((state) => state.user);
    const logout = useLogout();
    const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
    const offers = useMemo(
        () => mapOffersToCardViewModels(data ?? []),
        [data],
    );
    const categories = useMemo(
        () => getExploreCategories(offers),
        [offers],
    );
    const activeCategory = categories.includes(selectedCategory)
        ? selectedCategory
        : ALL_CATEGORIES;
    const filteredOffers = useMemo(
        () => filterOffersByCategory(offers, activeCategory),
        [activeCategory, offers],
    );
    const sections = useMemo(
        () => splitOffersForExplore(filteredOffers),
        [filteredOffers],
    );
    const savedOfferIds = useMemo(
        () => getSavedOfferIds(savedOffers),
        [savedOffers],
    );
    const firstName = user?.full_name?.trim().split(/\s+/)[0] || "there";
    const greeting = getGreeting(new Date().getHours());

    useFocusEffect(useCallback(() => {
        isOfferNavigationLocked.current = false;
    }, []));

    const handleOfferPress = useCallback((offer: OfferCardViewModel) => {
        if (isOfferNavigationLocked.current) {
            return;
        }

        isOfferNavigationLocked.current = true;
        router.push({
            pathname: "/offers/[offerId]",
            params: { offerId: String(offer.id) },
        });
    }, [router]);
    const handleFavoritePress = useCallback((offer: OfferCardViewModel) => {
        if (savedOffersAreLoading || toggleSavedOffer.isPending) {
            return;
        }

        toggleSavedOffer.mutate({
            offerId: offer.id,
            isCurrentlySaved: savedOfferIds.has(offer.id),
        });
    }, [
        savedOfferIds,
        savedOffersAreLoading,
        toggleSavedOffer,
    ]);
    const handleRefresh = useCallback(() => {
        void refetch();
        void refetchSavedOffers();
    }, [refetch, refetchSavedOffers]);

    if (isLoading) {
        return (
            <SafeAreaView
                className="flex-1 bg-offer-deep-green"
                edges={["top"]}
            >
                <StatusBar style="light" />
                <View className="flex-1 items-center justify-center bg-offer-background px-7">
                    <Text className="mt-[7px] text-center text-[14px] leading-[21px] text-offer-muted-text">
                        Loading offers...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (isError) {
        return (
            <SafeAreaView
                className="flex-1 bg-offer-deep-green"
                edges={["top"]}
            >
                <StatusBar style="light" />
                <View className="flex-1 items-center justify-center bg-offer-background px-7">
                    <Text className="text-center text-xl font-extrabold text-offer-deep-green">
                        Offers are unavailable
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

    return (
        <SafeAreaView
            className="flex-1 bg-offer-deep-green"
            edges={["top"]}
        >
            <StatusBar style="light" />
            <ScrollView
                className="flex-1 bg-offer-background"
                contentContainerClassName="pb-10"
                refreshControl={(
                    <NativeWindRefreshControl
                        className="text-offer-primary"
                        onRefresh={handleRefresh}
                        refreshing={isRefetching}
                    />
                )}
                showsVerticalScrollIndicator={false}
            >
                <View className="flex-row items-center justify-between gap-3.5 rounded-b-detail-shell bg-offer-deep-green px-5 pb-6 pt-[18px]">
                    <View className="flex-1">
                        <Text className="text-2xl font-extrabold tracking-[-0.4px] text-offer-card">
                            {greeting}, {firstName} 👋
                        </Text>
                        <Text className="mt-[5px] text-label text-offer-card/[.72]">
                            Discover today&apos;s rescue offers.
                        </Text>
                    </View>
                    <TouchableOpacity
                        accessibilityLabel="Log out"
                        accessibilityRole="button"
                        activeOpacity={0.78}
                        className="rounded-pill border border-offer-card/[.32] px-[13px] py-2"
                        onPress={logout}
                    >
                        <Text className="text-xs font-bold text-offer-card">
                            Log out
                        </Text>
                    </TouchableOpacity>
                </View>

                <View className="mt-5">
                    <ExploreCategoryChips
                        categories={categories}
                        onSelect={setSelectedCategory}
                        selectedCategory={activeCategory}
                    />
                </View>

                {filteredOffers.length > 0 ? (
                    <View className="mt-7 gap-7">
                        <OfferSection
                            emptyLabel="No recommended offers in this category."
                            favoriteDisabled={
                                savedOffersAreLoading
                                || toggleSavedOffer.isPending
                            }
                            onFavoritePress={handleFavoritePress}
                            onOfferPress={handleOfferPress}
                            offers={sections.recommended}
                            savedOfferIds={savedOfferIds}
                            title="Recommended offers"
                        />
                        <OfferSection
                            emptyLabel="No other offers in this category."
                            favoriteDisabled={
                                savedOffersAreLoading
                                || toggleSavedOffer.isPending
                            }
                            onFavoritePress={handleFavoritePress}
                            onOfferPress={handleOfferPress}
                            offers={sections.inArea}
                            savedOfferIds={savedOfferIds}
                            title="In your area"
                        />
                    </View>
                ) : (
                    <View className="items-center px-6 py-14">
                        <Text className="text-center text-xl font-extrabold text-offer-deep-green">
                            No offers found
                        </Text>
                        <Text className="mt-[7px] text-center text-[14px] leading-[21px] text-offer-muted-text">
                            Try another category or check again later.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
