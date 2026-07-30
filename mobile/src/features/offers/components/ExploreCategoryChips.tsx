import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { offerColors } from "../theme";

type ExploreCategoryChipsProps = {
    categories: string[];
    onSelect: (category: string) => void;
    selectedCategory: string;
};

function ChipSeparator() {
    return <View style={styles.separator} />;
}

export function ExploreCategoryChips({
    categories,
    onSelect,
    selectedCategory,
}: ExploreCategoryChipsProps) {
    return (
        <FlatList
            contentContainerStyle={styles.content}
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
                        onPress={() => onSelect(category)}
                        style={[
                            styles.chip,
                            isSelected && styles.selectedChip,
                        ]}
                    >
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.label,
                                isSelected && styles.selectedLabel,
                            ]}
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

const styles = StyleSheet.create({
    chip: {
        backgroundColor: offerColors.card,
        borderColor: offerColors.border,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 15,
        paddingVertical: 9,
    },
    content: {
        paddingHorizontal: 16,
    },
    label: {
        color: offerColors.primary,
        fontSize: 13,
        fontWeight: "700",
    },
    selectedChip: {
        backgroundColor: offerColors.deepGreen,
        borderColor: offerColors.deepGreen,
    },
    selectedLabel: {
        color: offerColors.card,
    },
    separator: {
        width: 9,
    },
});
