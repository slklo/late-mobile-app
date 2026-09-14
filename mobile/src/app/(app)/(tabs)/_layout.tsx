import { Tabs } from "expo-router";
import { ComponentProps } from "react";
import { ColorValue, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NativeWindSymbol } from "@/shared/ui/nativewindInterop";

type SymbolName = ComponentProps<typeof NativeWindSymbol>["name"];

type TabIconProps = {
    color: ColorValue;
    focused: boolean;
    name: SymbolName;
    selectedName?: SymbolName;
    fallback: string;
};

function TabIcon({
    color,
    focused,
    name,
    selectedName,
    fallback,
}: TabIconProps) {
    return (
        <NativeWindSymbol
            fallback={(
                <Text
                    style={{
                        color,
                        fontSize: 20,
                        fontWeight: focused ? "800" : "600",
                        lineHeight: 22,
                    }}
                >
                    {fallback}
                </Text>
            )}
            name={focused && selectedName ? selectedName : name}
            size={22}
            tintColor={color}
            weight={focused ? "semibold" : "regular"}
        />
    );
}

export default function TabsLayout() {
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#1C3B22",
                tabBarInactiveTintColor: "#A9B3A5",
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: "700",
                    marginTop: 2,
                },
                tabBarStyle: {
                    backgroundColor: "#FDFAF4",
                    borderTopColor: "#E8E3D7",
                    borderTopWidth: 1,
                    elevation: 10,
                    height: 62 + insets.bottom,
                    paddingBottom: Math.max(insets.bottom, 10),
                    paddingTop: 8,
                    shadowColor: "#1C2B1A",
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 14,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon
                            color={color}
                            fallback="⌖"
                            focused={focused}
                            name="safari"
                            selectedName="safari.fill"
                        />
                    ),
                    title: "Discover",
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon
                            color={color}
                            fallback="⌕"
                            focused={focused}
                            name="magnifyingglass"
                        />
                    ),
                    title: "Search",
                }}
            />
            <Tabs.Screen
                name="favorite"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon
                            color={color}
                            fallback={focused ? "♥" : "♡"}
                            focused={focused}
                            name="heart"
                            selectedName="heart.fill"
                        />
                    ),
                    title: "Favorite",
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon
                            color={color}
                            fallback="○"
                            focused={focused}
                            name="person"
                            selectedName="person.fill"
                        />
                    ),
                    title: "Profile",
                }}
            />
        </Tabs>
    );
}
