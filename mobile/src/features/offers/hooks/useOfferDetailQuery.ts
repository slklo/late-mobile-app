import { useQuery } from "@tanstack/react-query";

import { getOfferById } from "../api/offerApi";

export function useOfferDetailQuery(id: number | null) {
    return useQuery({
        queryKey: ["offers", id],
        queryFn: () => {
            if (id === null) {
                throw new Error("A valid offer id is required");
            }

            return getOfferById(id);
        },
        enabled: id !== null,
    });
}
