import { IconArrowLeft } from "@tabler/icons-react-native";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

export function EntetePage({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.conteneur}>
      <Pressable accessibilityLabel="Retour" accessibilityRole="button" onPress={() => router.back()} style={styles.retour}>
        <IconArrowLeft color={couleurs.texte} size={24} />
      </Pressable>
      <View style={styles.textes}>
        <Text style={styles.titre}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: { gap: espacements.lg },
  retour: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: rayons.rond, backgroundColor: couleurs.surfaceSecondaire },
  textes: { gap: espacements.xs },
  titre: { color: couleurs.texte, fontSize: taillesTexte.titre, fontWeight: "900" },
  description: { color: couleurs.texteSecondaire, fontSize: taillesTexte.normal, lineHeight: 23 },
});
