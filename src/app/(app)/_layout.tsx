import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuthStore } from "@/stores/auth-store";
import { couleurs } from "@/theme";

export default function AppLayout() {
  const token = useAuthStore((state) => state.token);
  const hydrated = useAuthStore((state) => state.hydrated);
  if (!hydrated) return <View style={styles.chargement}><ActivityIndicator color={couleurs.primaire} /></View>;
  if (!token) return <Redirect href="/connexion" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({ chargement: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: couleurs.fond } });
