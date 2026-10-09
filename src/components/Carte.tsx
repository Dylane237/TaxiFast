import type { PropsWithChildren } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { couleurs, espacements, rayons } from "@/theme";

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
    borderColor: couleurs.bordure,
    borderWidth: 1,
    borderRadius: rayons.lg,
    padding: espacements.lg,
  },
});
