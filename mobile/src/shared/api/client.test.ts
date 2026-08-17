import axios, {
    AxiosError,
    AxiosHeaders,
    type AxiosResponse,
    type InternalAxiosRequestConfig,
} from "axios";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const secureStore = vi.hoisted(() => {
    const values = new Map<string, string>();

    return {
        values,
        getItemAsync: vi.fn(async (key: string) => values.get(key) ?? null),
        setItemAsync: vi.fn(async (key: string, value: string) => {
            values.set(key, value);
        }),
        deleteItemAsync: vi.fn(async (key: string) => {
            values.delete(key);
        }),
    };
});

vi.mock("expo-secure-store", () => secureStore);
vi.mock("react-native", () => ({
    Platform: { OS: "ios" },
}));

import {
    apiClient,
    authSessionClient,
    setUnauthorizedHandler,
} from "./client";
import {
    getStoredAuthSession,
    saveAuthSession,
    type AuthTokenPairResponse,
    type StoredAuthSession,
} from "../auth/tokenStorage";


const OLD_SESSION: StoredAuthSession = {
    accessToken: "old-access-token",
    refreshToken: "old-refresh-token",
    accessExpiresAt: 1_800_000_000_000,
    refreshExpiresAt: 1_802_592_000_000,
};

const REFRESH_RESPONSE: AuthTokenPairResponse = {
    access_token: "new-access-token",
    refresh_token: "new-refresh-token",
    token_type: "bearer",
    access_expires_in_seconds: 900,
    refresh_expires_in_seconds: 2_592_000,
};

let removeUnauthorizedHandler: (() => void) | undefined;
let unauthorizedHandler = vi.fn<() => void>();


function response<T>(
    config: InternalAxiosRequestConfig,
    status: number,
    data: T,
): AxiosResponse<T> {
    return {
        config,
        data,
        headers: new AxiosHeaders(),
        status,
        statusText: String(status),
    };
}

function rejectWithStatus(
    config: InternalAxiosRequestConfig,
    status: number,
    data: unknown = {},
): never {
    const failedResponse = response(config, status, data);

    throw new AxiosError(
        `Request failed with status ${status}`,
        AxiosError.ERR_BAD_RESPONSE,
        config,
        undefined,
        failedResponse,
    );
}

function authorization(config: InternalAxiosRequestConfig): unknown {
    return config.headers.get("Authorization");
}


beforeEach(async () => {
    vi.clearAllMocks();
    secureStore.values.clear();
    await saveAuthSession(OLD_SESSION);

    unauthorizedHandler = vi.fn<() => void>();
    removeUnauthorizedHandler = setUnauthorizedHandler(
        unauthorizedHandler,
    );
});


afterEach(() => {
    removeUnauthorizedHandler?.();
    removeUnauthorizedHandler = undefined;
});


