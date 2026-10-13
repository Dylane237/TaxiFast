import type { ReactNode } from "react";
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
            <View style={styles.marque}>
              <Text style={styles.marqueTexte}>CT</Text>
            </View>
            <View style={styles.icone}>{icon}</View>
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
  hero: {
    minHeight: 258,
    padding: espacements.lg,
    justifyContent: "flex-end",
    gap: espacements.md,
  },
  marque: {
    position: "absolute",
    top: espacements.lg,
    left: espacements.lg,
    width: 40,
    height: 40,
    borderRadius: rayons.sm,
    backgroundColor: couleurs.primaire,
    alignItems: "center",
    justifyContent: "center",
  },
  marqueTexte: {
    color: couleurs.encre,
    fontWeight: "900",
    fontSize: taillesTexte.normal,
  },
  icone: {
    width: 54,
    height: 54,
    borderRadius: rayons.md,
    backgroundColor: "#2B2E29",
    alignItems: "center",
    justifyContent: "center",
  },
  entete: { gap: espacements.sm },
  titre: {
    color: couleurs.surface,
    fontSize: taillesTexte.hero,
    fontWeight: "900",
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  description: {
    color: "#B9BDB6",
    fontSize: taillesTexte.petit,
    lineHeight: 20,
  },
  feuille: {
    flexGrow: 1,
    minHeight: 360,
    backgroundColor: couleurs.surface,
    borderTopLeftRadius: rayons.xl,
    borderTopRightRadius: rayons.xl,
    padding: espacements.lg,
    paddingTop: espacements.lg,
    gap: espacements.md,
  },
});
