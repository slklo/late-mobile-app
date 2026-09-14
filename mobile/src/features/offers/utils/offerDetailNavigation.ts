export type OfferDetailSourceTab = "favorite" | null;


export function getOfferDetailSourceTab(
    value: string | string[] | undefined,
): OfferDetailSourceTab {
    const rawValue = Array.isArray(value) ? value[0] : value;

    return rawValue === "favorite" ? "favorite" : null;
}


export function getOfferDetailFallbackRoute(
    sourceTab: OfferDetailSourceTab,
): "/" | "/favorite" {
    return sourceTab === "favorite" ? "/favorite" : "/";
}
