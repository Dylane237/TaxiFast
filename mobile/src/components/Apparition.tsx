import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
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
