import { StatusBar } from "expo-status-bar";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore } from "@/features/auth/store/authStore";
import type { CurrentUser } from "@/features/auth/types/auth.types";
import { ProfileActionRow } from "@/features/profile/components/ProfileActionRow";
import { ProfileSection } from "@/features/profile/components/ProfileSection";


function getEmailPrefix(email: string | undefined): string | null {
    const prefix = email?.split("@")[0]?.trim();

    return prefix || null;
}


function getProfileDisplayName(user: CurrentUser | null): string {
    const fullName = user?.full_name?.trim();

    if (fullName) {
        return fullName;
    }

    return getEmailPrefix(user?.email) ?? "LatePlate user";
}


function getProfileInitials(user: CurrentUser | null): string {
    const displayName = getProfileDisplayName(user);
    const words = displayName
        .replace(/[^A-Za-z0-9@\s._-]/g, " ")
        .split(/[\s._-]+/)
        .filter(Boolean);

    if (words.length >= 2) {
        return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }

    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }

    return "LP";
}


function formatMemberSince(value: string | null | undefined): string | null {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat("en-IE", {
        month: "long",
        year: "numeric",
    }).format(date);
}


export default function ProfileTabScreen() {
    const user = useAuthStore((state) => state.user);
    const displayName = getProfileDisplayName(user);
    const initials = getProfileInitials(user);
    const memberSince = formatMemberSince(user?.created_at);

    return (
        <SafeAreaView className="flex-1 bg-offer-background" edges={["top"]}>
            <StatusBar style="dark" />
            <ScrollView
                className="flex-1"
                contentContainerClassName="px-5 pb-10 pt-[18px]"
                showsVerticalScrollIndicator={false}
            >
                <Text className="text-2xl font-extrabold tracking-[-0.4px] text-offer-deep-green">
                    Profile
                </Text>
                <Text className="mt-[5px] text-label text-offer-muted-text">
                    Your LatePlate account.
                </Text>

                <View className="mt-5 rounded-card border border-offer-border bg-offer-card p-5 shadow-offer-tile elevation-offer-tile">
                    <View className="flex-row items-center gap-4">
                        <View className="size-16 items-center justify-center rounded-full bg-offer-deep-green">
                            <Text
                                className="text-[22px] font-extrabold text-offer-card"
                                numberOfLines={1}
                            >
                                {initials}
                            </Text>
                        </View>

                        <View className="min-w-0 flex-1">
                            <Text
                                className="text-xl font-extrabold text-content-primary"
                                numberOfLines={1}
                            >
                                {displayName}
                            </Text>
                            <Text
                                className="mt-1 text-[14px] leading-5 text-offer-muted-text"
                                numberOfLines={1}
                            >
                                {user?.email ?? "No email available"}
                            </Text>

                            <View className="mt-3 self-start rounded-pill border border-offer-metadata-border bg-offer-secondary px-3 py-[6px]">
                                <Text className="text-[11px] font-extrabold text-offer-deep-green">
                                    Food Rescuer
                                </Text>
                            </View>
                        </View>
                    </View>

                    {memberSince ? (
                        <View className="mt-4 border-t border-offer-border pt-4">
                            <Text className="text-xs font-semibold text-offer-muted-text">
                                Member since {memberSince}
                            </Text>
                        </View>
                    ) : null}
                </View>

                <View className="mt-6">
                    <ProfileSection title="ACTIVITY">
                        <ProfileActionRow
                            badge={0}
                            disabled
                            hint="Soon"
                            iconFallback="☰"
                            iconName="list.bullet.rectangle"
                            label="My Orders"
                        />
                        <ProfileActionRow
                            disabled
                            hint="Soon"
                            iconFallback="♡"
                            iconName="heart"
                            label="Saved Offers"
                        />
                        <ProfileActionRow
                            disabled
                            hint="Soon"
                            iconFallback="!"
                            iconName="bell"
                            label="Notifications"
                        />
                        <ProfileActionRow
                            disabled
                            hint="Soon"
                            iconFallback="?"
                            iconName="questionmark.circle"
                            isLast
                            label="Help & Support"
                        />
                    </ProfileSection>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
