import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { IconAlertCircle, IconInbox } from "@tabler/icons-react-native";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

type EtatContenuProps = {
  type: "chargement" | "vide" | "erreur";
  title: string;
  description: string;
  action?: ReactNode;
};

export function EtatContenu({
  type,
  title,
  description,
  action,
}: EtatContenuProps) {
  return (
    <View style={[styles.root, type === "chargement" && styles.loadingRoot]} accessibilityLiveRegion="polite">
      <View style={[styles.icon, type === "chargement" && styles.loadingIcon, type === "erreur" && styles.iconError]}>
        {type === "chargement" ? (
          <ActivityIndicator color={couleurs.texte} />
        ) : type === "erreur" ? (
          <IconAlertCircle color={couleurs.erreur} size={25} />
        ) : (
          <IconInbox color={couleurs.texteSecondaire} size={25} />
        )}
      </View>
      <View style={[styles.copy, type === "chargement" && styles.loadingCopy]}>
        <Text style={[styles.title, type === "chargement" && styles.loadingText]}>{title}</Text>
        <Text style={[styles.description, type === "chargement" && styles.loadingText]}>{description}</Text>
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: espacements.xl,
    paddingHorizontal: espacements.lg,
    gap: espacements.sm,
  },
  loadingRoot: {
    minHeight: 76,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingVertical: espacements.md,
    paddingHorizontal: 0,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.surfaceSecondaire,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: espacements.xs,
  },
  iconError: { backgroundColor: couleurs.erreurClaire },
  loadingIcon: { width: 40, height: 40, marginBottom: 0 },
  copy: { alignItems: "center", gap: espacements.xs },
  loadingCopy: { flex: 1, alignItems: "flex-start" },
  title: {
    color: couleurs.texte,
    fontSize: taillesTexte.normal,
    fontWeight: "900",
    textAlign: "center",
  },
  description: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.petit,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 290,
  },
  loadingText: { textAlign: "left", maxWidth: undefined },
  action: { alignSelf: "stretch", marginTop: espacements.sm },
});
