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

/** Centre du Cameroun, quand rien n'est encore connu : la carte montre tout le pays. */
export const CAMEROUN: Coordonnees = { latitude: 5.7, longitude: 12.4 };

/** Un cercle de `rayon` mètres autour d'un point, en [longitude, latitude], fermé (pour un polygone GeoJSON). */
export function cercle(centre: Coordonnees, rayon: number, segments = 40): [number, number][] {
  const dLat = rayon / 111_320;
  const dLon = rayon / (111_320 * Math.cos((centre.latitude * Math.PI) / 180));
  const points: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    points.push([centre.longitude + dLon * Math.cos(angle), centre.latitude + dLat * Math.sin(angle)]);
  }
  return points;
}
