import { useQuery } from "@tanstack/react-query";

import { getOfferById } from "../api/offerApi";

export function useOfferDetailQuery(id: number) {
    return useQuery({
        queryKey: ["offers", id],
        queryFn: () => getOfferById(id),
        enabled: Number.isFinite(id),
    });
}