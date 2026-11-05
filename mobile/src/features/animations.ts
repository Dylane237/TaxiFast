import * as Haptics from "expo-haptics";

/** Nombre d'éléments de liste animés à l'arrivée ; au-delà, on ne fait rien pour rester léger. */
export const ELEMENTS_ANIMES = 6;
export const ECART_CASCADE = 45;

/** Délai d'apparition d'un élément de liste, ou null s'il ne doit pas être animé. */
export function delaiApparitionListe(index: number): number | null {
  if (!Number.isInteger(index) || index < 0 || index >= ELEMENTS_ANIMES) return null;
  return index * ECART_CASCADE;
}

/** Petite vibration de réussite : trajet publié, offre acceptée, demande envoyée. */
export function vibrerSucces() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
