import { z } from "zod";

/** Prix maximal accepté, en FCFA : très au-dessus d'une place de taxi, mais loin de déborder un entier SQL. */
export const PRIX_MAX_FCFA = 100_000;

/** Places maximales d'un trajet, comme pour le véhicule du chauffeur. */
export const PLACES_MAX = 8;

/** Tolérance pour un départ « maintenant » enregistré quelques minutes après coup. */
export const DEPART_PASSE_TOLERE_MS = 15 * 60_000;

export const prixSchema = z.number().int().positive().max(PRIX_MAX_FCFA);
export const placesSchema = z.number().int().positive().max(PLACES_MAX);

/** Durée laissée pour répondre à une proposition ou à une contre-proposition. */
export const DELAI_REPONSE_MS = 30 * 60_000;
