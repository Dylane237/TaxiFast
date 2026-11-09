import { IconCheck } from "@tabler/icons-react-native";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { couleurs, espacements, polices } from "@/theme";
import { PressionDouce } from "./PressionDouce";

/** Une carte à cocher « Client » ou « Chauffeur », pour le choix du rôle à l'inscription. */
export function CarteRole({
  selected,
  icon,
  title,
  description,
  onPress,
}: {
  selected: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <PressionDouce
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [styles.roleCard, selected && styles.roleCardSelected, pressed && styles.roleCardPressed]}
      onPress={onPress}
    >
      <View style={[styles.roleIcon, selected && styles.roleIconSelected]}>{icon}</View>
      <View style={styles.roleCopy}>
        <Text style={styles.roleTitle}>{title}</Text>
        <Text style={styles.roleDescription}>{description}</Text>
      </View>
      <View style={[styles.check, selected && styles.checkSelected]}>
        {selected ? <IconCheck color={couleurs.encre} size={15} strokeWidth={3} /> : null}
      </View>
    </PressionDouce>
  );
}

const styles = StyleSheet.create({
  roleCard: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: espacements.md,
    padding: espacements.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.fond,
  },
  roleCardSelected: { borderColor: couleurs.encre, backgroundColor: couleurs.primaireClaire },
  roleCardPressed: { opacity: 0.82 },
  roleIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: couleurs.surface, alignItems: "center", justifyContent: "center" },
  roleIconSelected: { backgroundColor: couleurs.primaire },
  roleCopy: { flex: 1, gap: 3 },
  roleTitle: { color: couleurs.texte, fontSize: 16, fontFamily: polices.texteExtraGras },
  roleDescription: { color: couleurs.texteSecondaire, fontSize: 13, lineHeight: 18, fontFamily: polices.texte },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: couleurs.bordure, alignItems: "center", justifyContent: "center" },
  checkSelected: { backgroundColor: couleurs.primaire, borderColor: couleurs.primairePresse },
});
