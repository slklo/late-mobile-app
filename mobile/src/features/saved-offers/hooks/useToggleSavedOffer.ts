import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { OfferRead } from "@/features/offers/types/offer.types";

import {
    addSavedOffer,
    removeSavedOffer,
} from "../api/savedOffersApi";
import { savedOffersQueryKeys } from "../api/savedOffersQueryKeys";
import type { SavedOfferRead } from "../types/savedOffer.types";


export type ToggleSavedOfferInput = {
    offer?: OfferRead;
    offerId: number;
    isCurrentlySaved: boolean;
};

type ToggleSavedOfferContext = {
    previousSavedOffers: SavedOfferRead[] | undefined;
};


function createOptimisticSavedOffer(
    offer: OfferRead,
): SavedOfferRead {
    return {
        created_at: new Date().toISOString(),
        id: -offer.id,
        offer,
    };
}


function addOptimisticSavedOffer(
    currentSavedOffers: SavedOfferRead[] | undefined,
    offer: OfferRead | undefined,
): SavedOfferRead[] | undefined {
    if (offer === undefined) {
        return currentSavedOffers;
    }

    const current = currentSavedOffers ?? [];
    const alreadySaved = current.some(
        (savedOffer) => savedOffer.offer.id === offer.id,
    );

    if (alreadySaved) {
        return current;
    }

    return [createOptimisticSavedOffer(offer), ...current];
}


function removeOptimisticSavedOffer(
    currentSavedOffers: SavedOfferRead[] | undefined,
    offerId: number,
): SavedOfferRead[] {
    return (currentSavedOffers ?? []).filter(
        (savedOffer) => savedOffer.offer.id !== offerId,
    );
}


export function useToggleSavedOffer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            offerId,
            isCurrentlySaved,
        }: ToggleSavedOfferInput) => {
            if (isCurrentlySaved) {
                await removeSavedOffer(offerId);
                return undefined;
            }

            return addSavedOffer(offerId);
        },
        onError: (_error, _variables, context) => {
            queryClient.setQueryData(
                savedOffersQueryKeys.all,
                context?.previousSavedOffers,
            );
        },
        onMutate: async ({
            isCurrentlySaved,
            offer,
            offerId,
        }: ToggleSavedOfferInput): Promise<ToggleSavedOfferContext> => {
            await queryClient.cancelQueries({
                queryKey: savedOffersQueryKeys.all,
            });

            const previousSavedOffers = (
                queryClient.getQueryData<SavedOfferRead[]>(
                    savedOffersQueryKeys.all,
                )
            );

            queryClient.setQueryData<SavedOfferRead[] | undefined>(
                savedOffersQueryKeys.all,
                (currentSavedOffers) => (
                    isCurrentlySaved
                        ? removeOptimisticSavedOffer(
                            currentSavedOffers,
                            offerId,
                        )
                        : addOptimisticSavedOffer(
                            currentSavedOffers,
                            offer,
                        )
                ),
            );

            return { previousSavedOffers };
        },
        onSettled: async () => {
            await queryClient.invalidateQueries({
                queryKey: savedOffersQueryKeys.all,
            });
        },
        onSuccess: (savedOffer, variables) => {
            if (variables.isCurrentlySaved || savedOffer === undefined) {
                return;
            }

            queryClient.setQueryData<SavedOfferRead[] | undefined>(
                savedOffersQueryKeys.all,
                (currentSavedOffers) => {
                    const current = currentSavedOffers ?? [];
                    const withoutOptimistic = current.filter(
                        (item) => item.offer.id !== savedOffer.offer.id,
                    );

                    return [savedOffer, ...withoutOptimistic];
                },
            );
        },
    });
}
