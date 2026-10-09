import { IconCar } from "@tabler/icons-react-native";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bouton, Carte } from "@/components";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

export default function AccueilTemporaire() {
  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <View style={styles.contenu}>
        <View style={styles.icone}>
          <IconCar color={couleurs.primaire} size={40} strokeWidth={1.8} />
        </View>
        <View style={styles.entete}>
          <Text style={styles.surtitre}>COVOITURAGE TAXI</Text>
          <Text style={styles.titre}>Vos trajets urbains, simplement.</Text>
          <Text style={styles.description}>
            Le socle de l’application est prêt. Les écrans métier seront ajoutés étape par étape.
          </Text>
        </View>

        <Carte style={styles.carte}>
          <Text style={styles.carteTitre}>Configuration initiale terminée</Text>
          <Text style={styles.carteTexte}>
            Navigation, thème, requêtes asynchrones et stockage sécurisé sont configurés.
          </Text>
        </Carte>

        <Bouton variante="secondaire" onPress={() => router.push("/connexion")}>
          Voir le groupe de connexion
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
    gap: espacements.xl,
  },
  icone: {
    width: 72,
    height: 72,
    borderRadius: rayons.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: couleurs.primaireClaire,
  },
  entete: {
    gap: espacements.md,
  },
  surtitre: {
    color: couleurs.primaire,
    fontSize: taillesTexte.petit,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  titre: {
    color: couleurs.texte,
    fontSize: taillesTexte.hero,
    fontWeight: "800",
    lineHeight: 39,
  },
  description: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.normal,
    lineHeight: 24,
  },
  carte: {
    gap: espacements.sm,
  },
  carteTitre: {
    color: couleurs.texte,
    fontSize: taillesTexte.normal,
    fontWeight: "800",
  },
  carteTexte: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.normal,
    lineHeight: 23,
  },
});
