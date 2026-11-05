import { Image, StyleSheet } from "react-native";
import { couleurs } from "@/theme";

const logo = require("../../assets/brand/logo-192.png");

/** Le logo Taxi Fast (taxi devant le soleil) en petite tuile, pour les en-têtes et le menu. */
export function LogoMarque({ taille = 40 }: { taille?: number }) {
  return (
    <Image
      source={logo}
      accessibilityIgnoresInvertColors
      accessibilityLabel="Taxi Fast"
      style={[styles.tuile, { width: taille, height: taille, borderRadius: Math.round(taille * 0.26) }]}
    />
  );
}

const styles = StyleSheet.create({
  tuile: { backgroundColor: couleurs.fond },
});
