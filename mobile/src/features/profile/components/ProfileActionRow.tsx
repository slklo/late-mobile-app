import type { ComponentProps } from "react";
import {
    Pressable,
    Text,
    View,
} from "react-native";

import { NativeWindSymbol } from "@/shared/ui/nativewindInterop";


type SymbolName = ComponentProps<typeof NativeWindSymbol>["name"];

type ProfileBadgeProps = {
    value: number | string;
};

type ProfileRowIconProps = {
    fallback: string;
    name: SymbolName;
};

type ProfileActionRowProps = {
    badge?: number | string;
    disabled?: boolean;
    hint?: string;
    iconFallback: string;
    iconName: SymbolName;
    isLast?: boolean;
    label: string;
    onPress?: () => void;
    showChevron?: boolean;
};


function ProfileBadge({ value }: ProfileBadgeProps) {
    return (
        <View className="rounded-pill bg-offer-primary px-2 py-[2px]">
            <Text className="text-[10px] font-extrabold text-offer-card">
                {value}
            </Text>
        </View>
    );
}


function ProfileRowIcon({
    fallback,
    name,
}: ProfileRowIconProps) {
    return (
        <View className="size-[34px] items-center justify-center rounded-[11px] bg-offer-secondary">
            <NativeWindSymbol
                className="text-offer-deep-green"
                fallback={(
                    <Text className="text-[13px] font-extrabold text-offer-deep-green">
                        {fallback}
                    </Text>
                )}
                name={name}
                size={17}
                weight="semibold"
            />
        </View>
    );
}


export function ProfileActionRow({
    badge,
    disabled = false,
    hint,
    iconFallback,
    iconName,
    isLast = false,
    label,
    onPress,
    showChevron = true,
}: ProfileActionRowProps) {
    const isPressable = Boolean(onPress) && !disabled;

    return (
        <Pressable
            accessibilityLabel={label}
            accessibilityRole={isPressable ? "button" : undefined}
            accessibilityState={{ disabled }}
            className={
                "min-h-[58px] flex-row items-center gap-3 px-4 py-3"
                + (isLast ? "" : " border-b border-offer-border")
                + (disabled ? " opacity-60" : " active:opacity-80")
            }
            disabled={!isPressable}
            onPress={onPress}
        >
            <ProfileRowIcon fallback={iconFallback} name={iconName} />

            <Text
                className="min-w-0 flex-1 text-[15px] font-bold text-content-primary"
                numberOfLines={1}
            >
                {label}
            </Text>

            {hint ? (
                <Text
                    className="max-w-[96px] text-right text-[12px] font-semibold text-offer-muted-text"
                    numberOfLines={1}
                >
                    {hint}
                </Text>
            ) : null}

            {badge !== undefined ? <ProfileBadge value={badge} /> : null}

            {showChevron ? (
                <NativeWindSymbol
                    className="text-offer-muted-text"
                    fallback={(
                        <Text className="text-[18px] font-bold text-offer-muted-text">
                            ›
                        </Text>
                    )}
                    name="chevron.right"
                    size={14}
                    weight="bold"
                />
            ) : null}
        </Pressable>
    );
}
