import type { components } from "@/shared/api/generated/schema";

export type CurrentUser = components["schemas"]["UserRead"];
export type AuthSession = components["schemas"]["AuthSessionResponse"];
export type EmailChallenge = components["schemas"]["EmailChallengeResponse"];
export type EmailAuthInput = components["schemas"]["EmailAuthRequest"];
export type VerifyCodeInput = components["schemas"]["VerifyCodeRequest"];
export type ConsumeLinkInput = components["schemas"]["ConsumeLinkRequest"];
export type CompleteProfileInput = (
    components["schemas"]["CompleteProfileRequest"]
);
