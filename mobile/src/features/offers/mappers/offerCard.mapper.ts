import type { OfferRead } from "../types/offer.types";
import type {
    OfferCardBadge,
    OfferCardViewModel,
} from "../types/offerCard.types";

const DEFAULT_LOCALE = "en-IE";
const DEFAULT_CURRENCY = "EUR";
const DEFAULT_DISTANCE_LABEL = "Nearby";
const UNAVAILABLE_PRICE_LABEL = "—";
const UNAVAILABLE_PICKUP_LABEL = "Pickup time unavailable";

export type OfferCardMapperOptions = {
    currency?: string;
    distanceLabel?: string | null;
    locale?: string;
    now?: Date;
    timeZone?: string;
};

function parsePrice(value: string): number | null {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) && parsedValue >= 0
        ? parsedValue
        : null;
}

function formatPrice(
    value: number | null,
    locale: string,
    currency: string,
): string {
    if (value === null) {
        return UNAVAILABLE_PRICE_LABEL;
    }

    return new Intl.NumberFormat(locale, {
        currency,
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
        style: "currency",
    }).format(value);
}

function parseDate(value: string): Date | null {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatPickupWindow(
    pickupStart: Date | null,
    pickupEnd: Date | null,
    locale: string,
    timeZone?: string,
): string {
    if (pickupStart === null || pickupEnd === null) {
        return UNAVAILABLE_PICKUP_LABEL;
    }

    const formatter = new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        hour12: false,
        minute: "2-digit",
        ...(timeZone ? { timeZone } : {}),
    });

    return `${formatter.format(pickupStart)}–${formatter.format(pickupEnd)}`;
}

function calculateDiscountPercentage(
    originalPrice: number | null,
    discountedPrice: number | null,
): number | null {
    if (
        originalPrice === null ||
        discountedPrice === null ||
        originalPrice <= 0 ||
        discountedPrice >= originalPrice
    ) {
        return null;
    }

    return Math.round(
        ((originalPrice - discountedPrice) / originalPrice) * 100,
    );
}

function getBadge({
    discountPercentage,
    isExpired,
    isSoldOut,
    quantityAvailable,
}: {
    discountPercentage: number | null;
    isExpired: boolean;
    isSoldOut: boolean;
    quantityAvailable: number;
}): OfferCardBadge | null {
    if (isExpired) {
        return { label: "Expired", type: "expired" };
    }

    if (isSoldOut) {
        return { label: "Sold out", type: "sold_out" };
    }

    if (quantityAvailable <= 2) {
        return {
            label: `Only ${quantityAvailable} left`,
            type: "urgent",
        };
    }

    if (discountPercentage !== null) {
        return {
            label: `-${discountPercentage}%`,
            type: "discount",
        };
    }

    return null;
}

export function mapOfferToCardViewModel(
    offer: OfferRead,
    options: OfferCardMapperOptions = {},
): OfferCardViewModel {
    const {
        currency = DEFAULT_CURRENCY,
        distanceLabel = DEFAULT_DISTANCE_LABEL,
        locale = DEFAULT_LOCALE,
        now = new Date(),
        timeZone,
    } = options;
    const originalPrice = parsePrice(offer.original_price);
    const discountedPrice = parsePrice(offer.discounted_price);
    const pickupStart = parseDate(offer.pickup_start);
    const pickupEnd = parseDate(offer.pickup_end);
    const isExpired = (
        pickupEnd !== null && pickupEnd.getTime() <= now.getTime()
    );
    const isSoldOut = offer.quantity_available <= 0;
    const discountPercentage = calculateDiscountPercentage(
        originalPrice,
        discountedPrice,
    );
    const description = offer.description?.trim();
    const imageUrl = offer.image_url?.trim() || null;

    return {
        badge: getBadge({
            discountPercentage,
            isExpired,
            isSoldOut,
            quantityAvailable: offer.quantity_available,
        }),
        categoryName: offer.category.name,
        discountedPriceLabel: formatPrice(
            discountedPrice,
            locale,
            currency,
        ),
        distanceLabel,
        id: offer.id,
        imagePlaceholderLabel: offer.category.name || "LatePlate",
        imageUrl,
        isExpired,
        isSoldOut,
        offerTitle: offer.title,
        originalPriceLabel: formatPrice(
            originalPrice,
            locale,
            currency,
        ),
        pickupWindowLabel: formatPickupWindow(
            pickupStart,
            pickupEnd,
            locale,
            timeZone,
        ),
        restaurantName: offer.restaurant.name,
        subtitle: description || offer.category.name,
    };
}

export function mapOffersToCardViewModels(
    offers: OfferRead[],
    options: OfferCardMapperOptions = {},
): OfferCardViewModel[] {
    return offers.map((offer) => mapOfferToCardViewModel(offer, options));
}
