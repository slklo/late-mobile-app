import type { OfferCardViewModel } from "../types/offerCard.types";

export const ALL_CATEGORIES = "All";

export function getExploreCategories(
    offers: OfferCardViewModel[],
): string[] {
    const categoryNames = offers.map((offer) => offer.categoryName);

    return [ALL_CATEGORIES, ...new Set(categoryNames)];
}

export function filterOffersByCategory(
    offers: OfferCardViewModel[],
    categoryName: string,
): OfferCardViewModel[] {
    if (categoryName === ALL_CATEGORIES) {
        return offers;
    }

    return offers.filter((offer) => offer.categoryName === categoryName);
}

export function splitOffersForExplore(offers: OfferCardViewModel[]): {
    inArea: OfferCardViewModel[];
    recommended: OfferCardViewModel[];
} {
    const recommended: OfferCardViewModel[] = [];
    const inArea: OfferCardViewModel[] = [];

    offers.forEach((offer, index) => {
        if (index % 2 === 0) {
            recommended.push(offer);
        } else {
            inArea.push(offer);
        }
    });

    return { inArea, recommended };
}
