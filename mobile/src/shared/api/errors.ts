import axios from "axios";

type ApiErrorBody = {
    detail?: string | Array<{msg?:string}>;
    error?: {
        code?: string;
        message?: string;
    };
}

export function getApiErrorMessage(
    error: unknown,
    fallback: string,
): string {
    if (!axios.isAxiosError<ApiErrorBody>(error)) {
        return fallback;
    }

    const detail = error.response?.data?.detail;
    const errorMessage = error.response?.data?.error?.message;

    if (typeof errorMessage === "string") {
        return errorMessage;
    }

    if (typeof detail === "string") {
        return detail;
    }

    if (Array.isArray(detail)) {
        return detail.find((item) => item.msg)?.msg ?? fallback;
    }

    if (!error.response) {
        return "Der Server ist nicht erreichbar";
    }

    return fallback;

}
