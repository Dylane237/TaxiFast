import type { ReactNode } from "react";
import { StatusBar } from "expo-status-bar";
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogoMarque } from "./LogoMarque";
import { couleurs, espacements, polices, rayons, taillesTexte } from "@/theme";

type AuthPageProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthPage({
  title,
  description,
  children,
}: AuthPageProps) {
  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        // Android affiche l'app sous le clavier (bord à bord) : il faut aussi y réserver la place.
        behavior="padding"
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.contenu}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.hero}>
            <View style={styles.marque}>
              <LogoMarque taille={36} />
              <Text style={styles.marqueTexte}>Taxi Fast</Text>
            </View>
            <View style={styles.entete}>
              <Text style={styles.titre}>{title}</Text>
              <Text style={styles.description}>{description}</Text>
            </View>
          </View>
          <View style={styles.feuille}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.encre },
  flex: { flex: 1 },
  contenu: { flexGrow: 1, backgroundColor: couleurs.encre },
  // En-tête sobre : la marque en haut, le titre en bas. Pas de décor, rien qui alourdisse l'écran.
  hero: {
    minHeight: 236,
    paddingHorizontal: espacements.lg,
    paddingTop: espacements.lg,
    paddingBottom: espacements.xl,
    justifyContent: "space-between",
  },
  marque: { flexDirection: "row", alignItems: "center", gap: espacements.sm },
  marqueTexte: {
    color: couleurs.surface,
    fontSize: taillesTexte.normal,
    letterSpacing: -0.3,
    fontFamily: polices.texteExtraGras,
  },
  entete: { gap: espacements.sm },
  titre: {
    color: couleurs.surface,
    fontSize: taillesTexte.hero,
    lineHeight: 38,
    letterSpacing: -0.8,
    fontFamily: polices.titre,
  },
  description: {
    color: couleurs.texteInverseSecondaire,
    fontSize: taillesTexte.petit,
    lineHeight: 20,
    maxWidth: 330,
    fontFamily: polices.texte,
  },
  feuille: {
    flexGrow: 1,
    minHeight: 340,
    backgroundColor: couleurs.surface,
    borderTopLeftRadius: rayons.xl,
    borderTopRightRadius: rayons.xl,
    padding: espacements.lg,
    paddingTop: espacements.xl,
    gap: espacements.md,
  },
});
