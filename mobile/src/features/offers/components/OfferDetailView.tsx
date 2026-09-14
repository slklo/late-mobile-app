import { StatusBar } from "expo-status-bar";
import { ScrollView, View } from "react-native";

import { NativeWindRefreshControl } from "@/shared/ui/nativewindInterop";

import type { OfferDetailViewModel } from "../types/offerDetail.types";
import { OfferDetailHeader } from "./detail/OfferDetailHeader";
import { OfferDetailHero } from "./detail/OfferDetailHero";
import { OfferDetailInfo } from "./detail/OfferDetailInfo";
import { OfferDetailPickup } from "./detail/OfferDetailPickup";
import { OfferDetailPrice } from "./detail/OfferDetailPrice";

type OfferDetailViewProps = {
    isFavorite?: boolean;
    isFavoriteUpdating?: boolean;
    isRefetching: boolean;
    offer: OfferDetailViewModel;
    onBack: () => void;
    onRefresh: () => void;
    onToggleFavorite?: () => void;
};

export function OfferDetailView({
    isFavorite,
    isFavoriteUpdating,
    isRefetching,
    offer,
    onBack,
    onRefresh,
    onToggleFavorite,
}: OfferDetailViewProps) {
    return (
        <View className="flex-1 bg-offer-background">
            <StatusBar style="light" />
            <ScrollView
                contentContainerClassName="pb-[42px]"
                refreshControl={(
                    <NativeWindRefreshControl
                        className="text-offer-primary"
                        onRefresh={onRefresh}
                        refreshing={isRefetching}
                    />
                )}
                showsVerticalScrollIndicator={false}
            >
                <OfferDetailHero
                    isFavorite={isFavorite}
                    isFavoriteUpdating={isFavoriteUpdating}
                    offer={offer}
                    onBack={onBack}
                    onToggleFavorite={onToggleFavorite}
                />

                <View className="relative -mt-7 rounded-t-detail-shell bg-offer-background px-5 pt-[26px]">
                    <OfferDetailHeader offer={offer} />
                    <OfferDetailInfo offer={offer} />
                    <OfferDetailPickup offer={offer} />
                    <OfferDetailPrice offer={offer} />
                </View>
            </ScrollView>
        </View>
    );
}
