import designTokens from "../../../config/design-tokens.json";

const offer = designTokens.colors.offer;

export const offerColors = {
    background: offer.background,
    border: offer.border,
    card: offer.card,
    deepGreen: offer["deep-green"],
    discount: offer.discount,
    expired: offer.expired,
    mutedText: offer["muted-text"],
    primary: offer.primary,
    secondary: offer.secondary,
    soldOut: offer["sold-out"],
    urgent: offer.urgent,
} as const;
