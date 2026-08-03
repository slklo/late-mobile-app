import { useLocalSearchParams, useRouter } from "expo-router";

import { OfferDetailView } from "@/features/offers/components/OfferDetailView";
import { OfferDetailState } from "@/features/offers/components/OfferDetailState";
import { useOfferDetailQuery } from "@/features/offers/hooks/useOfferDetailQuery";
import { mapOfferToDetailViewModel } from "@/features/offers/mappers/offerDetail.mapper";
import { getApiErrorCode } from "@/shared/api/errors";

function parseOfferId(value: string | string[] | undefined): number | null {
    const rawValue = Array.isArray(value) ? value[0] : value;
    const parsedValue = Number(rawValue);

    return Number.isInteger(parsedValue) && parsedValue > 0
        ? parsedValue
        : null;
}

export default function OfferDetailRoute() {
    const { offerId: offerIdParam } = useLocalSearchParams<{
        offerId?: string | string[];
    }>();
    const router = useRouter();
    const offerId = parseOfferId(offerIdParam);
    const offerQuery = useOfferDetailQuery(offerId);

    function handleBack() {
        if (router.canGoBack()) {
            router.back();
            return;
        }

        router.replace("/");
    }

    if (offerId === null) {
        return (
            <OfferDetailState
                description="This offer link is invalid. Return to Explore and choose an offer again."
                onBack={handleBack}
                title="Offer unavailable"
            />
        );
    }

    if (offerQuery.isPending) {
        return (
            <OfferDetailState
                description="We are loading the latest offer information."
                isLoading
                onBack={handleBack}
                title="Loading offer"
            />
        );
    }

    if (offerQuery.isError) {
        const isNotFound = (
            getApiErrorCode(offerQuery.error) === "OFFER_NOT_FOUND"
        );

        return (
            <OfferDetailState
                actionLabel={isNotFound ? undefined : "Try again"}
                description={
                    isNotFound
                        ? "This offer no longer exists or is unavailable."
                        : "We could not load this offer. Please check your connection and try again."
                }
                onAction={
                    isNotFound
                        ? undefined
                        : () => void offerQuery.refetch()
                }
                onBack={handleBack}
                title={isNotFound ? "Offer not found" : "Something went wrong"}
            />
        );
    }

    return (
        <OfferDetailView
            offer={mapOfferToDetailViewModel(offerQuery.data)}
            onBack={handleBack}
        />
    );
}
