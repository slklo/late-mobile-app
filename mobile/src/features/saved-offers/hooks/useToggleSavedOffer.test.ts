/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from "vitest";


const mocks = vi.hoisted(() => ({
    addSavedOffer: vi.fn(),
    invalidateQueries: vi.fn(),
    removeSavedOffer: vi.fn(),
    useMutation: vi.fn((options: unknown) => options),
}));

vi.mock("@tanstack/react-query", () => ({
    useMutation: mocks.useMutation,
    useQueryClient: () => ({
        invalidateQueries: mocks.invalidateQueries,
    }),
}));
vi.mock("../api/savedOffersApi", () => ({
    addSavedOffer: mocks.addSavedOffer,
    removeSavedOffer: mocks.removeSavedOffer,
}));

import { savedOffersQueryKeys } from "../api/savedOffersQueryKeys";
import { useToggleSavedOffer } from "./useToggleSavedOffer";


type MutationOptions = {
    mutationFn: (input: {
        offerId: number;
        isCurrentlySaved: boolean;
    }) => Promise<void>;
    onSuccess: () => Promise<void>;
};


beforeEach(() => {
    vi.clearAllMocks();
    mocks.addSavedOffer.mockResolvedValue(undefined);
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

    it("invalidates the saved offers query after success", async () => {
        const mutation = useToggleSavedOffer() as unknown as MutationOptions;

        await mutation.onSuccess();

        expect(mocks.invalidateQueries).toHaveBeenCalledWith({
            queryKey: savedOffersQueryKeys.all,
        });
    });
});
