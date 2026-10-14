import { IconArrowLeft } from "@tabler/icons-react-native";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AvatarUtilisateur } from "./AvatarUtilisateur";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

export function EntetePage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={styles.conteneur}>
      <View style={styles.ligne}>
        <Pressable
          accessibilityLabel="Retour"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.retour}
        >
          <IconArrowLeft color={couleurs.texte} size={22} />
        </Pressable>
        <Text numberOfLines={1} style={styles.titre}>
          {title}
        </Text>
        <AvatarUtilisateur compact />
      </View>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: { gap: espacements.sm },
  ligne: { flexDirection: "row", alignItems: "center", gap: espacements.md },
  retour: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: rayons.rond,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  titre: {
    flex: 1,
    color: couleurs.texte,
    fontSize: taillesTexte.titre,
    fontWeight: "900",
  },
  description: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.petit,
    lineHeight: 19,
  },
});
