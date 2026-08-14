import designTokens from "../../../config/design-tokens.json";

const auth = designTokens.colors.auth;

export const authColors = {
    background: auth.background,
    card: auth.card,
    green: auth.green,
    greenDark: auth["green-dark"],
    greenLight: auth["green-light"],
    text: auth.text,
    muted: auth.muted,
    placeholder: auth.placeholder,
    accent: auth.accent,
    success: auth.success,
    successText: auth["success-text"],
    error: auth.error,
    errorText: auth["error-text"],
    errorBorder: auth["error-border"],
    border: auth.border,
    overlay: auth.overlay,
} as const;
