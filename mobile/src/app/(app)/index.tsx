import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useLogout } from "@/features/auth/hooks/useLogout";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ExploreCategoryChips } from "@/features/offers/components/ExploreCategoryChips";
import { OfferSection } from "@/features/offers/components/OfferSection";
import { useOffersQuery } from "@/features/offers/hooks/useOffersQuery";
import { mapOffersToCardViewModels } from "@/features/offers/mappers/offerCard.mapper";
import { offerColors } from "@/features/offers/theme";
import {
    ALL_CATEGORIES,
    filterOffersByCategory,
    getExploreCategories,
    splitOffersForExplore,
} from "@/features/offers/utils/exploreOffers";

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
    const { width: screenWidth } = useWindowDimensions();
    const { data, isLoading, isError, refetch, isRefetching } = (
        useOffersQuery()
    );
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
    const filteredOffers = useMemo(
        () => filterOffersByCategory(offers, selectedCategory),
        [offers, selectedCategory],
    );
    const sections = useMemo(
        () => splitOffersForExplore(filteredOffers),
        [filteredOffers],
    );
    const cardWidth = Math.min(276, Math.max(248, screenWidth - 72));
    const firstName = user?.full_name?.trim().split(/\s+/)[0] || "there";
    const greeting = getGreeting(new Date().getHours());

    useEffect(() => {
        if (!categories.includes(selectedCategory)) {
            setSelectedCategory(ALL_CATEGORIES);
        }
    }, [categories, selectedCategory]);

    if (isLoading) {
        return (
            <SafeAreaView edges={["top"]} style={styles.safeArea}>
                <StatusBar style="light" />
                <View style={styles.stateContainer}>
                    <Text style={styles.stateText}>Loading offers...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (isError) {
        return (
            <SafeAreaView edges={["top"]} style={styles.safeArea}>
                <StatusBar style="light" />
                <View style={styles.stateContainer}>
                    <Text style={styles.stateTitle}>Offers are unavailable</Text>
                    <Text style={styles.stateText}>
                        Please check your connection and try again.
                    </Text>
                    <TouchableOpacity
                        activeOpacity={0.82}
                        onPress={() => void refetch()}
                        style={styles.retryButton}
                    >
                        <Text style={styles.retryButtonText}>Try again</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
            <StatusBar style="light" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={(
                    <RefreshControl
                        onRefresh={refetch}
                        refreshing={isRefetching}
                        tintColor={offerColors.primary}
                    />
                )}
                showsVerticalScrollIndicator={false}
                style={styles.screen}
            >
                <View style={styles.header}>
                    <View style={styles.greetingContainer}>
                        <Text style={styles.greeting}>
                            {greeting}, {firstName} 👋
                        </Text>
                        <Text style={styles.headerSubtitle}>
                            Discover today&apos;s rescue offers.
                        </Text>
                    </View>
                    <TouchableOpacity
                        accessibilityLabel="Log out"
                        accessibilityRole="button"
                        activeOpacity={0.78}
                        onPress={logout}
                        style={styles.logoutButton}
                    >
                        <Text style={styles.logoutText}>Log out</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.categories}>
                    <ExploreCategoryChips
                        categories={categories}
                        onSelect={setSelectedCategory}
                        selectedCategory={selectedCategory}
                    />
                </View>

                {filteredOffers.length > 0 ? (
                    <View style={styles.sections}>
                        <OfferSection
                            cardWidth={cardWidth}
                            emptyLabel="No recommended offers in this category."
                            onOfferPress={(offer) => router.push({
                                pathname: "/offers/[offerId]",
                                params: { offerId: String(offer.id) },
                            })}
                            offers={sections.recommended}
                            title="Recommended offers"
                        />
                        <OfferSection
                            cardWidth={cardWidth}
                            emptyLabel="No other offers in this category."
                            onOfferPress={(offer) => router.push({
                                pathname: "/offers/[offerId]",
                                params: { offerId: String(offer.id) },
                            })}
                            offers={sections.inArea}
                            title="In your area"
                        />
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.stateTitle}>No offers found</Text>
                        <Text style={styles.stateText}>
                            Try another category or check again later.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    categories: {
        marginTop: 20,
    },
    emptyContainer: {
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 56,
    },
    greeting: {
        color: offerColors.card,
        fontSize: 24,
        fontWeight: "800",
        letterSpacing: -0.4,
    },
    greetingContainer: {
        flex: 1,
    },
    header: {
        alignItems: "center",
        backgroundColor: offerColors.deepGreen,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        flexDirection: "row",
        gap: 14,
        justifyContent: "space-between",
        paddingBottom: 24,
        paddingHorizontal: 20,
        paddingTop: 18,
    },
    headerSubtitle: {
        color: "rgba(253, 250, 244, 0.72)",
        fontSize: 13,
        marginTop: 5,
    },
    logoutButton: {
        borderColor: "rgba(253, 250, 244, 0.32)",
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 13,
        paddingVertical: 8,
    },
    logoutText: {
        color: offerColors.card,
        fontSize: 12,
        fontWeight: "700",
    },
    retryButton: {
        backgroundColor: offerColors.primary,
        borderRadius: 999,
        marginTop: 18,
        paddingHorizontal: 20,
        paddingVertical: 11,
    },
    retryButtonText: {
        color: offerColors.card,
        fontSize: 14,
        fontWeight: "700",
    },
    safeArea: {
        backgroundColor: offerColors.deepGreen,
        flex: 1,
    },
    screen: {
        backgroundColor: offerColors.background,
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    sections: {
        gap: 28,
        marginTop: 28,
    },
    stateContainer: {
        alignItems: "center",
        backgroundColor: offerColors.background,
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 28,
    },
    stateText: {
        color: offerColors.mutedText,
        fontSize: 14,
        lineHeight: 21,
        marginTop: 7,
        textAlign: "center",
    },
    stateTitle: {
        color: offerColors.deepGreen,
        fontSize: 20,
        fontWeight: "800",
        textAlign: "center",
    },
});
