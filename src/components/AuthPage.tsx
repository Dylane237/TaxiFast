import type { ReactNode } from "react";
import { IconRoute } from "@tabler/icons-react-native";
import { StatusBar } from "expo-status-bar";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteBackdrop } from "./RouteBackdrop";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
                <IconRoute color={couleurs.encre} size={21} strokeWidth={2.4} />
              </View>
              <View>
                <Text style={styles.marqueTexte}>Covoiturage Taxi</Text>
                <Text style={styles.marqueVille}>DOUALA</Text>
              </View>
            </View>
            <View style={styles.entete}>
              <View style={styles.icone}>{icon}</View>
              <Text style={styles.surtitre}>MOBILITÉ PARTAGÉE</Text>
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
  marqueTexte: {
    color: couleurs.surface,
    fontWeight: "900",
    fontSize: taillesTexte.petit,
    letterSpacing: -0.2,
  },
  marqueVille: {
    color: couleurs.texteInverseSecondaire,
    fontWeight: "800",
    fontSize: 9,
    letterSpacing: 1.8,
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
    fontWeight: "900",
    letterSpacing: 1.6,
    marginBottom: espacements.xs,
  },
  titre: {
    color: couleurs.surface,
    fontSize: taillesTexte.hero,
    fontWeight: "900",
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  description: {
    color: couleurs.texteInverseSecondaire,
    fontSize: taillesTexte.petit,
    lineHeight: 20,
    marginTop: espacements.sm,
    maxWidth: 330,
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
