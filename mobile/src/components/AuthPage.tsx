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
import { RouteBackdrop } from "./RouteBackdrop";
import { couleurs, espacements, polices, rayons, taillesTexte } from "@/theme";

type AuthPageProps = {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthPage({
  icon,
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
            <RouteBackdrop />
            <View style={styles.marque}>
              <View style={styles.logo}>
                <Text style={styles.logoTexte}>TF</Text>
              </View>
              <View>
                <Text style={styles.marqueTexte}>Taxi Fast</Text>
                <Text style={styles.marqueVille}>DOUALA</Text>
              </View>
            </View>
            <View style={styles.entete}>
              <View style={styles.icone}>{icon}</View>
              <Text style={styles.surtitre}>TAXI PARTAGÉ</Text>
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
  hero: {
    minHeight: 286,
    padding: espacements.lg,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  marque: {
    position: "absolute",
    top: espacements.lg,
    left: espacements.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: espacements.sm,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: rayons.md,
    backgroundColor: couleurs.primaire,
    alignItems: "center",
    justifyContent: "center",
  },
  logoTexte: {
    color: couleurs.encre,
    fontSize: taillesTexte.normal,
    fontFamily: polices.titre,
  },
  marqueTexte: {
    color: couleurs.surface,
    fontSize: taillesTexte.petit,
    letterSpacing: -0.2,
    fontFamily: polices.texteExtraGras,
  },
  marqueVille: {
    color: couleurs.texteInverseSecondaire,
    fontSize: 9,
    letterSpacing: 1.8,
    fontFamily: polices.texteGras,
  },
  icone: {
    width: 48,
    height: 48,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.encreDouce,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: espacements.md,
  },
  entete: { alignItems: "flex-start" },
  surtitre: {
    color: couleurs.primaire,
    fontSize: taillesTexte.micro,
    letterSpacing: 1.6,
    marginBottom: espacements.xs,
    fontFamily: polices.texteGras,
  },
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
    marginTop: espacements.sm,
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
