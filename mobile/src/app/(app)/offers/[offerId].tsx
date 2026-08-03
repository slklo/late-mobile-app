import { useLocalSearchParams, useRouter } from "expo-router";

import { OfferDetailView } from "@/features/offers/components/OfferDetailView";
import { OfferDetailState } from "@/features/offers/components/detail/OfferDetailState";
import { useOfferDetailQuery } from "@/features/offers/hooks/useOfferDetailQuery";
import { mapOfferToDetailViewModel } from "@/features/offers/mappers/offerDetail.mapper";
import {
    getApiErrorCode,
    getApiErrorMessage,
} from "@/shared/api/errors";

type OfferIdResult = {
    error: "invalid" | "missing" | null;
    value: number | null;
};

function parseOfferId(
    value: string | string[] | undefined,
): OfferIdResult {
    const rawValue = Array.isArray(value) ? value[0] : value;

    if (rawValue === undefined || rawValue.trim() === "") {
        return { error: "missing", value: null };
    }

    const parsedValue = Number(rawValue);

    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        return { error: "invalid", value: null };
    }

    return { error: null, value: parsedValue };
}

export default function OfferDetailRoute() {
    const { offerId: offerIdParam } = useLocalSearchParams<{
        offerId?: string | string[];
    }>();
    const router = useRouter();
    const offerIdResult = parseOfferId(offerIdParam);
    const offerQuery = useOfferDetailQuery(offerIdResult.value);

    function handleBack() {
        if (router.canGoBack()) {
            router.back();
            return;
        }

        router.replace("/");
    }

    function handleExplore() {
        router.replace("/");
    }

    if (offerIdResult.error !== null) {
        return (
            <OfferDetailState
                description={
                    offerIdResult.error === "missing"
                        ? "No offer was selected. Return to Explore and choose an offer."
                        : "This offer link contains an invalid ID. Return to Explore and choose an offer again."
                }
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
                actionLabel={isNotFound ? "Back to Explore" : "Try again"}
                description={
                    isNotFound
                        ? "It may have been removed or is no longer being offered."
                        : getApiErrorMessage(
                            offerQuery.error,
                            "We could not load this offer. Please try again.",
                        )
                }
                onAction={
                    isNotFound
                        ? handleExplore
                        : () => void offerQuery.refetch()
                }
                onBack={handleBack}
                title={
                    isNotFound
                        ? "This offer is no longer available"
                        : "Something went wrong"
                }
            />
        );
    }

    return (
        <OfferDetailView
            isRefetching={offerQuery.isRefetching}
            offer={mapOfferToDetailViewModel(offerQuery.data)}
            onBack={handleBack}
            onRefresh={() => void offerQuery.refetch()}
        />
    );
}
