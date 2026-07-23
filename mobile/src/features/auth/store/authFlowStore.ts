import { create } from "zustand";

import type { EmailChallenge } from "../types/auth.types";

type AuthFlowState = {
    email: string | null;
    challengeId: string | null;
    expiresAt: number | null;
    resendAvailableAt: number | null;
    setEmail: (email: string) => void;
    setChallenge: (email: string, challenge: EmailChallenge) => void;
    clearChallenge: (keepEmail?: boolean) => void;
    reset: () => void;
};

export const useAuthFlowStore = create<AuthFlowState>((set) => ({
    email: null,
    challengeId: null,
    expiresAt: null,
    resendAvailableAt: null,

    setEmail: (email) => set({ email }),

    setChallenge: (email, challenge) => {
        const now = Date.now();

        set({
            email,
            challengeId: challenge.challenge_id,
            expiresAt: now + challenge.expires_in_seconds * 1000,
            resendAvailableAt: (
                now + challenge.resend_after_seconds * 1000
            ),
        });
    },

    clearChallenge: (keepEmail = false) => set((state) => ({
        email: keepEmail ? state.email : null,
        challengeId: null,
        expiresAt: null,
        resendAvailableAt: null,
    })),

    reset: () => set({
        email: null,
        challengeId: null,
        expiresAt: null,
        resendAvailableAt: null,
    }),
}));
