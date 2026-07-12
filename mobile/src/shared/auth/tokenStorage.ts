import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "access_token";

function getWebStorage() {
    return typeof window === "undefined" ? null : window.sessionStorage;
}

export function getAccessToken(): Promise<string | null> {
    if (Platform.OS === "web") {
        return Promise.resolve(getWebStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null);
    }

    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export function saveAccessToken(token: string): Promise<void> {
    if (Platform.OS === "web") {
        getWebStorage()?.setItem(ACCESS_TOKEN_KEY, token);
        return Promise.resolve();
    }

    return SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export function removeAccessToken(): Promise<void> {
    if (Platform.OS === "web") {
        getWebStorage()?.removeItem(ACCESS_TOKEN_KEY);
        return Promise.resolve();
    }

    return SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}
