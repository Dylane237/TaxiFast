import type { ReactNode } from "react";
import { IconChevronRight } from "@tabler/icons-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

type LigneActionProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  badge?: string;
  onPress: () => void;
};

export function LigneAction({
  icon,
  title,
  description,
  badge,
  onPress,
}: LigneActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      <View style={styles.icon}>{icon}</View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {description ? (
          <Text style={styles.description}>
            {description}
          </Text>
        ) : null}
      </View>
      {badge ? <Text style={styles.badge}>{badge}</Text> : null}
      <IconChevronRight color={couleurs.texteSecondaire} size={19} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: espacements.md,
    paddingVertical: espacements.sm,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  pressed: { opacity: 0.62 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: rayons.md,
    backgroundColor: couleurs.surfaceSecondaire,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, flexShrink: 1, gap: 2, paddingVertical: espacements.xs },
  title: {
    color: couleurs.texte,
    fontSize: taillesTexte.normal,
    fontWeight: "800",
  },
  description: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.petit,
    lineHeight: 19,
  },
  badge: {
    color: couleurs.texte,
    backgroundColor: couleurs.primaireClaire,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rayons.rond,
    fontSize: taillesTexte.micro,
    fontWeight: "900",
  },
});
