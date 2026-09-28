import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Text,
    TouchableOpacity,
    type GestureResponderEvent,
} from "react-native";

import { NativeWindSymbol } from "@/shared/ui/nativewindInterop";


type FavoriteHeartButtonSize = "card" | "hero";


type FavoriteHeartButtonProps = {
    accessibilityLabel: string;
    disabled?: boolean;
    isFavorite: boolean;
    onPress?: () => void;
    size?: FavoriteHeartButtonSize;
};


const sizeClasses: Record<FavoriteHeartButtonSize, string> = {
    card: "size-[34px]",
    hero: "size-11",
};


const iconSizes: Record<FavoriteHeartButtonSize, number> = {
    card: 17,
    hero: 20,
};


function FallbackIcon({ children }: { children: string }) {
    return (
        <Text className="text-[13px] font-bold leading-4 text-offer-primary">
            {children}
        </Text>
    );
}


export function FavoriteHeartButton({
    accessibilityLabel,
    disabled = false,
    isFavorite,
    onPress,
    size = "card",
}: FavoriteHeartButtonProps) {
    const [scale] = useState(() => new Animated.Value(1));
    const animation = useRef<Animated.CompositeAnimation | null>(null);
    const isDisabled = disabled || !onPress;

    useEffect(() => () => {
        animation.current?.stop();
    }, []);

    function runPopAnimation() {
        animation.current?.stop();
        scale.setValue(1);

        animation.current = Animated.sequence([
            Animated.timing(scale, {
                duration: 105,
                toValue: 1.4,
                useNativeDriver: true,
            }),
            Animated.timing(scale, {
                duration: 105,
                toValue: 0.85,
                useNativeDriver: true,
            }),
            Animated.timing(scale, {
                duration: 120,
                toValue: 1,
                useNativeDriver: true,
            }),
        ]);

        animation.current.start(({ finished }) => {
            if (finished) {
                animation.current = null;
            }
        });
    }

    function handlePress(event: GestureResponderEvent) {
        event.stopPropagation();

        if (isDisabled) {
            return;
        }

        runPopAnimation();
        onPress?.();
    }

    return (
        <Animated.View style={{ transform: [{ scale }] }}>
            <TouchableOpacity
                accessibilityLabel={accessibilityLabel}
                accessibilityRole="button"
                accessibilityState={{
                    disabled: isDisabled,
                    selected: isFavorite,
                }}
                activeOpacity={0.78}
                className={
                    `${sizeClasses[size]} items-center justify-center rounded-pill border `
                    + (
                        isFavorite
                            ? "border-auth-error-border bg-auth-error"
                            : "border-offer-border bg-offer-card"
                    )
                }
                disabled={isDisabled}
                onPress={handlePress}
            >
                <NativeWindSymbol
                    className={
                        isFavorite
                            ? "text-offer-urgent"
                            : "text-offer-muted-text"
                    }
                    fallback={(
                        <FallbackIcon>
                            {isFavorite ? "♥" : "♡"}
                        </FallbackIcon>
                    )}
                    name={isFavorite ? "heart.fill" : "heart"}
                    size={iconSizes[size]}
                    weight="semibold"
                />
            </TouchableOpacity>
        </Animated.View>
    );
}
