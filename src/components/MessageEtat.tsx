import { StyleSheet, Text } from "react-native";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

type MessageEtatProps = {
  children: string;
  type?: "erreur" | "succes" | "vide";
};

export function MessageEtat({ children, type = "vide" }: MessageEtatProps) {
  return (
    <Text
      accessibilityLiveRegion="polite"
      style={[
        styles.base,
        type === "erreur" && styles.erreur,
        type === "succes" && styles.succes,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: couleurs.texteSecondaire,
    backgroundColor: couleurs.surfaceSecondaire,
    borderRadius: rayons.sm,
    paddingHorizontal: espacements.md,
    paddingVertical: 10,
    fontSize: taillesTexte.petit,
    lineHeight: 18,
  },
  erreur: { color: couleurs.erreur, backgroundColor: couleurs.erreurClaire },
  succes: { color: couleurs.succes, backgroundColor: couleurs.succesClaire },
});
