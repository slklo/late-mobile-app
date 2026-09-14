import {
    mapOfferToCardViewModel,
    type OfferCardMapperOptions,
} from "../../offers/mappers/offerCard.mapper";
import type { OfferCardViewModel } from "../../offers/types/offerCard.types";

import type { SavedOfferRead } from "../types/savedOffer.types";


export function mapSavedOfferToCardViewModel(
    savedOffer: SavedOfferRead,
    options: OfferCardMapperOptions = {},
): OfferCardViewModel {
    return mapOfferToCardViewModel(savedOffer.offer, options);
}


export function mapSavedOffersToCardViewModels(
    savedOffers: SavedOfferRead[],
    options: OfferCardMapperOptions = {},
): OfferCardViewModel[] {
    return savedOffers.map((savedOffer) => (
        mapSavedOfferToCardViewModel(savedOffer, options)
    ));
}
