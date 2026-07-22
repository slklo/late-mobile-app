import { apiClient } from "@/shared/api/client";
import type { CurrentUser } from "../types/auth.types";

export async function getCurrentUser(): Promise<CurrentUser> {
    const response = await apiClient.get<CurrentUser>("/auth/me");
    return response.data;
}
