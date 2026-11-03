import { StyleSheet, Text, View } from "react-native";
import { couleurs, espacements, polices, rayons, taillesTexte } from "@/theme";

export function WizardProgress({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <View style={styles.root}>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.count}>{step + 1}/{total}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${((step + 1) / total) * 100}%` }]} />
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
  fill: { height: "100%", borderRadius: rayons.rond, backgroundColor: couleurs.primaire },
});
