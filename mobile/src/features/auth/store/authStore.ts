import {create} from "zustand";

import type { CurrentUser } from "../types/auth.types";

type AuthState = {
    user: CurrentUser | null;
    isInitialized: boolean;
    setUser: (user: CurrentUser) => void;
    clearUser: () => void;
    setInitialized: (isInitialized: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isInitialized: false,

    setUser: (user) => {
        set({user});
    },

    clearUser: () => {
        set({user: null});
    },

    setInitialized: (isInitialized) => {
        set({ isInitialized });
    },
}));