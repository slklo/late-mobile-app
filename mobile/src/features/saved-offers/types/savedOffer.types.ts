import type { OfferRead } from "@/features/offers/types/offer.types";

// TODO: Replace with generated OpenAPI SavedOfferRead once the backend
// schema has been regenerated for the saved-offers contract.
export type SavedOfferRead = {
    id: number;
    created_at: string;
    offer: OfferRead;
};
