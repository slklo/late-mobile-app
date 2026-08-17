import { apiClient } from "@/shared/api/client";
import type {
    AuthSession,
    CompleteProfileInput,
    ConsumeLinkInput,
    CurrentUser,
    EmailAuthInput,
    EmailChallenge,
    RefreshAuthSessionResponse,
    VerifyCodeInput,
} from "../types/auth.types";

export async function requestEmailChallenge(
    input: EmailAuthInput,
): Promise<EmailChallenge> {
    const response = await apiClient.post<EmailChallenge>(
        "/auth/email/request",
        input,
    );
    return response.data;
}

export async function verifyEmailCode(
    input: VerifyCodeInput,
): Promise<AuthSession> {
    const response = await apiClient.post<AuthSession>(
        "/auth/email/verify-code",
        input,
    );
    return response.data;
}

export async function consumeEmailLink(
    input: ConsumeLinkInput,
): Promise<AuthSession> {
    const response = await apiClient.post<AuthSession>(
        "/auth/email/consume-link",
        input,
    );
    return response.data;
}

export async function refreshAuthSession(
    refreshToken: string,
): Promise<RefreshAuthSessionResponse> {
    const response = await apiClient.post<RefreshAuthSessionResponse>(
        "/auth/token/refresh",
        { refresh_token: refreshToken },
    );
    return response.data;
}

export async function logoutAuthSession(
    refreshToken: string,
): Promise<void> {
    await apiClient.post(
        "/auth/logout",
        { refresh_token: refreshToken },
    );
}

export async function getCurrentUser(): Promise<CurrentUser> {
    const response = await apiClient.get<CurrentUser>("/auth/me");
    return response.data;
}

export async function completeProfile(
    input: CompleteProfileInput,
): Promise<CurrentUser> {
    const response = await apiClient.patch<CurrentUser>(
        "/auth/me/profile",
        input,
    );
    return response.data;
}
