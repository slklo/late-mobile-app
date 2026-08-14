import { useState } from "react";
import { Text, View } from "react-native";

import { NativeWindImage } from "@/shared/ui/nativewindInterop";

type OfferImageProps = {
    imageUrl?: string | null;
    offerTitle: string;
    placeholderLabel?: string;
    variant?: "card" | "hero";
};

const heightClasses = {
    card: "h-offer-card-image",
    hero: "h-offer-hero",
} as const;

export function OfferImage({
    imageUrl,
    offerTitle,
    placeholderLabel = "LatePlate",
    variant = "card",
}: OfferImageProps) {
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const normalizedUrl = imageUrl?.trim() || null;
    const shouldShowPlaceholder = (
        normalizedUrl === null || failedUrl === normalizedUrl
    );

    if (shouldShowPlaceholder) {
        return (
            <View
                accessibilityLabel={`No image available for ${offerTitle}`}
                className={`w-full items-center justify-center bg-offer-secondary ${heightClasses[variant]}`}
            >
                <View className="mb-2 size-2.5 rounded-pill bg-offer-primary opacity-75" />
                <Text
                    className="max-w-[80%] text-[14px] font-bold tracking-[0.3px] text-offer-placeholder-text"
                    numberOfLines={1}
                >
                    {placeholderLabel}
                </Text>
            </View>
        );
    }

    return (
        <NativeWindImage
            accessibilityLabel={offerTitle}
            cachePolicy="memory-disk"
            className={`w-full bg-offer-secondary ${heightClasses[variant]}`}
            contentFit="cover"
            onError={() => setFailedUrl(normalizedUrl)}
            recyclingKey={normalizedUrl}
            source={{ uri: normalizedUrl }}
            transition={150}
        />
    );
}
