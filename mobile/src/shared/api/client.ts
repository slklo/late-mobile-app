import axios, {
    type InternalAxiosRequestConfig,
} from "axios";

import {
    getAccessToken,
    getOrCreatePendingRefresh,
    getStoredAuthSession,
    removeAuthSession,
    saveAuthSession,
    toStoredAuthSession,
    type AuthTokenPairResponse,
    type StoredAuthSession,
} from "../auth/tokenStorage";
import { API_BASE_URL } from "../config/env";

const REFRESH_ENDPOINT = "/auth/token/refresh";

type RetriableRequestConfig = InternalAxiosRequestConfig & {
    _retry?: boolean;
};

let unauthorizedHandler: (() => void) | undefined;
let refreshPromise: Promise<StoredAuthSession> | null = null;
let sessionInvalidationPromise: Promise<void> | null = null;

export function setUnauthorizedHandler(handler: () => void) {
    unauthorizedHandler = handler;

    return () => {
        if (unauthorizedHandler === handler) {
            unauthorizedHandler = undefined;
        }
    };
}

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

export const authSessionClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

async function performRefresh(
    refreshToken: string,
): Promise<StoredAuthSession> {
    const pendingRefresh = await getOrCreatePendingRefresh(refreshToken);
    const response = await authSessionClient.post<AuthTokenPairResponse>(
        REFRESH_ENDPOINT,
        {
            refresh_token: refreshToken,
            idempotency_key: pendingRefresh.idempotencyKey,
        },
    );
    const storedSession = toStoredAuthSession(response.data);

    await saveAuthSession(storedSession);
    return storedSession;
}

export function refreshStoredAuthSession(
    refreshToken: string,
): Promise<StoredAuthSession> {
    return getOrStartRefresh(refreshToken);
}

export async function requestAuthLogout(
    refreshToken: string,
): Promise<void> {
    await authSessionClient.post(
        "/auth/logout",
        { refresh_token: refreshToken },
    );
}

function isRefreshRequest(config: RetriableRequestConfig): boolean {
    const path = config.url?.split("?", 1)[0];
    return path?.endsWith(REFRESH_ENDPOINT) ?? false;
}

function getRequestAccessToken(
    config: RetriableRequestConfig,
): string | null {
    const authorization = config.headers.get("Authorization");

    if (
        typeof authorization !== "string"
        || !authorization.startsWith("Bearer ")
    ) {
        return null;
    }

    return authorization.slice("Bearer ".length);
}

function setRequestAccessToken(
    config: RetriableRequestConfig,
    accessToken: string,
): void {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
}

function isInvalidRefreshError(error: unknown): boolean {
    return axios.isAxiosError(error) && error.response?.status === 401;
}

async function invalidateSession(): Promise<void> {
    if (sessionInvalidationPromise !== null) {
        return sessionInvalidationPromise;
    }

    sessionInvalidationPromise = (async () => {
        try {
            await removeAuthSession();
        } finally {
            unauthorizedHandler?.();
        }
    })();

    try {
        await sessionInvalidationPromise;
    } finally {
        sessionInvalidationPromise = null;
    }
}

function getOrStartRefresh(
    refreshToken: string,
): Promise<StoredAuthSession> {
    if (refreshPromise !== null) {
        return refreshPromise;
    }

    const pendingRefresh = performRefresh(refreshToken).catch(
        async (error: unknown) => {
            if (isInvalidRefreshError(error)) {
                await invalidateSession();
            }

            throw error;
        },
    );
    refreshPromise = pendingRefresh;

    void pendingRefresh.then(
        () => {
            if (refreshPromise === pendingRefresh) {
                refreshPromise = null;
            }
        },
        () => {
            if (refreshPromise === pendingRefresh) {
                refreshPromise = null;
            }
        },
    );

    return pendingRefresh;
}

apiClient.interceptors.request.use(async (config) => {
    const token = await getAccessToken();

    if (token) {
        config.headers.set("Authorization", `Bearer ${token}`);
    }

    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
        if (!axios.isAxiosError(error) || error.response?.status !== 401) {
            return Promise.reject(error);
        }

        const originalRequest = error.config as (
            RetriableRequestConfig | undefined
        );

        if (
            originalRequest === undefined
            || originalRequest._retry
            || isRefreshRequest(originalRequest)
        ) {
            await invalidateSession();
            return Promise.reject(error);
        }

        let storedSession: StoredAuthSession | null;

        try {
            storedSession = await getStoredAuthSession();
        } catch (storageError) {
            return Promise.reject(storageError);
        }

        if (storedSession === null) {
            await invalidateSession();
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        if (
            getRequestAccessToken(originalRequest)
            !== storedSession.accessToken
        ) {
            setRequestAccessToken(
                originalRequest,
                storedSession.accessToken,
            );
            return apiClient(originalRequest);
        }

        try {
            const refreshedSession = await getOrStartRefresh(
                storedSession.refreshToken,
            );
            setRequestAccessToken(
                originalRequest,
                refreshedSession.accessToken,
            );
            return apiClient(originalRequest);
        } catch (refreshError) {
            return Promise.reject(refreshError);
        }
    },
);
