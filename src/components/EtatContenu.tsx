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
    <View style={styles.root} accessibilityLiveRegion="polite">
      <View style={[styles.icon, type === "erreur" && styles.iconError]}>
        {type === "chargement" ? (
          <ActivityIndicator color={couleurs.texte} />
        ) : type === "erreur" ? (
          <IconAlertCircle color={couleurs.erreur} size={25} />
        ) : (
          <IconInbox color={couleurs.texteSecondaire} size={25} />
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
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
  action: { alignSelf: "stretch", marginTop: espacements.sm },
});
