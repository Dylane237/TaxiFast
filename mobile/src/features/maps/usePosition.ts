import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import type { Coordonnees } from "./distance";

/** Sans aucune position après ce délai, on le dit (le suivi continue et corrige si le GPS répond plus tard). */
const DELAI_MS = 15_000;

export type EtatPosition =
  | { statut: "attente" }
  | {
      statut: "trouvee";
      position: Coordonnees;
      /** Marge d'erreur en mètres, quand le téléphone la donne. */
      precision: number | null;
      /** Première position de cette localisation : la carte se cadre dessus et ne suit pas chaque petit mouvement. */
      ancrage: Coordonnees;
    }
  | { statut: "refusee" }
  | { statut: "indisponible" };

function versEtat(lieu: Location.LocationObject, precedent: EtatPosition): EtatPosition {
  const position = { latitude: lieu.coords.latitude, longitude: lieu.coords.longitude };
  return {
    statut: "trouvee",
    position,
    precision: lieu.coords.accuracy ?? null,
    ancrage: precedent.statut === "trouvee" ? precedent.ancrage : position,
  };
}

/**
 * Position réelle de l'appareil, suivie tant que l'écran est ouvert.
 * La dernière position connue s'affiche tout de suite, puis le GPS (haute précision) l'affine.
 * `demander` affiche la demande d'autorisation ; sans elle, on ne lit la position que si elle est déjà accordée.
 * `suivre: false` lit la position une seule fois (pour afficher la ville, sans garder le GPS allumé).
 */
export function usePosition({ demander = false, suivre = true }: { demander?: boolean; suivre?: boolean } = {}) {
  const [etat, setEtat] = useState<EtatPosition>({ statut: "attente" });
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    let actif = true;
    let abonnement: Location.LocationSubscription | null = null;
    let minuteur: ReturnType<typeof setTimeout> | undefined;

    const demarrer = async () => {
      const autorisation = demander || essai > 0
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync();
      if (!actif) return;
      if (!autorisation.granted) return setEtat({ statut: "refusee" });

      minuteur = setTimeout(() => {
        if (actif) setEtat((courant) => (courant.statut === "attente" ? { statut: "indisponible" } : courant));
      }, DELAI_MS);

      const recente = await Location.getLastKnownPositionAsync({ maxAge: 2 * 60_000, requiredAccuracy: 300 });
      if (actif && recente) setEtat((courant) => versEtat(recente, courant));

      if (!suivre) {
        if (recente) return;
        const unique = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (actif) setEtat((courant) => versEtat(unique, courant));
        return;
      }

      const suivi = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3_000, distanceInterval: 5 },
        (lieu) => {
          if (actif) setEtat((courant) => versEtat(lieu, courant));
        },
      );
      if (actif) abonnement = suivi;
      else suivi.remove();
    };

    demarrer().catch(() => {
      if (actif) setEtat({ statut: "indisponible" });
    });

    return () => {
      actif = false;
      abonnement?.remove();
      if (minuteur) clearTimeout(minuteur);
    };
  }, [demander, essai, suivre]);

  /** Recommence la localisation et recadre la carte sur la nouvelle position. */
  const relocaliser = useCallback(() => {
    setEtat({ statut: "attente" });
    setEssai((valeur) => valeur + 1);
  }, []);

  return { etat, relocaliser };
}
