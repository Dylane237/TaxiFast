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
        <Text style={styles.titre}>
          {title}
        </Text>
        <AvatarUtilisateur compact />
      </View>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: { gap: 4 },
  ligne: { flexDirection: "row", alignItems: "center", gap: espacements.sm },
  retour: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: rayons.rond,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  titre: {
    flex: 1,
    flexShrink: 1,
    color: couleurs.texte,
    fontSize: taillesTexte.titre,
    lineHeight: 27,
    fontWeight: "800",
  },
  description: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.petit,
    lineHeight: 18,
  },
});
