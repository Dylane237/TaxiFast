import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import type { Coordonnees } from "./distance";

const DELAI_MS = 12_000;

export type EtatPosition =
  | { statut: "attente" }
  | { statut: "trouvee"; position: Coordonnees }
  | { statut: "refusee" }
  | { statut: "indisponible" };

async function lirePosition(): Promise<Coordonnees> {
  // Une position récente suffit pour proposer un arrêt : elle s'affiche tout de suite, sans attendre le GPS.
  const recente = await Location.getLastKnownPositionAsync({ maxAge: 2 * 60_000 });
  if (recente) return recente.coords;
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  try {
    // Le réseau (Wi-Fi, antennes) répond vite en ville mais peut manquer : sans Wi-Fi, sans services Google.
    // Le GPS marche partout mais met plus de temps. On interroge les deux et on garde le premier qui répond.
    const actuelle = await new Promise<Location.LocationObject>((resoudre, rejeter) => {
      let echecs = 0;
      const echouer = () => {
        echecs += 1;
        if (echecs === 2) rejeter(new Error("introuvable"));
      };
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(resoudre, echouer);
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).then(resoudre, echouer);
      minuteur = setTimeout(() => rejeter(new Error("délai")), DELAI_MS);
    });
    return actuelle.coords;
  } finally {
    if (minuteur) clearTimeout(minuteur);
  }
}

async function obtenirEtat(avecDemande: boolean): Promise<EtatPosition> {
  try {
    const permission = avecDemande
      ? await Location.requestForegroundPermissionsAsync()
      : await Location.getForegroundPermissionsAsync();
    if (!permission.granted) return { statut: "refusee" };
    return { statut: "trouvee", position: await lirePosition() };
  } catch {
    return { statut: "indisponible" };
  }
}

/**
 * Position réelle de l'appareil. `demander` affiche la demande d'autorisation ;
 * sans elle, on ne lit la position que si l'autorisation est déjà donnée.
 */
export function usePosition({ demander = false }: { demander?: boolean } = {}) {
  const [etat, setEtat] = useState<EtatPosition>({ statut: "attente" });

  useEffect(() => {
    let actif = true;
    void obtenirEtat(demander).then((suivant) => {
      if (actif) setEtat(suivant);
    });
    return () => {
      actif = false;
    };
  }, [demander]);

  const relocaliser = useCallback(async () => {
    setEtat({ statut: "attente" });
    setEtat(await obtenirEtat(true));
  }, []);

  return { etat, relocaliser };
}
