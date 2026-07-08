import { apiClient } from "@/shared/api/client";
import type { OfferRead } from "../types/offer.types";

export async function getOffers(): Promise<OfferRead[]> {
    const response = await apiClient.get<OfferRead[]>("/offers/")
    return response.data
}

export async function getOfferById(id: number): Promise<OfferRead> {
    const response = await apiClient.get<OfferRead>(`/offers/${id}`);
    return response.data
}