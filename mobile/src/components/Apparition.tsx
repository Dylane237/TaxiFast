import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, { FadeInDown, useReducedMotion, ZoomIn } from "react-native-reanimated";
import { delaiApparitionListe } from "@/features/animations";
import { mouvements } from "@/theme";

type ApparitionProps = PropsWithChildren<{ delai?: number; style?: StyleProp<ViewStyle> }>;

export function Apparition({ children, delai = 0, style }: ApparitionProps) {
  const mouvementReduit = useReducedMotion();
  return (
    <Animated.View
      entering={mouvementReduit ? undefined : FadeInDown.duration(mouvements.standard).delay(delai)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/** Fait arriver en cascade les premiers éléments d'une liste, et laisse les suivants tranquilles. */
export function ApparitionListe({ index, children, style }: PropsWithChildren<{ index: number; style?: StyleProp<ViewStyle> }>) {
  const delai = delaiApparitionListe(index);
  if (delai === null) return <>{children}</>;
  return <Apparition delai={delai} style={style}>{children}</Apparition>;
}

/** Petit rebond d'arrivée, pour une icône de réussite. */
export function Rebond({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const mouvementReduit = useReducedMotion();
  return (
    <Animated.View entering={mouvementReduit ? undefined : ZoomIn.springify().damping(14).delay(mouvements.rapide)} style={style}>
      {children}
    </Animated.View>
  );
}
