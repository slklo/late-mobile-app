export type OfferDetailViewModel = {
    id: number;
    title: string;
    description: string;
    restaurantName: string;
    restaurantAddress: string;
    categoryName: string;
    imageUrl: string | null;
    imagePlaceholderLabel: string;
    pickupDateLabel: string;
    pickupWindowLabel: string;
    originalPriceLabel: string;
    discountedPriceLabel: string;
    savingsLabel: string | null;
    quantityLabel: string;
    statusLabel: string;
    isAvailable: boolean;
    unavailableReason: string | null;
};
