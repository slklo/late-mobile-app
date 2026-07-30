import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

type OfferImageProps = {
    imageUrl?: string | null;
    offerTitle: string;
};

export function OfferImage({ imageUrl, offerTitle }: OfferImageProps) {
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const normalizedUrl = imageUrl?.trim() || null;
    const shouldShowPlaceholder = (
        normalizedUrl === null || failedUrl === normalizedUrl
    );

    if (shouldShowPlaceholder) {
        return (
            <View
                accessibilityLabel={`No image available for ${offerTitle}`}
                style={[styles.frame, styles.placeholder]}
            >
                <View style={styles.placeholderMark} />
                <Text style={styles.placeholderText}>LatePlate</Text>
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
            style={styles.frame}
            transition={150}
        />
    );
}

const styles = StyleSheet.create({
    frame: {
        backgroundColor: "#EDE8DC",
        height: 160,
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
    },
});
