export type OfferBadgeType =
    | "new"
    | "discount"
    | "urgent"
    | "sold_out"
    | "expired";

export type OfferCardBadge = {
    label: string;
    type: OfferBadgeType;
};

export type OfferCardViewModel = {
    id: number;
    offerTitle: string;
    subtitle: string;
    restaurantName: string;
    categoryName: string;
    imageUrl: string | null;
    imagePlaceholderLabel: string;
    pickupWindowLabel: string;
    distanceLabel: string | null;
    originalPriceLabel: string;
    discountedPriceLabel: string;
    badge: OfferCardBadge | null;
    isSoldOut: boolean;
    isExpired: boolean;
};
