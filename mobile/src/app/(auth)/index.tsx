import { StyleSheet, Text, View } from "react-native";

export default function AuthIndex() {
    return (
        <View style={styles.screen}>
            <View style={styles.content}>
                <Text style={styles.title}>Anmelden</Text>
                <Text style={styles.subtitle}>
                    Die Passwort-Anmeldung wurde entfernt. Der neue E-Mail-Code
                    und Magic-Link-Flow wird hier als naechster Schritt angebunden.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#f7f7f8",
        justifyContent: "center",
        padding: 24,
    },
    content: {
        gap: 12,
    },
    title: {
        color: "#111827",
        fontSize: 32,
        fontWeight: "700",
    },
    subtitle: {
        color: "#4b5563",
        fontSize: 16,
        lineHeight: 24,
    },
});
