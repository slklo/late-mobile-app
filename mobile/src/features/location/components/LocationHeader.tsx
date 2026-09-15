import { Text, TouchableOpacity, View } from "react-native";

import { NativeWindSymbol } from "@/shared/ui/nativewindInterop";

type LocationHeaderProps = {
    location: string;
    onPress: () => void;
};

export function LocationHeader({
    location,
    onPress,
}: LocationHeaderProps) {
    return (
        <View className="bg-offer-background px-5 pt-4">
            <TouchableOpacity
                accessibilityHint="Opens location selection"
                accessibilityLabel={`Change location, currently ${location}`}
                accessibilityRole="button"
                activeOpacity={0.78}
                className="flex-row items-center"
                onPress={onPress}
            >
                <View className="mr-2.5 size-8 items-center justify-center rounded-pill bg-offer-available-background">
                    <NativeWindSymbol
                        className="text-offer-primary"
                        fallback={(
                            <Text className="text-[16px] font-black leading-[18px] text-offer-primary">
                                ↗
                            </Text>
                        )}
                        name="location.north.fill"
                        size={17}
                        weight="semibold"
                    />
                </View>

                <Text
                    className="shrink-0 text-[15px] font-extrabold text-content-primary"
                    numberOfLines={1}
                >
                    Aktueller Standort
                </Text>

                <Text
                    className="ml-2 min-w-0 flex-1 text-[15px] font-medium text-offer-muted-text"
                    numberOfLines={1}
                >
                    {location}
                </Text>

                <NativeWindSymbol
                    className="ml-2 text-content-primary"
                    fallback={(
                        <Text className="text-[17px] font-black leading-[18px] text-content-primary">
                            ⌄
                        </Text>
                    )}
                    name="chevron.down"
                    size={16}
                    weight="bold"
                />
            </TouchableOpacity>
        </View>
    );
}
