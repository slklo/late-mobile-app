export type RestaurantPreview = {
    id: number;
    name: string;
    address: string;
    image_url: string | null;
}

export type CategoryPreview = {
    id: number;
    name: string;
    slug: string;
}

export type OfferRead = {
    id: number;
    title: string;
    description: string | null
    image_url: string | null;
    original_price: string;
    discounted_price: string;
    quantity_available: number;
    pickup_start: string;
    pickup_end: string;
    is_active: boolean;
    restaurant: RestaurantPreview;
    category: CategoryPreview;
}