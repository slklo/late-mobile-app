import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NativeWindSymbol } from "@/shared/ui/nativewindInterop";

type LocationHeaderProps = {
    location: string;
    onPress: () => void;
};

export function LocationHeader({
    location,
    onPress,
}: LocationHeaderProps) {
    const insets = useSafeAreaInsets();

    return (
        <View
            className="border-b border-offer-border bg-offer-background px-4 pb-2.5"
            style={{ paddingTop: insets.top + 8 }}
        >
            <TouchableOpacity
                accessibilityHint="Opens location selection"
                accessibilityLabel={`Change location, currently ${location}`}
                accessibilityRole="button"
                activeOpacity={0.78}
                className="min-h-[38px] max-w-full flex-row items-center self-start"
                onPress={onPress}
            >
                <View className="mr-2 size-7 items-center justify-center rounded-pill bg-offer-available-background">
                    <NativeWindSymbol
                        className="text-offer-primary"
                        fallback={(
                            <Text className="text-[14px] font-black leading-[16px] text-offer-primary">
                                ↗
                            </Text>
                        )}
                        name="location.north.fill"
                        size={15}
                        weight="semibold"
                    />
                </View>

                <Text
                    className="shrink-0 text-center text-[13px] font-extrabold text-content-primary"
                    numberOfLines={1}
                >
                    Aktueller Standort
                </Text>

                <Text
                    className="ml-1.5 min-w-0 max-w-[56%] shrink text-center text-[13px] font-medium text-offer-muted-text"
                    numberOfLines={1}
                >
                    {location}
                </Text>

                <NativeWindSymbol
                    className="ml-1.5 text-content-primary"
                    fallback={(
                        <Text className="text-[15px] font-black leading-[16px] text-content-primary">
                            ⌄
                        </Text>
                    )}
                    name="chevron.down"
                    size={14}
                    weight="bold"
                />
            </TouchableOpacity>
        </View>
    );
}
