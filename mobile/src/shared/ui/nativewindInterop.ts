import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { cssInterop } from "nativewind";
import { Animated, RefreshControl } from "react-native";

export const NativeWindAnimatedView = cssInterop(Animated.View, {
    className: "style",
});

export const NativeWindImage = cssInterop(Image, {
    className: "style",
});

export const NativeWindRefreshControl = cssInterop(RefreshControl, {
    className: {
        target: "style",
        nativeStyleToProp: { color: "tintColor" },
    },
});

export const NativeWindSymbol = cssInterop(SymbolView, {
    className: {
        target: "style",
        nativeStyleToProp: { color: "tintColor" },
    },
});
