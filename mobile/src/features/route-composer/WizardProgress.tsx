import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { couleurs, espacements, mouvements, polices, rayons, taillesTexte } from "@/theme";

export function WizardProgress({ step, total, label }: { step: number; total: number; label: string }) {
  const mouvementReduit = useReducedMotion();
  const cible = (step + 1) / total;
  const progression = useSharedValue(cible);

  useEffect(() => {
    progression.set(mouvementReduit ? cible : withTiming(cible, { duration: mouvements.lent, easing: Easing.out(Easing.cubic) }));
  }, [cible, mouvementReduit, progression]);

  // On anime une mise à l'échelle depuis la gauche plutôt que la largeur : pas de recalcul de mise en page.
  const styleRemplissage = useAnimatedStyle(() => ({ transform: [{ scaleX: progression.value }] }));

  return (
    <View style={styles.root}>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.count}>{step + 1}/{total}</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, styleRemplissage]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: espacements.sm },
  copy: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: couleurs.texteSecondaire, fontSize: taillesTexte.micro, letterSpacing: 0.8, fontFamily: polices.texteGras },
  count: { color: couleurs.texteSecondaire, fontSize: taillesTexte.micro, fontFamily: polices.texteGras },
  track: { height: 4, borderRadius: rayons.rond, backgroundColor: couleurs.bordure, overflow: "hidden" },
  fill: { width: "100%", height: "100%", backgroundColor: couleurs.primaire, transformOrigin: "left" },
});
