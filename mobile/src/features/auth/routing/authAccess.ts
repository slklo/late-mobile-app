import type { CurrentUser } from "../types/auth.types";

type AuthUserState = Pick<CurrentUser, "profile_completed_at"> | null;

export type AuthAccess = {
    isUnauthenticated: boolean;
    needsProfile: boolean;
    canExplore: boolean;
};

export function getAuthAccess(user: AuthUserState): AuthAccess {
    if (!user) {
        return {
            isUnauthenticated: true,
            needsProfile: false,
            canExplore: false,
        };
    }

    const profileIsComplete = user.profile_completed_at !== null;

    return {
        isUnauthenticated: false,
        needsProfile: !profileIsComplete,
        canExplore: profileIsComplete,
    };
}
