import * as Haptics from "expo-haptics";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { couleurs } from "@/theme";
import { echelleSoleilPourCouvrir, LOGO_TAILLE, MINUTAGE, SOLEIL } from "./intro-geometrie";
import { TaxiLogo } from "./TaxiLogo";

// Courbes de la maison : sortie franche, et mouvement à l'écran sans départ ni arrivée brusques.
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

type IntroTaxiProps = {
  /** L'app a fini de charger ce qu'il faut pour afficher le premier écran. */
  pret: boolean;
  onTerminee: () => void;
};

/**
 * Intro au démarrage à froid : part de l'image exacte de l'écran de lancement,
 * le taxi recule d'un poil puis file à droite, le soleil grandit jusqu'à couvrir
 * l'écran, et le tout s'efface sur l'app. Un toucher passe l'intro.
 */
export function IntroTaxi({ pret, onTerminee }: IntroTaxiProps) {
  const { width, height } = useWindowDimensions();
  const mouvementReduit = useReducedMotion();
  const [couvert, setCouvert] = useState(mouvementReduit);
  const [lancee, setLancee] = useState(false);

  const taxiX = useSharedValue(0);
  const soleilEchelle = useSharedValue(1);
  const anneauOpacite = useSharedValue(1);
  const opacite = useSharedValue(1);

  // Tant que l'app charge, l'intro garde l'image de l'écran de lancement.
  useEffect(() => {
    if (!pret || mouvementReduit) return;
    const depart = setTimeout(() => setLancee(true), MINUTAGE.attente);
    return () => clearTimeout(depart);
  }, [pret, mouvementReduit]);

  useEffect(() => {
    if (!lancee) return;
    // Le taxi du logo regarde vers la gauche : il recule d'un poil (vers la droite), puis part devant lui.
    // La fin de la courbe, qui ralentit, se joue hors de l'écran : on ne voit que l'accélération.
    taxiX.set(withSequence(
      withTiming(6, { duration: MINUTAGE.recul, easing: EASE_OUT }),
      withTiming(-width, { duration: MINUTAGE.depart, easing: EASE_IN_OUT }),
    ));
    anneauOpacite.set(withDelay(MINUTAGE.soleilDebut, withTiming(0, { duration: MINUTAGE.anneauDuree })));
    soleilEchelle.set(withDelay(
      MINUTAGE.soleilDebut,
      withTiming(
        echelleSoleilPourCouvrir(width, height),
        { duration: MINUTAGE.soleilDuree, easing: EASE_IN_OUT },
        (fini) => {
          if (fini) scheduleOnRN(setCouvert, true);
        },
      ),
    ));
    const vibration = setTimeout(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, MINUTAGE.recul);
    return () => clearTimeout(vibration);
    // L'intro ne se joue qu'une fois, avec les dimensions du moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lancee]);

  useEffect(() => {
    if (!couvert || !pret) return;
    opacite.set(withTiming(
      0,
      { duration: mouvementReduit ? MINUTAGE.sortieReduite : MINUTAGE.sortie, easing: EASE_OUT },
      (fini) => {
        if (fini) scheduleOnRN(onTerminee);
      },
    ));
  }, [couvert, pret, mouvementReduit, onTerminee, opacite]);

  const styleCalque = useAnimatedStyle(() => ({ opacity: opacite.value }));
  const styleTaxi = useAnimatedStyle(() => ({ transform: [{ translateX: taxiX.value }] }));
  const styleSoleil = useAnimatedStyle(() => ({ transform: [{ scale: soleilEchelle.value }] }));
  const styleAnneau = useAnimatedStyle(() => ({ opacity: anneauOpacite.value }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.calque, styleCalque]}
      onLayout={() => SplashScreen.hide()}
    >
      <Pressable style={styles.centre} onPress={() => setCouvert(true)} accessibilityRole="button" accessibilityLabel="Taxi Fast" accessibilityHint="Passer l'introduction">
        <View style={styles.logo}>
          <Animated.View style={[styles.soleil, styleSoleil]}>
            <Animated.View style={[styles.anneau, styleAnneau]} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, styleTaxi]}>
            <TaxiLogo fond={couleurs.fond} />
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  calque: { zIndex: 10, elevation: 10, backgroundColor: couleurs.fond },
  centre: { flex: 1, alignItems: "center", justifyContent: "center" },
  logo: { width: LOGO_TAILLE, height: LOGO_TAILLE },
  soleil: {
    position: "absolute",
    left: SOLEIL.centre.x - SOLEIL.rayon,
    top: SOLEIL.centre.y - SOLEIL.rayon,
    width: SOLEIL.rayon * 2,
    height: SOLEIL.rayon * 2,
    borderRadius: SOLEIL.rayon,
    backgroundColor: couleurs.primaire,
    alignItems: "center",
    justifyContent: "center",
  },
  anneau: {
    width: SOLEIL.anneauRayon * 2 + SOLEIL.anneauEpaisseur,
    height: SOLEIL.anneauRayon * 2 + SOLEIL.anneauEpaisseur,
    borderRadius: SOLEIL.anneauRayon + SOLEIL.anneauEpaisseur / 2,
    borderWidth: SOLEIL.anneauEpaisseur,
    borderColor: couleurs.surface,
  },
});
