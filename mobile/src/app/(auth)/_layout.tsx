import { Stack } from "expo-router";

export default function AuthLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="index"
                options={{ title: "Welcome" }}
            />
            <Stack.Screen name="check-inbox" />
        </Stack>
    );
}
