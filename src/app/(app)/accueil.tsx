import {
  IconArrowRight,
  IconClock,
  IconHistory,
  IconInbox,
  IconLogout,
  IconMapPin,
  IconRoute,
  IconSearch,
  IconWallet,
} from "@tabler/icons-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/api";
import { Bouton, LigneAction, MessageEtat } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { useAuthStore } from "@/stores/auth-store";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

export default function Accueil() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const driver = user?.role === "DRIVER";
  const signOut = useMutation({
    mutationFn: () => api.signOut(),
    onSuccess: async () => {
      await clearSession();
      queryClient.clear();
      router.replace("/connexion");
    },
  });

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <View style={styles.brand}>
            <Text style={styles.brandText}>CT</Text>
          </View>
          <View style={styles.userCopy}>
            <Text style={styles.eyebrow}>
              {driver ? "CHAUFFEUR" : "CLIENT"}
            </Text>
            <Text style={styles.greeting}>
              Bonjour{user?.name ? `, ${user.name}` : ""}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Se déconnecter"
            onPress={() => signOut.mutate()}
            style={styles.iconButton}
          >
            {signOut.isPending ? (
              <ActivityIndicator color={couleurs.texte} />
            ) : (
              <IconLogout color={couleurs.texte} size={20} />
            )}
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            {driver ? (
              <IconRoute color={couleurs.texte} size={25} />
            ) : (
              <IconSearch color={couleurs.texte} size={25} />
            )}
          </View>
          <Text style={styles.heroTitle}>
            {driver ? "Un départ à publier ?" : "Où allez-vous ?"}
          </Text>
          <Text style={styles.heroDescription}>
            {driver
              ? "Sélectionnez votre axe et vos arrêts. Les demandes compatibles suivront automatiquement."
              : "Choisissez deux arrêts sur un axe et proposez votre prix au chauffeur."}
          </Text>
          <Bouton
            icone={<IconArrowRight color={couleurs.texte} size={19} />}
            onPress={() => router.push(driver ? "/je-pars" : "/recherche")}
          >
            {driver ? "Publier un trajet" : "Rechercher un trajet"}
          </Bouton>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {driver ? "MON ACTIVITÉ" : "MES DÉPLACEMENTS"}
          </Text>
          {driver ? (
            <>
              <LigneAction
                icon={<IconMapPin color={couleurs.texte} size={20} />}
                title="Trajet en cours"
                description="Arrêts, passagers et places"
                onPress={() => router.push("/trajet-en-cours")}
              />
              <LigneAction
                icon={<IconInbox color={couleurs.texte} size={20} />}
                title="Demandes reçues"
                description="Propositions sur mes axes"
                onPress={() => router.push("/demandes")}
              />
              <LigneAction
                icon={<IconClock color={couleurs.texte} size={20} />}
                title="Mes trajets"
                description="Départs publiés et statuts"
                onPress={() => router.push("/mes-trajets")}
              />
              <LigneAction
                icon={<IconWallet color={couleurs.texte} size={20} />}
                title="Portefeuille"
                description="Gains et commissions"
                onPress={() => router.push("/portefeuille")}
              />
            </>
          ) : (
            <>
              <LigneAction
                icon={<IconClock color={couleurs.texte} size={20} />}
                title="Demandes en cours"
                description="Suivre ou annuler une recherche"
                onPress={() => router.push("/mes-demandes")}
              />
              <LigneAction
                icon={<IconInbox color={couleurs.texte} size={20} />}
                title="Offres reçues"
                description="Comparer les chauffeurs"
                onPress={() => router.push("/mes-demandes")}
              />
            </>
          )}
          <LigneAction
            icon={<IconHistory color={couleurs.texte} size={20} />}
            title="Historique"
            description="Courses terminées et avis"
            onPress={() => router.push("/historique")}
          />
        </View>

        {signOut.isError ? (
          <MessageEtat type="erreur">
            {messageErreur(signOut.error)}
          </MessageEtat>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  content: {
    padding: espacements.lg,
    paddingBottom: espacements.xxl,
    gap: espacements.lg,
  },
  topbar: { flexDirection: "row", alignItems: "center", gap: espacements.md },
  brand: {
    width: 42,
    height: 42,
    borderRadius: rayons.md,
    backgroundColor: couleurs.encre,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    color: couleurs.primaire,
    fontSize: taillesTexte.normal,
    fontWeight: "900",
  },
  userCopy: { flex: 1, gap: 1 },
  eyebrow: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.micro,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  greeting: { color: couleurs.texte, fontSize: 18, fontWeight: "900" },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.xl,
    padding: espacements.lg,
    gap: espacements.md,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: rayons.md,
    backgroundColor: couleurs.primaire,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    color: couleurs.texte,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  heroDescription: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.petit,
    lineHeight: 19,
    maxWidth: 340,
  },
  section: {
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.lg,
    paddingHorizontal: espacements.md,
    paddingTop: espacements.md,
  },
  sectionTitle: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.micro,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginBottom: 2,
  },
});