describe("apiClient automatic refresh", () => {
    it("refreshes after 401 and retries with the new access token", async () => {
        let apiCalls = 0;
        let refreshCalls = 0;

        apiClient.defaults.adapter = async (config) => {
            apiCalls += 1;

            if (apiCalls === 1) {
                rejectWithStatus(config, 401);
            }

            expect(authorization(config)).toBe("Bearer new-access-token");
            return response(config, 200, { ok: true });
        };
        authSessionClient.defaults.adapter = async (config) => {
            refreshCalls += 1;
            expect(config.url).toBe("/auth/token/refresh");
            expect(JSON.parse(String(config.data))).toEqual({
                refresh_token: OLD_SESSION.refreshToken,
            });
            return response(config, 200, REFRESH_RESPONSE);
        };

        const result = await apiClient.get<{ ok: boolean }>("/offers");

        expect(result.data).toEqual({ ok: true });
        expect(apiCalls).toBe(2);
        expect(refreshCalls).toBe(1);
        await expect(getStoredAuthSession()).resolves.toMatchObject({
            accessToken: "new-access-token",
            refreshToken: "new-refresh-token",
        });
        expect(unauthorizedHandler).not.toHaveBeenCalled();
    });

    it("shares one refresh across parallel 401 responses", async () => {
        let apiCalls = 0;
        let refreshCalls = 0;
        let releaseRefresh: (() => void) | undefined;
        const refreshGate = new Promise<void>((resolve) => {
            releaseRefresh = resolve;
        });

        apiClient.defaults.adapter = async (config) => {
            apiCalls += 1;

            if (authorization(config) === "Bearer old-access-token") {
                rejectWithStatus(config, 401);
            }

            return response(config, 200, { url: config.url });
        };
        authSessionClient.defaults.adapter = async (config) => {
            refreshCalls += 1;
            await refreshGate;
            return response(config, 200, REFRESH_RESPONSE);
        };

        const firstRequest = apiClient.get("/offers/1");
        const secondRequest = apiClient.get("/offers/2");

        await vi.waitFor(() => expect(refreshCalls).toBe(1));
        releaseRefresh?.();
        await Promise.all([firstRequest, secondRequest]);

        expect(refreshCalls).toBe(1);
        expect(apiCalls).toBe(4);
        expect(unauthorizedHandler).not.toHaveBeenCalled();
    });

    it("clears the session when refresh returns 401", async () => {
        apiClient.defaults.adapter = async (config) => {
            rejectWithStatus(config, 401);
        };
        authSessionClient.defaults.adapter = async (config) => {
            rejectWithStatus(
                config,
                401,
                { error: { code: "INVALID_REFRESH_TOKEN" } },
            );
        };

        await expect(apiClient.get("/offers")).rejects.toMatchObject({
            response: { status: 401 },
        });

        await expect(getStoredAuthSession()).resolves.toBeNull();
        expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
    });

    it("keeps the session when refresh returns 503", async () => {
        apiClient.defaults.adapter = async (config) => {
            rejectWithStatus(config, 401);
        };
        authSessionClient.defaults.adapter = async (config) => {
            rejectWithStatus(
                config,
                503,
                {
                    error: {
                        code: "AUTHENTICATION_SERVICE_UNAVAILABLE",
                    },
                },
            );
        };

        await expect(apiClient.get("/offers")).rejects.toMatchObject({
            response: { status: 503 },
        });

        await expect(getStoredAuthSession()).resolves.toEqual(OLD_SESSION);
        expect(unauthorizedHandler).not.toHaveBeenCalled();
    });

    it("invalidates a session when the retried request is still 401", async () => {
        let apiCalls = 0;
        let refreshCalls = 0;

        apiClient.defaults.adapter = async (config) => {
            apiCalls += 1;
            rejectWithStatus(config, 401);
        };
        authSessionClient.defaults.adapter = async (config) => {
            refreshCalls += 1;
            return response(config, 200, REFRESH_RESPONSE);
        };

        await expect(apiClient.get("/offers")).rejects.toMatchObject({
            response: { status: 401 },
        });

        expect(apiCalls).toBe(2);
        expect(refreshCalls).toBe(1);
        await expect(getStoredAuthSession()).resolves.toBeNull();
        expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
    });

    it("never recursively refreshes the refresh endpoint", async () => {
        let refreshTransportCalls = 0;

        apiClient.defaults.adapter = async (config) => {
            rejectWithStatus(config, 401);
        };
        authSessionClient.defaults.adapter = async (config) => {
            refreshTransportCalls += 1;
            return response(config, 200, REFRESH_RESPONSE);
        };

        await expect(
            apiClient.post("/auth/token/refresh", {
                refresh_token: OLD_SESSION.refreshToken,
            }),
        ).rejects.toMatchObject({ response: { status: 401 } });

        expect(refreshTransportCalls).toBe(0);
        await expect(getStoredAuthSession()).resolves.toBeNull();
        expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
    });
});
