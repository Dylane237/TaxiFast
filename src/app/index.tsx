import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuthStore } from "@/stores/auth-store";
import { couleurs } from "@/theme";

export default function Index() {
  const token = useAuthStore((state) => state.token);
  const hydrated = useAuthStore((state) => state.hydrated);

  if (!hydrated) {
    return <View style={styles.chargement}><ActivityIndicator color={couleurs.primaire} size="large" /></View>;
  }

  return <Redirect href={token ? "/accueil" : "/connexion"} />;
}

const styles = StyleSheet.create({ chargement: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: couleurs.fond } });
