import { useQuery } from "@tanstack/react-query";

import { getApiErrorCode } from "@/shared/api/errors";
import { getOfferById } from "../api/offerApi";

export function useOfferDetailQuery(offerId: number | null) {
    const hasValidOfferId = (
        Number.isInteger(offerId) && (offerId ?? 0) > 0
    );

    return useQuery({
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
