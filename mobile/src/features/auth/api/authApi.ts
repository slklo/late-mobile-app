import { apiClient } from "@/shared/api/client";
import type {
    CompleteProfileInput,
    CurrentUser,
} from "../types/auth.types";

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
