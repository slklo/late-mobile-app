import { apiClient } from "@/shared/api/client";

import type { SavedOfferRead } from "../types/savedOffer.types";


export async function getSavedOffers(): Promise<SavedOfferRead[]> {
    const response = await apiClient.get<SavedOfferRead[]>("/saved-offers/");
    return response.data;
}


export async function addSavedOffer(
    offerId: number,
): Promise<SavedOfferRead> {
    const response = await apiClient.post<SavedOfferRead>(
        `/saved-offers/${offerId}/`,
    );
    return response.data;
}


export async function removeSavedOffer(offerId: number): Promise<void> {
    await apiClient.delete(`/saved-offers/${offerId}/`);
}
