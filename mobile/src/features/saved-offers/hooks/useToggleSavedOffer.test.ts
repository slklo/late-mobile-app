/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from "vitest";


const mocks = vi.hoisted(() => ({
    addSavedOffer: vi.fn(),
    cancelQueries: vi.fn(),
    getQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
    removeSavedOffer: vi.fn(),
    setQueryData: vi.fn(),
    useMutation: vi.fn((options: unknown) => options),
}));

vi.mock("@tanstack/react-query", () => ({
    useMutation: mocks.useMutation,
    useQueryClient: () => ({
        cancelQueries: mocks.cancelQueries,
        getQueryData: mocks.getQueryData,
        invalidateQueries: mocks.invalidateQueries,
        setQueryData: mocks.setQueryData,
    }),
}));
vi.mock("../api/savedOffersApi", () => ({
    addSavedOffer: mocks.addSavedOffer,
    removeSavedOffer: mocks.removeSavedOffer,
}));

import { savedOffersQueryKeys } from "../api/savedOffersQueryKeys";
import type { SavedOfferRead } from "../types/savedOffer.types";
import { useToggleSavedOffer } from "./useToggleSavedOffer";


type MutationOptions = {
    mutationFn: (input: {
        offer?: SavedOfferRead["offer"];
        offerId: number;
        isCurrentlySaved: boolean;
    }) => Promise<SavedOfferRead | undefined>;
    onError: (
        error: Error,
        input: {
            offer?: SavedOfferRead["offer"];
            offerId: number;
            isCurrentlySaved: boolean;
        },
        context?: { previousSavedOffers?: SavedOfferRead[] },
    ) => void;
    onMutate: (input: {
        offer?: SavedOfferRead["offer"];
        offerId: number;
        isCurrentlySaved: boolean;
    }) => Promise<{ previousSavedOffers?: SavedOfferRead[] }>;
    onSettled: () => Promise<void>;
    onSuccess: (
        savedOffer: SavedOfferRead | undefined,
        input: {
            offer?: SavedOfferRead["offer"];
            offerId: number;
            isCurrentlySaved: boolean;
        },
    ) => void;
};

function createOffer(id = 42): SavedOfferRead["offer"] {
    return {
        category: {
            id: 1,
            name: "Bakery",
            slug: "bakery",
        },
        description: "Fresh baked goods",
        discounted_price: "4.99",
        id,
        image_url: null,
        is_active: true,
        original_price: "12.99",
        pickup_end: "2026-09-15T20:00:00Z",
        pickup_start: "2026-09-15T19:00:00Z",
        quantity_available: 3,
        restaurant: {
            address: "Late Street 1",
            id: 1,
            image_url: null,
            name: "Late Bakery",
        },
        title: "Bakery surprise bag",
    };
}

function createSavedOffer(id = 42): SavedOfferRead {
    return {
        created_at: "2026-09-15T12:00:00Z",
        id,
        offer: createOffer(id),
    };
}


beforeEach(() => {
    vi.clearAllMocks();
    mocks.addSavedOffer.mockResolvedValue(createSavedOffer());
    mocks.cancelQueries.mockResolvedValue(undefined);
    mocks.getQueryData.mockReturnValue(undefined);
    mocks.removeSavedOffer.mockResolvedValue(undefined);
    mocks.invalidateQueries.mockResolvedValue(undefined);
});


describe("useToggleSavedOffer", () => {
    it("adds the offer when it is not currently saved", async () => {
        const mutation = useToggleSavedOffer() as unknown as MutationOptions;

        await mutation.mutationFn({
            offerId: 42,
            isCurrentlySaved: false,
        });

        expect(mocks.addSavedOffer).toHaveBeenCalledWith(42);
        expect(mocks.removeSavedOffer).not.toHaveBeenCalled();
    });

    it("removes the offer when it is currently saved", async () => {
        const mutation = useToggleSavedOffer() as unknown as MutationOptions;

        await mutation.mutationFn({
            offerId: 42,
            isCurrentlySaved: true,
        });

        expect(mocks.removeSavedOffer).toHaveBeenCalledWith(42);
        expect(mocks.addSavedOffer).not.toHaveBeenCalled();
    });

    it("optimistically adds an offer to the saved offers cache", async () => {
        const previousSavedOffers = [createSavedOffer(7)];
        const offer = createOffer(42);
        mocks.getQueryData.mockReturnValue(previousSavedOffers);
        const mutation = useToggleSavedOffer() as unknown as MutationOptions;

        const context = await mutation.onMutate({
            offer,
            offerId: 42,
            isCurrentlySaved: false,
        });

        expect(mocks.cancelQueries).toHaveBeenCalledWith({
            queryKey: savedOffersQueryKeys.all,
        });
        expect(context.previousSavedOffers).toBe(previousSavedOffers);
        expect(mocks.setQueryData).toHaveBeenCalledWith(
            savedOffersQueryKeys.all,
            expect.any(Function),
        );

        const updater = mocks.setQueryData.mock.calls.at(-1)?.[1] as (
            savedOffers: SavedOfferRead[] | undefined,
        ) => SavedOfferRead[] | undefined;
        const updated = updater(previousSavedOffers);

        expect(updated?.map((savedOffer) => savedOffer.offer.id)).toEqual([
            42,
            7,
        ]);
    });

    it("optimistically removes an offer from the saved offers cache", async () => {
        const previousSavedOffers = [
            createSavedOffer(42),
            createSavedOffer(7),
        ];
        mocks.getQueryData.mockReturnValue(previousSavedOffers);
        const mutation = useToggleSavedOffer() as unknown as MutationOptions;

        await mutation.onMutate({
            offerId: 42,
            isCurrentlySaved: true,
        });

        const updater = mocks.setQueryData.mock.calls.at(-1)?.[1] as (
            savedOffers: SavedOfferRead[] | undefined,
        ) => SavedOfferRead[];
        const updated = updater(previousSavedOffers);

        expect(updated.map((savedOffer) => savedOffer.offer.id)).toEqual([7]);
    });

    it("restores the previous cache when the mutation fails", () => {
        const previousSavedOffers = [createSavedOffer(42)];
        const mutation = useToggleSavedOffer() as unknown as MutationOptions;

        mutation.onError(
            new Error("nope"),
            {
                offerId: 42,
                isCurrentlySaved: true,
            },
            { previousSavedOffers },
        );

        expect(mocks.setQueryData).toHaveBeenCalledWith(
            savedOffersQueryKeys.all,
            previousSavedOffers,
        );
    });

    it("replaces an optimistic saved offer with the backend response", () => {
        const savedOffer = createSavedOffer(42);
        const mutation = useToggleSavedOffer() as unknown as MutationOptions;

        mutation.onSuccess(savedOffer, {
            offer: savedOffer.offer,
            offerId: 42,
            isCurrentlySaved: false,
        });

        const updater = mocks.setQueryData.mock.calls.at(-1)?.[1] as (
            savedOffers: SavedOfferRead[] | undefined,
        ) => SavedOfferRead[];
        const updated = updater([
            {
                ...savedOffer,
                id: -42,
            },
            createSavedOffer(7),
        ]);

        expect(updated.map((item) => item.id)).toEqual([42, 7]);
    });

    it("invalidates the saved offers query after settlement", async () => {
        const mutation = useToggleSavedOffer() as unknown as MutationOptions;

        await mutation.onSettled();

        expect(mocks.invalidateQueries).toHaveBeenCalledWith({
            queryKey: savedOffersQueryKeys.all,
        });
    });
});
