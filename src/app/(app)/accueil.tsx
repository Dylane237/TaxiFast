import { IconCar, IconLogout } from "@tabler/icons-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/api";
import { Bouton, Carte, MessageEtat } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { useAuthStore } from "@/stores/auth-store";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

export default function Accueil() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const deconnexion = useMutation({
    mutationFn: () => api.signOut(),
    onSuccess: async () => {
      await clearSession();
      queryClient.clear();
      router.replace("/connexion");
    },
  });

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <View style={styles.contenu}>
        <View style={styles.icone}>
          <IconCar color={couleurs.primaire} size={40} strokeWidth={1.8} />
        </View>
        <View style={styles.entete}>
          <Text style={styles.surtitre}>COVOITURAGE TAXI</Text>
          <Text style={styles.titre}>Bienvenue{user?.name ? `, ${user.name}` : ""}.</Text>
          <Text style={styles.description}>
            Votre espace {user?.role === "DRIVER" ? "chauffeur" : "client"} est prêt.
          </Text>
        </View>
        <Carte style={styles.carte}>
          <Text style={styles.carteTitre}>Connexion sécurisée</Text>
          <Text style={styles.carteTexte}>Votre session est conservée de manière sécurisée sur cet appareil.</Text>
        </Carte>
        {deconnexion.isError ? <MessageEtat type="erreur">{messageErreur(deconnexion.error)}</MessageEtat> : null}
        <Bouton
          variante="secondaire"
          chargement={deconnexion.isPending}
          icone={<IconLogout color={couleurs.primaire} size={20} />}
          onPress={() => deconnexion.mutate()}
        >Se déconnecter</Bouton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { flex: 1, justifyContent: "center", padding: espacements.lg, gap: espacements.xl },
  icone: { width: 72, height: 72, borderRadius: rayons.lg, alignItems: "center", justifyContent: "center", backgroundColor: couleurs.primaireClaire },
  entete: { gap: espacements.md },
  surtitre: { color: couleurs.primaire, fontSize: taillesTexte.petit, fontWeight: "800", letterSpacing: 1.2 },
  titre: { color: couleurs.texte, fontSize: taillesTexte.hero, fontWeight: "800", lineHeight: 39 },
  description: { color: couleurs.texteSecondaire, fontSize: taillesTexte.normal, lineHeight: 24 },
  carte: { gap: espacements.sm },
  carteTitre: { color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "800" },
  carteTexte: { color: couleurs.texteSecondaire, fontSize: taillesTexte.normal, lineHeight: 23 },
});
