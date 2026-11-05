import type { Corridor, Stop } from "@/api";

export type Coordonnees = { latitude: number; longitude: number };

const RAYON_TERRE_M = 6_371_000;

/** Distance à vol d'oiseau en mètres (formule de haversine). */
export function distanceMetres(a: Coordonnees, b: Coordonnees): number {
  const rad = (degres: number) => (degres * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAYON_TERRE_M * Math.asin(Math.sqrt(h));
}

/** « 80 m », « 350 m », « 1,2 km » : arrondi comme on le dirait à quelqu'un. */
export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.max(10, Math.round(metres / 10) * 10)} m`;
  if (metres >= 10_000) return `${Math.round(metres / 1000)} km`;
  return `${(metres / 1000).toFixed(1).replace(".", ",")} km`;
}

export type ArretProche = { arret: Stop; distance: number };

/** L'arrêt géolocalisé le plus proche d'une position, avec sa distance en mètres. */
export function arretLePlusProche(corridors: Corridor[], position: Coordonnees): ArretProche | null {
  let meilleur: ArretProche | null = null;
  for (const arret of corridors.flatMap((corridor) => corridor.stops)) {
    if (arret.latitude === null || arret.longitude === null) continue;
    const distance = distanceMetres(position, { latitude: arret.latitude, longitude: arret.longitude });
    if (!meilleur || distance < meilleur.distance) meilleur = { arret, distance };
  }
  return meilleur;
}

/** Centre de Douala, quand la position n'est pas encore connue. */
export const DOUALA: Coordonnees = { latitude: 4.0511, longitude: 9.7679 };
