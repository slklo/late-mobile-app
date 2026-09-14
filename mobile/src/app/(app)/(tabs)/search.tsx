import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SearchTabScreen() {
    return (
        <SafeAreaView className="flex-1 bg-offer-background" edges={["top"]}>
            <StatusBar style="dark" />
            <View className="flex-1 items-center justify-center px-7">
                <Text className="text-[22px] font-extrabold text-offer-deep-green">
                    Search
                </Text>
                <Text className="mt-2 text-center text-[14px] leading-[21px] text-offer-muted-text">
                    Search will be added in the next step.
                </Text>
            </View>
        </SafeAreaView>
    );
}
