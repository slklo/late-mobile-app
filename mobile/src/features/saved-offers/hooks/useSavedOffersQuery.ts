import { queryOptions, useQuery } from "@tanstack/react-query";

import { getSavedOffers } from "../api/savedOffersApi";
import { savedOffersQueryKeys } from "../api/savedOffersQueryKeys";


export function createSavedOffersQueryOptions() {
    return queryOptions({
        queryKey: savedOffersQueryKeys.all,
        queryFn: getSavedOffers,
    });
}


export function useSavedOffersQuery() {
    return useQuery(createSavedOffersQueryOptions());
}
