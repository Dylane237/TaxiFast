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
};

export const Champ = forwardRef<TextInput, ChampProps>(function Champ(
  { etiquette, erreur, style, onFocus, onBlur, ...props },
  ref,
) {
  const [actif, setActif] = useState(false);

  return (
    <View style={styles.conteneur}>
      <Text style={styles.etiquette}>{etiquette}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={couleurs.texteSecondaire}
        style={[
          styles.champ,
          actif && styles.champActif,
          erreur && styles.champErreur,
          style,
        ]}
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
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  conteneur: {
    gap: 6,
  },
  etiquette: {
    color: couleurs.texte,
    fontSize: taillesTexte.petit,
    fontWeight: "700",
  },
  champ: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.md,
    backgroundColor: couleurs.surface,
    color: couleurs.texte,
    paddingHorizontal: espacements.md,
    fontSize: taillesTexte.normal,
  },
  champActif: {
    borderColor: couleurs.texte,
    backgroundColor: couleurs.surface,
  },
  champErreur: {
    borderColor: couleurs.erreur,
  },
  erreur: {
    color: couleurs.erreur,
    fontSize: taillesTexte.petit,
  },
});
