import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { IconArrowRight, IconInbox, IconList, IconLogout, IconMapPin, IconRoute } from "@tabler/icons-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/api";
import { Apparition, Bouton, MessageEtat, RouteBackdrop } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { useAuthStore } from "@/stores/auth-store";
import { couleurs, espacements, ombres, rayons, taillesTexte } from "@/theme";

export default function Accueil() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const points = useMemo(() => ["56%", "82%"], []);
  const deconnexion = useMutation({
    mutationFn: () => api.signOut(),
    onSuccess: async () => {
      await clearSession();
      queryClient.clear();
      router.replace("/connexion");
    },
  });

  return (
    <View style={styles.page}>
      <RouteBackdrop />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.barre}>
          <View style={styles.marque}><Text style={styles.marqueTexte}>CT</Text></View>
          <Pressable accessibilityLabel="Se déconnecter" accessibilityRole="button" onPress={() => deconnexion.mutate()} style={styles.iconeBouton}>
            {deconnexion.isPending ? <ActivityIndicator color={couleurs.surface} /> : <IconLogout color={couleurs.surface} size={21} />}
          </Pressable>
        </View>
        <Apparition style={styles.hero}>
          <Text style={styles.surtitre}>{user?.role === "DRIVER" ? "ESPACE CHAUFFEUR" : "ESPACE CLIENT"}</Text>
          <Text style={styles.titre}>Bonsoir{user?.name ? `, ${user.name}` : ""}</Text>
          <Text style={styles.description}>Où souhaitez-vous aller aujourd’hui ?</Text>
        </Apparition>
      </SafeAreaView>

      <BottomSheet
        index={0}
        snapPoints={points}
        enablePanDownToClose={false}
        backgroundStyle={styles.fondFeuille}
        handleIndicatorStyle={styles.poignee}
        style={styles.feuille}
      >
        <BottomSheetView style={styles.contenuFeuille}>
          {user?.role === "DRIVER" ? (
            <>
              <View style={styles.enteteFeuille}>
                <View>
                  <Text style={styles.label}>PRÊT À ROULER</Text>
                  <Text style={styles.titreFeuille}>Publier un départ</Text>
                </View>
                <View style={styles.pastille}><IconRoute color={couleurs.texte} size={24} /></View>
              </View>
              <Text style={styles.texteFeuille}>Choisissez un axe, ordonnez vos arrêts et indiquez vos places disponibles.</Text>
              <Bouton icone={<IconArrowRight color={couleurs.texte} size={20} />} onPress={() => router.push("/je-pars")}>Je pars maintenant</Bouton>
              <Pressable accessibilityRole="button" onPress={() => router.push("./trajet-en-cours")} style={styles.lienTrajets}>
                <View style={[styles.lienIcone, styles.lienIconePrimaire]}><IconMapPin color={couleurs.texte} size={21} /></View>
                <View style={styles.lienTexte}>
                  <Text style={styles.lienTitre}>Trajet en cours</Text>
                  <Text style={styles.lienDescription}>Montées, descentes et places restantes</Text>
                </View>
                <IconArrowRight color={couleurs.texteSecondaire} size={20} />
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => router.push("./demandes")} style={styles.lienTrajets}>
                <View style={[styles.lienIcone, styles.lienIconePrimaire]}><IconInbox color={couleurs.texte} size={21} /></View>
                <View style={styles.lienTexte}>
                  <Text style={styles.lienTitre}>Demandes sur mon axe</Text>
                  <Text style={styles.lienDescription}>Répondez aux propositions compatibles</Text>
                </View>
                <IconArrowRight color={couleurs.texteSecondaire} size={20} />
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => router.push("/mes-trajets")} style={styles.lienTrajets}>
                <View style={styles.lienIcone}><IconList color={couleurs.texte} size={21} /></View>
                <View style={styles.lienTexte}>
                  <Text style={styles.lienTitre}>Mes trajets</Text>
                  <Text style={styles.lienDescription}>Retrouvez vos départs publiés</Text>
                </View>
                <IconArrowRight color={couleurs.texteSecondaire} size={20} />
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.label}>BIENTÔT DISPONIBLE</Text>
              <Text style={styles.titreFeuille}>Trouver un trajet</Text>
              <MessageEtat>La recherche côté client arrive à la prochaine étape.</MessageEtat>
            </>
          )}
          {deconnexion.isError ? <MessageEtat type="erreur">{messageErreur(deconnexion.error)}</MessageEtat> : null}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.encre },
  safe: { flex: 1 },
  barre: { paddingHorizontal: espacements.lg, paddingTop: espacements.sm, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  marque: { width: 42, height: 42, borderRadius: rayons.sm, backgroundColor: couleurs.primaire, alignItems: "center", justifyContent: "center" },
  marqueTexte: { color: couleurs.encre, fontWeight: "900", fontSize: taillesTexte.normal },
  iconeBouton: { width: 44, height: 44, borderRadius: rayons.rond, backgroundColor: "#2B2E29", alignItems: "center", justifyContent: "center" },
  hero: { paddingHorizontal: espacements.lg, paddingTop: 72, gap: espacements.sm },
  surtitre: { color: couleurs.primaire, fontSize: taillesTexte.petit, fontWeight: "900", letterSpacing: 1.2 },
  titre: { color: couleurs.surface, fontSize: taillesTexte.hero, fontWeight: "900", lineHeight: 45 },
  description: { color: "#B9BDB6", fontSize: taillesTexte.normal },
  feuille: { ...ombres.feuille },
  fondFeuille: { backgroundColor: couleurs.surface, borderTopLeftRadius: rayons.xl, borderTopRightRadius: rayons.xl },
  poignee: { width: 42, backgroundColor: couleurs.bordure },
  contenuFeuille: { paddingHorizontal: espacements.lg, paddingTop: espacements.sm, paddingBottom: espacements.xxl, gap: espacements.lg },
  enteteFeuille: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: couleurs.texteSecondaire, fontSize: 11, fontWeight: "900", letterSpacing: 1.3, marginBottom: espacements.xs },
  titreFeuille: { color: couleurs.texte, fontSize: taillesTexte.titre, fontWeight: "900" },
  pastille: { width: 52, height: 52, borderRadius: rayons.rond, backgroundColor: couleurs.primaireClaire, alignItems: "center", justifyContent: "center" },
  texteFeuille: { color: couleurs.texteSecondaire, fontSize: taillesTexte.normal, lineHeight: 23 },
  lienTrajets: { minHeight: 70, paddingVertical: espacements.sm, flexDirection: "row", alignItems: "center", gap: espacements.md },
  lienIcone: { width: 46, height: 46, borderRadius: rayons.md, backgroundColor: couleurs.surfaceSecondaire, alignItems: "center", justifyContent: "center" },
  lienIconePrimaire: { backgroundColor: couleurs.primaireClaire },
  lienTexte: { flex: 1, gap: 3 },
  lienTitre: { color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "800" },
  lienDescription: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit },
});
