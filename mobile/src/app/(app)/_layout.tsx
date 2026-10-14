import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useEffect } from "react";
import { MenuLateral } from "@/components/MenuLateral";
import { subscribeToNotificationNavigation } from "@/notifications/push-notifications";
import { useAuthStore } from "@/stores/auth-store";
import { couleurs } from "@/theme";

export default function AppLayout() {
  const token = useAuthStore((state) => state.token);
  const hydrated = useAuthStore((state) => state.hydrated);
  useEffect(() => subscribeToNotificationNavigation(), []);
  if (!hydrated)
    return (
      <View style={styles.chargement}>
        <ActivityIndicator color={couleurs.texte} />
      </View>
    );
  if (!token) return <Redirect href="/connexion" />;
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <MenuLateral />
    </>
  );
}

const styles = StyleSheet.create({
  chargement: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: couleurs.fond,
  },
});
