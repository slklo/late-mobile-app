import type { components } from "@/shared/api/generated/schema";

export type CurrentUser = components["schemas"]["UserRead"];
export type AuthNextStep = components["schemas"]["AuthNextStep"];
export type AuthTokenPairResponse = {
    access_token: string;
    refresh_token: string;
    token_type: "bearer";
    access_expires_in_seconds: number;
    refresh_expires_in_seconds: number;
};
export type AuthSession = AuthTokenPairResponse & {
    user: CurrentUser;
    next_step: AuthNextStep;
};
export type RefreshAuthSessionResponse = AuthTokenPairResponse;
export type EmailChallenge = components["schemas"]["EmailChallengeResponse"];
export type EmailAuthInput = components["schemas"]["EmailAuthRequest"];
export type VerifyCodeInput = components["schemas"]["VerifyCodeRequest"];
export type ConsumeLinkInput = components["schemas"]["ConsumeLinkRequest"];
export type CompleteProfileInput = (
    components["schemas"]["CompleteProfileRequest"]
);
