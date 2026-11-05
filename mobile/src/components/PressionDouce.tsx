import { useState } from "react";
import { Pressable, type PressableProps, type PressableStateCallbackType } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { mouvements } from "@/theme";

const PressableAnime = Animated.createAnimatedComponent(Pressable);

type PressionDouceProps = PressableProps & {
  /** Taille de l'élément enfoncé, 0,97 par défaut. */
  echelle?: number;
};

/**
 * Pressable qui s'enfonce un peu sous le doigt puis revient avec un petit ressort.
 * L'animation tourne sur le thread graphique ; avec « réduire les animations »,
 * seul le style `pressed` de l'appelant s'applique.
 */
export function PressionDouce({ echelle = 0.97, style, onPressIn, onPressOut, ...props }: PressionDouceProps) {
  const mouvementReduit = useReducedMotion();
  const valeur = useSharedValue(1);
  const [presse, setPresse] = useState(false);
  const styleAnime = useAnimatedStyle(() => ({ transform: [{ scale: valeur.value }] }));
  const etat: PressableStateCallbackType = { pressed: presse, hovered: false };

  return (
    <PressableAnime
      {...props}
      onPressIn={(event) => {
        setPresse(true);
        if (!mouvementReduit) valeur.set(withTiming(echelle, { duration: mouvements.rapide }));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPresse(false);
        valeur.set(mouvementReduit ? 1 : withSpring(1, mouvements.ressort));
        onPressOut?.(event);
      }}
      style={[typeof style === "function" ? style(etat) : style, styleAnime]}
    />
  );
}
