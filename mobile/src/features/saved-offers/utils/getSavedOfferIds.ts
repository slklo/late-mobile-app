import type { SavedOfferRead } from "../types/savedOffer.types";


export function getSavedOfferIds(
    savedOffers: SavedOfferRead[] | undefined,
): Set<number> {
    return new Set(
        (savedOffers ?? []).map((savedOffer) => savedOffer.offer.id),
    );
}
