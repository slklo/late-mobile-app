import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import {
    useCallback,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Alert,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LocationHeader } from "@/features/location/components/LocationHeader";
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

export default function ExploreScreen() {
    const router = useRouter();
    const isOfferNavigationLocked = useRef(false);
    const { data, isLoading, isError, refetch } = (
        useOffersQuery()
    );
    const {
        data: savedOffers,
        isLoading: savedOffersAreLoading,
    } = useSavedOffersQuery();
    const toggleSavedOffer = useToggleSavedOffer();
    const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
    const selectedLocation = "Golm, Potsdam";
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
    const handleLocationPress = useCallback(() => {
        Alert.alert(
            "Standort ändern",
            "Die Standortauswahl wird später hier geöffnet.",
        );
    }, []);

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
            className="flex-1 bg-offer-background"
            edges={["top"]}
        >
            <StatusBar style="dark" />
            <LocationHeader
                location={selectedLocation}
                onPress={handleLocationPress}
            />
            <ScrollView
                alwaysBounceVertical={false}
                bounces={false}
                className="flex-1 bg-offer-background"
                contentContainerClassName="pb-10"
                overScrollMode="never"
                showsVerticalScrollIndicator={false}
            >
                <View className="mt-4">
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
