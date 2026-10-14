import { Pressable, StyleSheet, Text } from "react-native";
import { useAuthStore } from "@/stores/auth-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { couleurs, rayons, taillesTexte } from "@/theme";

function initiales(name: string | null | undefined): string {
  if (!name?.trim()) return "CT";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AvatarUtilisateur({ compact = false }: { compact?: boolean }) {
  const name = useAuthStore((state) => state.user?.name);
  const openMenu = useNavigationStore((state) => state.openMenu);

  return (
    <Pressable
      accessibilityLabel="Ouvrir le menu du compte"
      accessibilityRole="button"
      hitSlop={8}
      onPress={openMenu}
      style={({ pressed }) => [
        styles.avatar,
        compact ? styles.compact : styles.normal,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.text}>{initiales(name)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: rayons.rond,
    backgroundColor: couleurs.encre,
    borderWidth: 2,
    borderColor: couleurs.primaire,
  },
  normal: { width: 44, height: 44 },
  compact: { width: 38, height: 38 },
  text: {
    color: couleurs.primaire,
    fontSize: taillesTexte.petit,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});
