import type { components } from "@/shared/api/generated/schema";
import type {
    AuthTokenPairResponse as SharedAuthTokenPairResponse,
} from "@/shared/auth/tokenStorage";

export type CurrentUser = components["schemas"]["UserRead"];
export type AuthNextStep = components["schemas"]["AuthNextStep"];
export type AuthTokenPairResponse = SharedAuthTokenPairResponse;
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
