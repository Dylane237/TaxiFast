import type { Corridor, Stop } from "@/api";

export type RouteSelection = {
  corridor: Corridor;
  stops: Stop[];
};

export type FareDraft = {
  fromStopId: string;
  toStopId: string;
  price: number;
};

export function findRouteSelection(
  corridors: Corridor[],
  fromStopId: string,
  toStopId: string,
): RouteSelection | null {
  for (const corridor of corridors) {
    const from = corridor.stops.find((stop) => stop.id === fromStopId);
    const to = corridor.stops.find((stop) => stop.id === toStopId);
    if (!from || !to || from.id === to.id) continue;
    const ascending = from.position < to.position;
    const stops = corridor.stops
      .filter((stop) => ascending
        ? stop.position >= from.position && stop.position <= to.position
        : stop.position <= from.position && stop.position >= to.position)
      .sort((a, b) => ascending ? a.position - b.position : b.position - a.position);
    return { corridor, stops };
  }
  return null;
}

export function searchStops(
  corridors: Corridor[],
  query: string,
  corridorId?: string,
): Stop[] {
  const normalized = query.trim().toLocaleLowerCase("fr");
  return corridors
    .filter((corridor) => !corridorId || corridor.id === corridorId)
    .flatMap((corridor) => corridor.stops)
    .filter((stop) => !normalized
      || stop.name.toLocaleLowerCase("fr").includes(normalized)
      || stop.meetingInstructions?.toLocaleLowerCase("fr").includes(normalized))
    .slice(0, 5);
}

export function nearestStop(corridors: Corridor[], latitude: number, longitude: number): Stop | null {
  const located = corridors.flatMap((corridor) => corridor.stops)
    .filter((stop) => stop.latitude !== null && stop.longitude !== null);
  return located.reduce<Stop | null>((best, stop) => {
    if (!best) return stop;
    const distance = (candidate: Stop) =>
      (candidate.latitude! - latitude) ** 2 + (candidate.longitude! - longitude) ** 2;
    return distance(stop) < distance(best) ? stop : best;
  }, null);
}

export function buildFareDrafts(stops: Stop[], pricePerLeg = 500): FareDraft[] {
  return stops.flatMap((from, fromIndex) =>
    stops.slice(fromIndex + 1).map((to, offset) => ({
      fromStopId: from.id,
      toStopId: to.id,
      price: (offset + 1) * pricePerLeg,
    })),
  );
}

export function buildAvailability(
  mode: "IMMEDIATE" | "SCHEDULED",
  startMinutes: number,
  durationMinutes: number,
  now = new Date(),
) {
  const departureAt = new Date(now.getTime() + (mode === "IMMEDIATE" ? 2 : startMinutes) * 60_000);
  const availableUntil = new Date(departureAt.getTime() + durationMinutes * 60_000);
  return { departureAt: departureAt.toISOString(), availableUntil: availableUntil.toISOString() };
}
