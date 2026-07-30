import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { useLogout } from "@/features/auth/hooks/useLogout";
import { useAuthStore } from "@/features/auth/store/authStore";
import { OfferCard } from "@/features/offers/components/OfferCard";
import { useOffersQuery } from "@/features/offers/hooks/useOffersQuery";
import { mapOffersToCardViewModels } from "@/features/offers/mappers/offerCard.mapper";
import { offerColors } from "@/features/offers/theme";

export default function ExploreScreen() {
    const { data, isLoading, isError, refetch, isRefetching } = (
        useOffersQuery()
    );
    const user = useAuthStore((state) => state.user);
    const logout = useLogout();
    const offers = useMemo(
        () => mapOffersToCardViewModels(data ?? []),
        [data],
    );

    if (isLoading) {
        return <Text style={styles.centerText}>Offer werden geladen...</Text>;
    }

    if (isError) {
        return (
            <Text style={styles.centerText}>
                Offers konnten nicht geladen werden.
            </Text>
        );
    }

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <Text style={styles.kicker}>Eingeloggt als</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                </View>
                <Pressable
                    onPress={logout}
                    style={({ pressed }) => [
                        styles.logoutButton,
                        pressed && styles.pressed,
                    ]}
                >
                    <Text style={styles.logoutText}>Logout</Text>
                </Pressable>
            </View>

            <FlatList
                contentContainerStyle={styles.offerList}
                data={offers}
                keyExtractor={(item) => String(item.id)}
                onRefresh={refetch}
                refreshing={isRefetching}
                renderItem={({ item }) => <OfferCard offer={item} />}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: offerColors.background,
        padding: 16,
    },
    centerText: {
        color: "#374151",
        marginTop: 32,
        textAlign: "center",
    },
    header: {
        alignItems: "center",
        flexDirection: "row",
        gap: 12,
        justifyContent: "space-between",
        marginBottom: 16,
    },
    userInfo: {
        flex: 1,
    },
    kicker: {
        color: "#6b7280",
        fontSize: 12,
        fontWeight: "600",
        textTransform: "uppercase",
    },
    email: {
        color: "#111827",
        fontSize: 16,
        fontWeight: "700",
        marginTop: 2,
    },
    logoutButton: {
        borderColor: "#111827",
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    logoutText: {
        color: "#111827",
        fontSize: 14,
        fontWeight: "700",
    },
    pressed: {
        opacity: 0.75,
    },
    offerList: {
        gap: 18,
        paddingBottom: 24,
    },
});
