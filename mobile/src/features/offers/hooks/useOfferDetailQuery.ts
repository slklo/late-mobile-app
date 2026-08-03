import { queryOptions, useQuery } from "@tanstack/react-query";

import { getApiErrorCode } from "../../../shared/api/errors";
import { getOfferById } from "../api/offerApi";

export function isValidOfferId(offerId: number | null): offerId is number {
    return Number.isInteger(offerId) && (offerId ?? 0) > 0;
}

export function createOfferDetailQueryOptions(offerId: number | null) {
    const hasValidOfferId = isValidOfferId(offerId);

    return queryOptions({
        queryKey: ["offers", offerId],
        queryFn: () => {
            if (!hasValidOfferId || offerId === null) {
                throw new Error("A valid offer id is required");
            }

            return getOfferById(offerId);
        },
        enabled: hasValidOfferId,
        retry: (failureCount, error) => (
            getApiErrorCode(error) !== "OFFER_NOT_FOUND"
            && failureCount < 2
        ),
    });
}

export function useOfferDetailQuery(offerId: number | null) {
    return useQuery(createOfferDetailQueryOptions(offerId));
}
