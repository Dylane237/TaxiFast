import type { PropsWithChildren } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { couleurs, espacements, ombres, rayons } from "@/theme";

export function Carte({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  return (
    <View style={[styles.carte, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: couleurs.surface,
    borderRadius: rayons.lg,
    padding: espacements.lg,
    ...ombres.carte,
  },
});
