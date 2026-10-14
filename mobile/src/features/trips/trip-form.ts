import type { Stop } from "@/api";

export type SensTrajet = "ALLER" | "RETOUR";

export type CreneauDepart = {
  minutes: number;
  label: string;
  departureAt: string;
};

export function ordonnerArrets(
  stops: Stop[],
  selectedIds: string[],
  sens: SensTrajet,
): string[] {
  const selected = new Set(selectedIds);
  return stops
    .filter((stop) => selected.has(stop.id))
    .sort((a, b) => sens === "ALLER" ? a.position - b.position : b.position - a.position)
    .map((stop) => stop.id);
}

export function creerCreneaux(now: Date): CreneauDepart[] {
  return [15, 30, 45, 60].map((minutes) => {
    const departure = new Date(now.getTime() + minutes * 60_000);
    const heure = departure.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return {
      minutes,
      label: `${heure} · dans ${minutes === 60 ? "1 h" : `${minutes} min`}`,
      departureAt: departure.toISOString(),
    };
  });
}

export function erreurPublication(stopIds: string[], capacity: number, maxSeats: number): string | null {
  if (stopIds.length < 2) return "Sélectionnez au moins deux arrêts.";
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > maxSeats) {
    return `Choisissez entre 1 et ${maxSeats} place${maxSeats > 1 ? "s" : ""}.`;
  }
  return null;
}
