import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from "react-native";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

type BoutonProps = PressableProps & {
  children: string;
  icone?: ReactNode;
  chargement?: boolean;
  variante?: "primaire" | "secondaire";
};

export function Bouton({
  children,
  icone,
  chargement = false,
  variante = "primaire",
  disabled,
  style,
  ...props
}: BoutonProps) {
  const estDesactive = disabled || chargement;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={estDesactive}
      style={(state) => [
        styles.base,
        variante === "primaire" ? styles.primaire : styles.secondaire,
        state.pressed && !estDesactive && styles.presse,
        estDesactive && styles.desactive,
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      {chargement ? (
        <ActivityIndicator color={variante === "primaire" ? couleurs.surface : couleurs.primaire} />
      ) : (
        <>
          {icone}
          <Text style={[styles.texte, variante === "secondaire" && styles.texteSecondaire]}>
            {children}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: rayons.md,
    paddingHorizontal: espacements.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: espacements.sm,
  },
  primaire: {
    backgroundColor: couleurs.primaire,
  },
  secondaire: {
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  presse: {
    opacity: 0.82,
  },
  desactive: {
    backgroundColor: couleurs.desactive,
    opacity: 0.7,
  },
  texte: {
    color: couleurs.surface,
    fontSize: taillesTexte.normal,
    fontWeight: "700",
  },
  texteSecondaire: {
    color: couleurs.primaire,
  },
});
