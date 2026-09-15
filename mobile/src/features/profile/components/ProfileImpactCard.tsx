import { Text, View } from "react-native";


type ProfileImpactCardProps = {
    accent?: boolean;
    label: string;
    value: string;
};


export function ProfileImpactCard({
    accent = false,
    label,
    value,
}: ProfileImpactCardProps) {
    return (
        <View className="min-w-0 flex-1 rounded-[18px] border border-offer-border bg-offer-card px-3 py-3.5">
            <Text
                className={
                    "text-center text-[20px] font-extrabold"
                    + (
                        accent
                            ? " text-offer-deep-green"
                            : " text-content-primary"
                    )
                }
                numberOfLines={1}
            >
                {value}
            </Text>
            <Text
                className="mt-1 text-center text-[11px] font-semibold leading-4 text-offer-muted-text"
                numberOfLines={2}
            >
                {label}
            </Text>
        </View>
    );
}
