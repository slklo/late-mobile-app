import { apiClient } from "@/shared/api/client";
import type {
    AuthResponse,
    CurrentUser,
    LoginRequest,
    RegisterRequest,
} from "../types/auth.types";

export async function login(
    data: LoginRequest,
): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
        "/auth/login",
        data,
    );

    return response.data
}

export async function register (
    data: RegisterRequest,
): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
        "/auth/register",
        data,
    )
    return response.data
}

export async function getCurrentUser(): Promise<CurrentUser> {
    const response = await apiClient.get<CurrentUser>("/auth/me");
    return response.data;
}