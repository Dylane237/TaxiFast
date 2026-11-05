import { useMemo } from "react";
import type { Corridor } from "@/api";
import { arretLePlusProche, type ArretProche } from "./distance";
import { usePosition } from "./usePosition";

/**
 * La vraie position de l'appareil, et l'arrêt d'axe le plus proche.
 * Un taxi ne s'arrête qu'aux arrêts de son axe : on montre donc où vous êtes,
 * puis l'arrêt où monter et la distance à pied jusqu'à lui.
 */
export function useDepartProche(corridors: Corridor[], { demander = false }: { demander?: boolean } = {}) {
  const { etat, relocaliser } = usePosition({ demander });
  const position = etat.statut === "trouvee" ? etat.position : null;
  const plusProche: ArretProche | null = useMemo(
    () => (position ? arretLePlusProche(corridors, position) : null),
    [corridors, position],
  );
  // Au-delà de quelques kilomètres, proposer « votre » arrêt n'aurait pas de sens : on laisse choisir.
  const tropLoin = plusProche !== null && plusProche.distance > DISTANCE_MAX_M;
  return { etat, position, proche: tropLoin ? null : plusProche, tropLoin, relocaliser };
}

const DISTANCE_MAX_M = 3_000;
