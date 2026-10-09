import { IconArrowLeft, IconLock } from "@tabler/icons-react-native";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bouton, Carte, Champ } from "@/components";
import { couleurs, espacements, taillesTexte } from "@/theme";

export default function ConnexionTemporaire() {
  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <View style={styles.contenu}>
        <IconLock color={couleurs.primaire} size={36} strokeWidth={1.8} />
        <View style={styles.entete}>
          <Text style={styles.titre}>Connexion à venir</Text>
          <Text style={styles.description}>
            Le parcours téléphone et code OTP sera réalisé à la tâche 9.
          </Text>
        </View>
        <Carte>
          <Champ etiquette="Téléphone" placeholder="+237 6XX XXX XXX" editable={false} />
        </Carte>
        <Bouton
          variante="secondaire"
          icone={<IconArrowLeft color={couleurs.primaire} size={20} />}
          onPress={() => router.back()}
        >
          Retour à l’accueil
        </Bouton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  contenu: {
    flex: 1,
    justifyContent: "center",
    padding: espacements.lg,
    gap: espacements.lg,
  },
  entete: {
    gap: espacements.sm,
  },
  titre: {
    color: couleurs.texte,
    fontSize: taillesTexte.titre,
    fontWeight: "800",
  },
  description: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.normal,
    lineHeight: 24,
  },
});
