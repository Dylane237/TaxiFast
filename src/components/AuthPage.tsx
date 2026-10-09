import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { couleurs, espacements, taillesTexte } from "@/theme";

type AuthPageProps = {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthPage({ icon, title, description, children }: AuthPageProps) {
  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
          {icon}
          <View style={styles.entete}>
            <Text style={styles.titre}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  flex: { flex: 1 },
  contenu: { flexGrow: 1, justifyContent: "center", padding: espacements.lg, gap: espacements.lg },
  entete: { gap: espacements.sm },
  titre: { color: couleurs.texte, fontSize: taillesTexte.titre, fontWeight: "800" },
  description: { color: couleurs.texteSecondaire, fontSize: taillesTexte.normal, lineHeight: 24 },
});
