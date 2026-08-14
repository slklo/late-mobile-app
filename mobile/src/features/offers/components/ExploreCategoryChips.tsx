import {
    FlatList,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type ExploreCategoryChipsProps = {
    categories: string[];
    onSelect: (category: string) => void;
    selectedCategory: string;
};

function ChipSeparator() {
    return <View className="w-chip-gap" />;
}

export function ExploreCategoryChips({
    categories,
    onSelect,
    selectedCategory,
}: ExploreCategoryChipsProps) {
    return (
        <FlatList
            contentContainerClassName="px-content-gutter"
            data={categories}
            horizontal
            ItemSeparatorComponent={ChipSeparator}
            keyExtractor={(category) => category}
            renderItem={({ item: category }) => {
                const isSelected = category === selectedCategory;

                return (
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        activeOpacity={0.82}
                        className={`rounded-pill border px-chip-x py-chip-y ${
                            isSelected
                                ? "border-offer-deep-green bg-offer-deep-green"
                                : "border-offer-border bg-offer-card"
                        }`}
                        onPress={() => onSelect(category)}
                    >
                        <Text
                            className={`text-chip-label font-bold ${
                                isSelected
                                    ? "text-offer-card"
                                    : "text-offer-primary"
                            }`}
                            numberOfLines={1}
                        >
                            {category}
                        </Text>
                    </TouchableOpacity>
                );
            }}
            showsHorizontalScrollIndicator={false}
        />
    );
}
