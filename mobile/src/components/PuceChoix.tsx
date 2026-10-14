import { Pressable, StyleSheet, Text } from "react-native";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

type PuceChoixProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
};

export function PuceChoix({
  label,
  selected,
  onPress,
  disabled,
}: PuceChoixProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        selected && styles.selected,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: espacements.md,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  selected: { backgroundColor: couleurs.encre, borderColor: couleurs.encre },
  selectedLabel: { color: couleurs.surface },
  label: {
    color: couleurs.texte,
    fontSize: taillesTexte.petit,
    fontWeight: "800",
  },
  disabled: { opacity: 0.36 },
  pressed: { opacity: 0.7 },
});
