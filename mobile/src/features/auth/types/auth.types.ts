import type {components} from "@/shared/api/generated/schema";

export type CurrentUser = components["schemas"]["UserRead"];
export type CompleteProfileInput = (
    components["schemas"]["CompleteProfileRequest"]
);
