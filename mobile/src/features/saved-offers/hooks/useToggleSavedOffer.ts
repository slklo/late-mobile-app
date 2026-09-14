import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
    addSavedOffer,
    removeSavedOffer,
} from "../api/savedOffersApi";
import { savedOffersQueryKeys } from "../api/savedOffersQueryKeys";


export type ToggleSavedOfferInput = {
    offerId: number;
    isCurrentlySaved: boolean;
};


export function useToggleSavedOffer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            offerId,
            isCurrentlySaved,
        }: ToggleSavedOfferInput) => {
            if (isCurrentlySaved) {
                await removeSavedOffer(offerId);
                return;
            }

            await addSavedOffer(offerId);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: savedOffersQueryKeys.all,
            });
        },
    });
}
