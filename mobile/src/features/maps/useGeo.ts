import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { chercherLieux, itineraireRoutier, villeDe } from "@/api/geo";
import type { Coordonnees } from "./distance";

const UNE_HEURE = 60 * 60_000;

function cle(point: Coordonnees, decimales: number) {
  return `${point.latitude.toFixed(decimales)},${point.longitude.toFixed(decimales)}`;
}

/** L'itinéraire routier qui relie les arrêts dans l'ordre. `null` tant qu'il n'est pas là (ou en cas d'échec). */
export function useItineraire(points: Coordonnees[]) {
  const requete = useQuery({
    queryKey: ["itineraire", points.map((point) => cle(point, 5))],
    queryFn: ({ signal }) => itineraireRoutier(points, signal),
    enabled: points.length >= 2,
    staleTime: UNE_HEURE,
    gcTime: UNE_HEURE,
    retry: 1,
  });
  return requete.data ?? null;
}

/** Recherche de lieux au Cameroun, lancée quand vous arrêtez de taper (pas à chaque lettre). */
export function useRechercheLieux(texte: string, pres: Coordonnees | null) {
  const [attendu, setAttendu] = useState(texte.trim());
  useEffect(() => {
    const minuteur = setTimeout(() => setAttendu(texte.trim()), 350);
    return () => clearTimeout(minuteur);
  }, [texte]);

  // On n'arrondit la position qu'au kilomètre : inutile de relancer la recherche à chaque pas.
  const autour = pres ? cle(pres, 2) : null;
  const requete = useQuery({
    queryKey: ["lieux", attendu.toLocaleLowerCase("fr"), autour],
    queryFn: ({ signal }) => chercherLieux(attendu, pres, signal),
    enabled: attendu.length >= 2,
    staleTime: UNE_HEURE,
    placeholderData: keepPreviousData,
    retry: 1,
  });
  return {
    lieux: texte.trim().length >= 2 ? requete.data ?? [] : [],
    chargement: texte.trim() !== attendu || requete.isFetching,
    erreur: requete.isError,
  };
}

/** La ville où vous êtes, pour l'afficher à la place d'une ville écrite en dur. */
export function useVille(position: Coordonnees | null) {
  const autour = position ? cle(position, 2) : null;
  const requete = useQuery({
    queryKey: ["ville", autour],
    queryFn: ({ signal }) => villeDe(position!, signal),
    enabled: autour !== null,
    staleTime: UNE_HEURE,
    retry: 1,
  });
  return requete.data ?? null;
}
