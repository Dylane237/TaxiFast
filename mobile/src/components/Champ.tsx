import { forwardRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

type ChampProps = TextInputProps & {
  etiquette: string;
  erreur?: string;
  aide?: string;
  prefixe?: string;
};

export const Champ = forwardRef<TextInput, ChampProps>(function Champ(
  { etiquette, erreur, aide, prefixe, style, onFocus, onBlur, ...props },
  ref,
) {
  const [actif, setActif] = useState(false);

  return (
    <View style={styles.conteneur}>
      <Text style={styles.etiquette}>{etiquette}</Text>
      <View style={[styles.cadre, actif && styles.cadreActif, erreur && styles.cadreErreur]}>
        {prefixe ? <Text style={styles.prefixe}>{prefixe}</Text> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={couleurs.texteSecondaire}
          style={[styles.champ, style]}
          onFocus={(event) => {
            setActif(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setActif(false);
            onBlur?.(event);
          }}
          {...props}
        />
      </View>
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      {!erreur && aide ? <Text style={styles.aide}>{aide}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  conteneur: {
    gap: espacements.xs,
  },
  etiquette: {
    color: couleurs.texte,
    fontSize: taillesTexte.petit,
    fontWeight: "700",
  },
  cadre: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.md,
    backgroundColor: couleurs.fond,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  cadreActif: {
    borderColor: couleurs.texte,
    backgroundColor: couleurs.surface,
  },
  cadreErreur: {
    borderColor: couleurs.erreur,
  },
  prefixe: {
    color: couleurs.texte,
    fontSize: taillesTexte.normal,
    fontWeight: "800",
    paddingRight: espacements.sm,
    marginRight: espacements.sm,
    borderRightWidth: 1,
    borderRightColor: couleurs.bordure,
  },
  champ: {
    flex: 1,
    minHeight: 46,
    color: couleurs.texte,
    fontSize: taillesTexte.normal,
    paddingVertical: 0,
  },
  erreur: {
    color: couleurs.erreur,
    fontSize: taillesTexte.petit,
  },
  aide: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.micro,
    lineHeight: 16,
  },
});
