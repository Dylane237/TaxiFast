import { z } from "zod";

/**
 * Services géographiques gratuits, basés sur OpenStreetMap :
 * - Photon (komoot) pour chercher un lieu et retrouver la ville d'une position ;
 * - OSRM pour tracer l'itinéraire routier entre des arrêts.
 * Leurs serveurs publics conviennent aux tests. Pour le lancement, il faudra une clé
 * chez un fournisseur (ou un serveur à nous) : seules les adresses ci-dessous changeront.
 */
const PHOTON = "https://photon.komoot.io";
const OSRM = "https://router.project-osrm.org";
const DELAI_MS = 8_000;

/** Le Cameroun, en [ouest, sud, est, nord] : les recherches restent dans le pays. */
export const CAMEROUN_BBOX = [8.4, 1.6, 16.2, 13.1] as const;

export type Coordonnees = { latitude: number; longitude: number };

export type Lieu = Coordonnees & {
  id: string;
  nom: string;
  /** « Ndokoti, Douala III », « Mvan, Yaoundé »… */
  contexte: string;
};

export type Itineraire = {
  /** Points [longitude, latitude] le long des routes. */
  trace: [number, number][];
  distanceMetres: number;
  dureeSecondes: number;
};

const proprietesPhotonSchema = z.object({
  osm_type: z.string().optional(),
  osm_id: z.number().optional(),
  name: z.string().optional(),
  street: z.string().optional(),
  housenumber: z.string().optional(),
  district: z.string().optional(),
  locality: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  state: z.string().optional(),
  countrycode: z.string().optional(),
});

const photonSchema = z.object({
  features: z.array(
    z.object({
      geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
      properties: proprietesPhotonSchema,
    }),
  ),
});

const osrmSchema = z.object({
  code: z.string(),
  routes: z
    .array(
      z.object({
        distance: z.number(),
        duration: z.number(),
        geometry: z.object({ coordinates: z.array(z.tuple([z.number(), z.number()])) }),
      }),
    )
    .default([]),
});

/** Construit « a=1&b=2 » sans URLSearchParams, que React Native n'implémente qu'en partie. */
export function requete(params: Record<string, string | undefined>): string {
  return Object.entries(params)
    .filter((entree): entree is [string, string] => entree[1] !== undefined)
    .map(([cle, valeur]) => `${encodeURIComponent(cle)}=${encodeURIComponent(valeur)}`)
    .join("&");
}

async function lireJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const minuteur = new AbortController();
  const arret = setTimeout(() => minuteur.abort(), DELAI_MS);
  const relais = () => minuteur.abort();
  signal?.addEventListener("abort", relais);
  try {
    const reponse = await fetch(url, { signal: minuteur.signal, headers: { Accept: "application/json" } });
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    return await reponse.json();
  } finally {
    clearTimeout(arret);
    signal?.removeEventListener("abort", relais);
  }
}

function contexteLieu(p: z.infer<typeof proprietesPhotonSchema>): string {
  const morceaux = [p.street, p.district ?? p.locality, p.city ?? p.county].filter(
    (morceau, index, tous): morceau is string => Boolean(morceau) && morceau !== p.name && tous.indexOf(morceau) === index,
  );
  return morceaux.join(", ") || p.state || "Cameroun";
}

/** Convertit une réponse Photon en lieux du Cameroun, sans doublons. */
export function lieuxDepuisPhoton(brut: unknown): Lieu[] {
  const donnees = photonSchema.parse(brut);
  const vus = new Set<string>();
  const lieux: Lieu[] = [];
  for (const { geometry, properties } of donnees.features) {
    if (properties.countrycode && properties.countrycode !== "CM") continue;
    const nom = properties.name ?? properties.street;
    if (!nom) continue;
    const contexte = contexteLieu(properties);
    const cle = `${nom}|${contexte}`;
    if (vus.has(cle)) continue;
    vus.add(cle);
    const [longitude, latitude] = geometry.coordinates;
    lieux.push({ id: `${properties.osm_type ?? "x"}${properties.osm_id ?? lieux.length}`, nom, contexte, latitude, longitude });
  }
  return lieux;
}

/** Cherche un quartier, un carrefour, un marché… partout au Cameroun, en privilégiant les environs. */
export async function chercherLieux(texte: string, pres?: Coordonnees | null, signal?: AbortSignal): Promise<Lieu[]> {
  const q = texte.trim();
  if (q.length < 2) return [];
  const params = requete({
    q,
    limit: "8",
    lang: "fr",
    bbox: CAMEROUN_BBOX.join(","),
    lat: pres?.latitude.toFixed(5),
    lon: pres?.longitude.toFixed(5),
  });
  return lieuxDepuisPhoton(await lireJson(`${PHOTON}/api/?${params}`, signal)).slice(0, 6);
}

/** Le nom de la ville (ou de la commune) d'une position, par exemple « Douala III » ou « Yaoundé ». */
export async function villeDe(position: Coordonnees, signal?: AbortSignal): Promise<string | null> {
  const params = requete({ lat: position.latitude.toFixed(5), lon: position.longitude.toFixed(5), lang: "fr" });
  const donnees = photonSchema.parse(await lireJson(`${PHOTON}/reverse?${params}`, signal));
  const p = donnees.features[0]?.properties;
  return p?.city ?? p?.county ?? p?.state ?? null;
}

/** Convertit une réponse OSRM en itinéraire, ou null quand aucune route n'a été trouvée. */
export function itineraireDepuisOsrm(brut: unknown): Itineraire | null {
  const donnees = osrmSchema.parse(brut);
  const route = donnees.code === "Ok" ? donnees.routes[0] : undefined;
  if (!route || route.geometry.coordinates.length < 2) return null;
  return { trace: route.geometry.coordinates, distanceMetres: route.distance, dureeSecondes: route.duration };
}

/** L'itinéraire en voiture qui passe par les points, dans l'ordre. */
export async function itineraireRoutier(points: Coordonnees[], signal?: AbortSignal): Promise<Itineraire | null> {
  if (points.length < 2) return null;
  const etapes = points.map((point) => `${point.longitude.toFixed(6)},${point.latitude.toFixed(6)}`).join(";");
  return itineraireDepuisOsrm(await lireJson(`${OSRM}/route/v1/driving/${etapes}?overview=full&geometries=geojson`, signal));
}
