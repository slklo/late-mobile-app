import { useQuery } from "@tanstack/react-query";

import { getOffers } from "../api/offerApi";

export function useOffersQuery() {
    return useQuery({
        queryKey: ["offers"],
        queryFn: getOffers,
    });
}
