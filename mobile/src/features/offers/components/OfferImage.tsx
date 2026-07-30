import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

type OfferImageProps = {
    height?: number;
    imageUrl?: string | null;
    offerTitle: string;
    placeholderLabel?: string;
};

export function OfferImage({
    height = 156,
    imageUrl,
    offerTitle,
    placeholderLabel = "LatePlate",
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
                style={[styles.frame, styles.placeholder, { height }]}
            >
                <View style={styles.placeholderMark} />
                <Text numberOfLines={1} style={styles.placeholderText}>
                    {placeholderLabel}
                </Text>
            </View>
        );
    }

    return (
        <Image
            accessibilityLabel={offerTitle}
            cachePolicy="memory-disk"
            contentFit="cover"
            onError={() => setFailedUrl(normalizedUrl)}
            recyclingKey={normalizedUrl}
            source={{ uri: normalizedUrl }}
            style={[styles.frame, { height }]}
            transition={150}
        />
    );
}

const styles = StyleSheet.create({
    frame: {
        backgroundColor: "#EDE8DC",
        width: "100%",
    },
    placeholder: {
        alignItems: "center",
        justifyContent: "center",
    },
    placeholderMark: {
        backgroundColor: "#2A4E18",
        borderRadius: 999,
        height: 10,
        marginBottom: 8,
        opacity: 0.75,
        width: 10,
    },
    placeholderText: {
        color: "#52634A",
        fontSize: 14,
        fontWeight: "700",
        letterSpacing: 0.3,
        maxWidth: "80%",
    },
});
