import { describe, expect, it } from "vitest";
import type { Corridor } from "@/api";
import { buildAvailability, buildFareDrafts, findRouteSelection, searchStops } from "./route-composer";

const corridor: Corridor = {
  id: "c1",
  name: "Axe test",
  stops: ["A", "B", "C", "D"].map((name, position) => ({
    id: name.toLowerCase(), corridorId: "c1", name, position,
    latitude: position, longitude: position, meetingInstructions: null,
  })),
};

describe("compositeur d’itinéraire", () => {
  it("ordonne les points intermédiaires dans les deux sens", () => {
    expect(findRouteSelection([corridor], "a", "d")?.stops.map((stop) => stop.id)).toEqual(["a", "b", "c", "d"]);
    expect(findRouteSelection([corridor], "d", "b")?.stops.map((stop) => stop.id)).toEqual(["d", "c", "b"]);
  });

  it("génère un tarif pour chaque paire origine-destination", () => {
    const fares = buildFareDrafts(corridor.stops, 400);
    expect(fares).toHaveLength(6);
    expect(fares.find((fare) => fare.fromStopId === "a" && fare.toStopId === "d")?.price).toBe(1200);
  });

  it("recherche dans les noms et construit un créneau", () => {
    expect(searchStops([corridor], "c").map((stop) => stop.id)).toEqual(["c"]);
    const availability = buildAvailability("SCHEDULED", 30, 60, new Date("2026-10-14T10:00:00Z"));
    expect(availability).toEqual({
      departureAt: "2026-10-14T10:30:00.000Z",
      availableUntil: "2026-10-14T11:30:00.000Z",
    });
  });
});
