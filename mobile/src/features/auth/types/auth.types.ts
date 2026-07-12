import type {components} from "@/shared/api/generated/schema";

export type LoginRequest = components["schemas"]["UserLoginRequest"];
export type RegisterRequest = components["schemas"]["UserRegisterRequest"];
export type AuthResponse = components["schemas"]["AuthTokenResponse"];
export type CurrentUser = components["schemas"]["UserRead"];