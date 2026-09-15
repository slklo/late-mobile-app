import type { ReactNode } from "react";
import { Text, View } from "react-native";


type ProfileSectionTitleProps = {
    children: string;
};


type ProfileSectionProps = {
    children: ReactNode;
    title: string;
};


export function ProfileSectionTitle({
    children,
}: ProfileSectionTitleProps) {
    return (
        <Text className="px-1 text-[11px] font-extrabold uppercase tracking-[1px] text-offer-muted-text">
            {children}
        </Text>
    );
}


export function ProfileSection({
    children,
    title,
}: ProfileSectionProps) {
    return (
        <View className="gap-2.5">
            <ProfileSectionTitle>{title}</ProfileSectionTitle>
            <View className="overflow-hidden rounded-card border border-offer-border bg-offer-card shadow-offer-tile elevation-offer-tile">
                {children}
            </View>
        </View>
    );
}
