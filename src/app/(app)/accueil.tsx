import {
  IconArrowRight,
  IconClock,
  IconMapPin,
  IconRoute,
  IconSearch,
} from "@tabler/icons-react-native";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AvatarUtilisateur, Bouton, Carte } from "@/components";
import { useAuthStore } from "@/stores/auth-store";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

export default function Accueil() {
  const user = useAuthStore((state) => state.user);
  const driver = user?.role === "DRIVER";

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>CT</Text>
            </View>
            <View>
              <Text style={styles.brandName}>Covoiturage Taxi</Text>
              <Text style={styles.location}>Douala, Cameroun</Text>
            </View>
          </View>
          <AvatarUtilisateur />
        </View>

        <View style={styles.welcome}>
          <Text style={styles.eyebrow}>
            {driver ? "ESPACE CHAUFFEUR" : "ESPACE CLIENT"}
          </Text>
          <Text style={styles.greeting}>
            Bonjour{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </Text>
          <Text style={styles.welcomeDescription}>
            {driver
              ? "Publiez votre prochain départ et retrouvez les passagers sur votre itinéraire."
              : "Trouvez un chauffeur qui dessert votre itinéraire, au moment qui vous convient."}
          </Text>
        </View>

        <View
          style={[styles.hero, driver ? styles.heroDriver : styles.heroClient]}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              {driver ? (
                <IconRoute color={couleurs.texte} size={26} />
              ) : (
                <IconSearch color={couleurs.texte} size={26} />
              )}
            </View>
            <Text style={styles.heroKicker}>
              {driver ? "NOUVEAU DÉPART" : "NOUVELLE RECHERCHE"}
            </Text>
          </View>
          <Text style={styles.heroTitle}>
            {driver ? "Vous prenez la route ?" : "Où allez-vous ?"}
          </Text>
          <Text style={styles.heroDescription}>
            {driver
              ? "Indiquez votre itinéraire, vos arrêts et l’heure de départ."
              : "Choisissez votre montée, votre descente et proposez votre prix."}
          </Text>
          <Bouton
            variante="sombre"
            icone={<IconArrowRight color={couleurs.surface} size={19} />}
            onPress={() => router.push(driver ? "/je-pars" : "/recherche")}
          >
            {driver ? "Publier un trajet" : "Trouver un trajet"}
          </Bouton>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>À SUIVRE</Text>
          <Text style={styles.sectionHint}>Le reste est dans votre menu</Text>
        </View>
        <Carte style={styles.focusCard}>
          <View style={styles.focusIcon}>
            {driver ? (
              <IconMapPin color={couleurs.texte} size={22} />
            ) : (
              <IconClock color={couleurs.texte} size={22} />
            )}
          </View>
          <View style={styles.focusCopy}>
            <Text style={styles.focusTitle}>
              {driver ? "Trajet en cours" : "Mes demandes"}
            </Text>
            <Text style={styles.focusDescription}>
              {driver
                ? "Passagers, arrêts et occupation"
                : "Réponses et offres des chauffeurs"}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push(driver ? "/trajet-en-cours" : "/mes-demandes")
            }
            style={({ pressed }) => [
              styles.focusAction,
              pressed && styles.pressed,
            ]}
          >
            <IconArrowRight color={couleurs.texte} size={19} />
          </Pressable>
        </Carte>
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
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: espacements.sm },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: rayons.md,
    backgroundColor: couleurs.encre,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: {
    color: couleurs.primaire,
    fontSize: taillesTexte.petit,
    fontWeight: "900",
  },
  brandName: {
    color: couleurs.texte,
    fontSize: taillesTexte.petit,
    fontWeight: "900",
  },
  location: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.micro,
    marginTop: 1,
  },
  welcome: { gap: espacements.xs, paddingTop: espacements.sm },
  eyebrow: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.micro,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  greeting: {
    color: couleurs.texte,
    fontSize: 28,
    lineHeight: 33,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  welcomeDescription: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.petit,
    lineHeight: 19,
    maxWidth: 330,
  },
  hero: {
    borderRadius: rayons.xl,
    padding: espacements.lg,
    gap: espacements.md,
    overflow: "hidden",
  },
  heroDriver: { backgroundColor: couleurs.primaire },
  heroClient: { backgroundColor: couleurs.primaire },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: rayons.md,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroKicker: {
    color: couleurs.texte,
    fontSize: taillesTexte.micro,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroTitle: {
    color: couleurs.texte,
    fontSize: 27,
    lineHeight: 31,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  heroDescription: {
    color: "#49400F",
    fontSize: taillesTexte.petit,
    lineHeight: 19,
    maxWidth: 315,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: espacements.sm,
  },
  sectionTitle: {
    color: couleurs.texte,
    fontSize: taillesTexte.micro,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  sectionHint: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.micro,
  },
  focusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacements.md,
    padding: espacements.md,
  },
  focusIcon: {
    width: 46,
    height: 46,
    borderRadius: rayons.md,
    backgroundColor: couleurs.surfaceSecondaire,
    alignItems: "center",
    justifyContent: "center",
  },
  focusCopy: { flex: 1, gap: 3 },
  focusTitle: {
    color: couleurs.texte,
    fontSize: taillesTexte.normal,
    fontWeight: "900",
  },
  focusDescription: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.petit,
  },
  focusAction: {
    width: 40,
    height: 40,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.primaire,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.68 },
});
