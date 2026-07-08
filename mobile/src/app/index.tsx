import { FlatList, Text, View } from "react-native";

import { useOffersQuery } from "@/features/offers/hooks/useOffersQuery";

export default function ExploreScreen() {
    const {data, isLoading, isError, refetch, isRefetching} = useOffersQuery();

    if (isLoading) {
        return <Text> Offer werden geladen... </Text>
    }

    if (isError) {
        return <Text> Offers konnten nicht geladen werden. </Text>
    }

      return (
        <View style={{ flex: 1, padding: 16 }}>
        <FlatList
            data={data ?? []}
            keyExtractor={(item) => String(item.id)}
            refreshing={isRefetching}
            onRefresh={refetch}
            renderItem={({ item }) => (
            <View style={{ padding: 16, marginBottom: 12, borderWidth: 1 }}>
                <Text>{item.title}</Text>
                <Text>{item.restaurant.name}</Text>
                <Text>
                {item.discounted_price} statt {item.original_price}
                </Text>
            </View>
            )}
        />
        </View>
  );

}