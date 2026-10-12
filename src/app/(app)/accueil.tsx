import { IconCar, IconList, IconLogout, IconRoute } from "@tabler/icons-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
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
      <ScrollView contentContainerStyle={styles.contenu}>
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
        {user?.role === "DRIVER" ? (
          <View style={styles.actions}>
            <Carte style={styles.carte}>
              <Text style={styles.carteTitre}>Prêt à partir ?</Text>
              <Text style={styles.carteTexte}>Publiez votre axe, vos arrêts et le nombre de places proposées.</Text>
              <Bouton icone={<IconRoute color={couleurs.surface} size={20} />} onPress={() => router.push("/je-pars")}>Je pars</Bouton>
            </Carte>
            <Bouton variante="secondaire" icone={<IconList color={couleurs.primaire} size={20} />} onPress={() => router.push("/mes-trajets")}>Mes trajets</Bouton>
          </View>
        ) : (
          <MessageEtat>Les écrans client seront ajoutés dans les prochaines étapes.</MessageEtat>
        )}
        {deconnexion.isError ? <MessageEtat type="erreur">{messageErreur(deconnexion.error)}</MessageEtat> : null}
        <Bouton
          variante="secondaire"
          chargement={deconnexion.isPending}
          icone={<IconLogout color={couleurs.primaire} size={20} />}
          onPress={() => deconnexion.mutate()}
        >Se déconnecter</Bouton>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { flexGrow: 1, justifyContent: "center", padding: espacements.lg, gap: espacements.xl },
  icone: { width: 72, height: 72, borderRadius: rayons.lg, alignItems: "center", justifyContent: "center", backgroundColor: couleurs.primaireClaire },
  entete: { gap: espacements.md },
  surtitre: { color: couleurs.primaire, fontSize: taillesTexte.petit, fontWeight: "800", letterSpacing: 1.2 },
  titre: { color: couleurs.texte, fontSize: taillesTexte.hero, fontWeight: "800", lineHeight: 39 },
  description: { color: couleurs.texteSecondaire, fontSize: taillesTexte.normal, lineHeight: 24 },
  actions: { gap: espacements.md },
  carte: { gap: espacements.md },
  carteTitre: { color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "800" },
  carteTexte: { color: couleurs.texteSecondaire, fontSize: taillesTexte.normal, lineHeight: 23 },
});
