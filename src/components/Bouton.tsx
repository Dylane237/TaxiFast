import type { ReactNode } from "react";
import * as Haptics from "expo-haptics";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  couleurs,
  espacements,
  mouvements,
  rayons,
  taillesTexte,
} from "@/theme";

type BoutonProps = PressableProps & {
  children: string;
  icone?: ReactNode;
  chargement?: boolean;
  variante?: "primaire" | "secondaire" | "sombre" | "fantome";
};

export function Bouton({
  children,
  icone,
  chargement = false,
  variante = "primaire",
  disabled,
  style,
  onPressIn,
  onPressOut,
  onPress,
  ...props
}: BoutonProps) {
  const estDesactive = disabled || chargement;
  const echelle = useSharedValue(1);
  const mouvementReduit = useReducedMotion();
  const styleAnime = useAnimatedStyle(() => ({
    transform: [{ scale: echelle.value }],
  }));
  const couleurIndicateur =
    variante === "sombre" ? couleurs.surface : couleurs.texte;

  return (
    <Animated.View style={styleAnime}>
      <Pressable
        accessibilityRole="button"
        disabled={estDesactive}
        style={(state) => [
          styles.base,
          styles[variante],
          state.pressed && !estDesactive && styles.presse,
          estDesactive && styles.desactive,
          typeof style === "function" ? style(state) : style,
        ]}
        onPressIn={(event) => {
          echelle.set(
            withTiming(mouvementReduit ? 1 : 0.975, {
              duration: mouvements.rapide,
            }),
          );
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          echelle.set(withTiming(1, { duration: mouvements.rapide }));
          onPressOut?.(event);
        }}
        onPress={(event) => {
          void Haptics.selectionAsync();
          onPress?.(event);
        }}
        {...props}
      >
        {chargement ? (
          <ActivityIndicator color={couleurIndicateur} />
        ) : (
          <>
            {icone}
            <Text
              style={[styles.texte, variante === "sombre" && styles.texteClair]}
            >
              {children}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: rayons.md,
    paddingHorizontal: espacements.md,
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
  sombre: {
    backgroundColor: couleurs.encre,
  },
  fantome: {
    backgroundColor: "transparent",
  },
  presse: {
    opacity: 0.88,
  },
  desactive: {
    backgroundColor: couleurs.desactive,
    opacity: 0.7,
  },
  texte: {
    color: couleurs.texte,
    fontSize: taillesTexte.normal,
    fontWeight: "700",
  },
  texteClair: {
    color: couleurs.surface,
  },
});
