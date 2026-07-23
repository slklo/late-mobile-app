import { Stack } from "expo-router";

export const unstable_settings = {
    initialRouteName: "complete-profile",
};

export default function OnboardingLayout() {
    return (
        <Stack>
            <Stack.Screen
                name="complete-profile"
                options={{
                    headerShown: false,
                    title: "Complete profile",
                }}
            />
        </Stack>
    );
}
