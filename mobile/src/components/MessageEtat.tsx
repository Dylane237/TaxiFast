import { StyleSheet } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { couleurs, espacements, mouvements, polices, rayons, taillesTexte } from "@/theme";

type MessageEtatProps = {
  children: string;
  type?: "erreur" | "succes" | "vide";
};

export function MessageEtat({ children, type = "vide" }: MessageEtatProps) {
  const mouvementReduit = useReducedMotion();
  // Seuls les retours d'action (erreur, réussite) arrivent en glissant ; un message neutre s'affiche tel quel.
  const anime = !mouvementReduit && type !== "vide";
  return (
    <Animated.Text
      entering={anime ? FadeInDown.duration(mouvements.standard) : undefined}
      accessibilityLiveRegion="polite"
      style={[
        styles.base,
        type === "erreur" && styles.erreur,
        type === "succes" && styles.succes,
      ]}
    >
      {children}
    </Animated.Text>
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
    fontFamily: polices.texte,
  },
  erreur: { color: couleurs.erreur, backgroundColor: couleurs.erreurClaire },
  succes: { color: couleurs.succes, backgroundColor: couleurs.succesClaire },
});
