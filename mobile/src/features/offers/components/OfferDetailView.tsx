import { StatusBar } from "expo-status-bar";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";

import { offerColors } from "../theme";
import type { OfferDetailViewModel } from "../types/offerDetail.types";
import { OfferDetailHeader } from "./detail/OfferDetailHeader";
import { OfferDetailHero } from "./detail/OfferDetailHero";
import { OfferDetailInfo } from "./detail/OfferDetailInfo";
import { OfferDetailPickup } from "./detail/OfferDetailPickup";
import { OfferDetailPrice } from "./detail/OfferDetailPrice";

type OfferDetailViewProps = {
    isRefetching: boolean;
    offer: OfferDetailViewModel;
    onBack: () => void;
    onRefresh: () => void;
};

export function OfferDetailView({
    isRefetching,
    offer,
    onBack,
    onRefresh,
}: OfferDetailViewProps) {
    return (
        <View style={styles.screen}>
            <StatusBar style="light" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={(
                    <RefreshControl
                        onRefresh={onRefresh}
                        refreshing={isRefetching}
                        tintColor={offerColors.primary}
                    />
                )}
                showsVerticalScrollIndicator={false}
            >
                <OfferDetailHero offer={offer} onBack={onBack} />

                <View style={styles.contentCard}>
                    <OfferDetailHeader offer={offer} />
                    <OfferDetailInfo offer={offer} />
                    <OfferDetailPickup offer={offer} />
                    <OfferDetailPrice offer={offer} />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    contentCard: {
        backgroundColor: offerColors.background,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        marginTop: -28,
        paddingHorizontal: 20,
        paddingTop: 26,
        position: "relative",
    },
    screen: {
        backgroundColor: offerColors.background,
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 42,
    },
});
