import type { OfferRead } from "../types/offer.types";
import type { OfferDetailViewModel } from "../types/offerDetail.types";

const DEFAULT_CURRENCY = "EUR";
const DEFAULT_LOCALE = "en-IE";
const DESCRIPTION_FALLBACK = (
    "The restaurant has not added a description for this offer."
);
const INVALID_DATE_LABEL = "Date unavailable";
const INVALID_PICKUP_WINDOW_LABEL = "Pickup time unavailable";
const INVALID_PRICE_LABEL = "\u2014";

export type OfferDetailMapperOptions = {
    currency?: string;
    locale?: string;
    now?: Date;
    timeZone?: string;
};

function parseDate(value: string): Date | null {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function parsePrice(value: string): number | null {
    const price = Number(value);

    return Number.isFinite(price) && price >= 0 ? price : null;
}

function createPriceFormatter(locale: string, currency: string) {
    return new Intl.NumberFormat(locale, {
        currency,
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
        style: "currency",
    });
}

function formatPrice(
    price: number | null,
    formatter: Intl.NumberFormat,
): string {
    return price === null ? INVALID_PRICE_LABEL : formatter.format(price);
}

function formatPickupDate(
    pickupStart: Date | null,
    locale: string,
    timeZone?: string,
): string {
    if (pickupStart === null) {
        return INVALID_DATE_LABEL;
    }

    return new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        weekday: "long",
        ...(timeZone ? { timeZone } : {}),
    }).format(pickupStart);
}

function formatPickupWindow(
    pickupStart: Date | null,
    pickupEnd: Date | null,
    locale: string,
    timeZone?: string,
): string {
    if (pickupStart === null || pickupEnd === null) {
        return INVALID_PICKUP_WINDOW_LABEL;
    }

    const formatter = new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        hour12: false,
        minute: "2-digit",
        ...(timeZone ? { timeZone } : {}),
    });

    return `${formatter.format(pickupStart)}\u2013${formatter.format(pickupEnd)}`;
}

function getQuantityLabel(quantity: number): string {
    if (quantity <= 0) {
        return "No items available";
    }

    return quantity === 1
        ? "1 item available"
        : `${quantity} items available`;
}

function getAvailability({
    isActive,
    pickupEnd,
    quantityAvailable,
    now,
}: {
    isActive: boolean;
    pickupEnd: Date | null;
    quantityAvailable: number;
    now: Date;
}): Pick<
    OfferDetailViewModel,
    "isAvailable" | "statusLabel" | "unavailableReason"
> {
    if (!isActive) {
        return {
            isAvailable: false,
            statusLabel: "Unavailable",
            unavailableReason: "This offer is no longer active.",
        };
    }

    if (quantityAvailable <= 0) {
        return {
            isAvailable: false,
            statusLabel: "Sold out",
            unavailableReason: "This offer is currently sold out.",
        };
    }

    if (pickupEnd !== null && pickupEnd.getTime() <= now.getTime()) {
        return {
            isAvailable: false,
            statusLabel: "Expired",
            unavailableReason: "The pickup window for this offer has ended.",
        };
    }

    return {
        isAvailable: true,
        statusLabel: "Available",
        unavailableReason: null,
    };
}

export function mapOfferToDetailViewModel(
    offer: OfferRead,
    options: OfferDetailMapperOptions = {},
): OfferDetailViewModel {
    const {
        currency = DEFAULT_CURRENCY,
        locale = DEFAULT_LOCALE,
        now = new Date(),
        timeZone,
    } = options;
    const pickupStart = parseDate(offer.pickup_start);
    const pickupEnd = parseDate(offer.pickup_end);
    const originalPrice = parsePrice(offer.original_price);
    const discountedPrice = parsePrice(offer.discounted_price);
    const priceFormatter = createPriceFormatter(locale, currency);
    const savings = (
        originalPrice !== null
        && discountedPrice !== null
        && originalPrice > discountedPrice
    )
        ? originalPrice - discountedPrice
        : null;
    const availability = getAvailability({
        isActive: offer.is_active,
        now,
        pickupEnd,
        quantityAvailable: offer.quantity_available,
    });

    return {
        ...availability,
        categoryName: offer.category.name,
        description: offer.description?.trim() || DESCRIPTION_FALLBACK,
        discountedPriceLabel: formatPrice(
            discountedPrice,
            priceFormatter,
        ),
        id: offer.id,
        imagePlaceholderLabel: offer.category.name || "LatePlate",
        imageUrl: offer.image_url?.trim() || null,
        originalPriceLabel: formatPrice(originalPrice, priceFormatter),
        pickupDateLabel: formatPickupDate(
            pickupStart,
            locale,
            timeZone,
        ),
        pickupWindowLabel: formatPickupWindow(
            pickupStart,
            pickupEnd,
            locale,
            timeZone,
        ),
        quantityLabel: getQuantityLabel(offer.quantity_available),
        restaurantAddress: offer.restaurant.address,
        restaurantName: offer.restaurant.name,
        savingsLabel: savings === null
            ? null
            : `Save ${priceFormatter.format(savings)}`,
        title: offer.title,
    };
}
