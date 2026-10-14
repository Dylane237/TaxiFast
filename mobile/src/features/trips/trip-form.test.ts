import { describe, expect, it } from "vitest";
import type { Stop } from "@/api";
import { creerCreneaux, erreurPublication, ordonnerArrets } from "./trip-form";

const stops: Stop[] = [
  { id: "a", corridorId: "itineraire", name: "A", position: 0, latitude: null, longitude: null, meetingInstructions: null },
  { id: "b", corridorId: "itineraire", name: "B", position: 1, latitude: null, longitude: null, meetingInstructions: null },
  { id: "c", corridorId: "itineraire", name: "C", position: 2, latitude: null, longitude: null, meetingInstructions: null },
];

describe("formulaire de trajet chauffeur", () => {
  it("ordonne les arrêts sélectionnés dans les deux sens", () => {
    expect(ordonnerArrets(stops, ["c", "a"], "ALLER")).toEqual(["a", "c"]);
    expect(ordonnerArrets(stops, ["a", "c"], "RETOUR")).toEqual(["c", "a"]);
  });

  it("limite la capacité au véhicule et exige deux arrêts", () => {
    expect(erreurPublication(["a"], 1, 4)).toBe("Sélectionnez au moins deux arrêts.");
    expect(erreurPublication(["a", "b"], 5, 4)).toContain("1 et 4");
    expect(erreurPublication(["a", "b"], 4, 4)).toBeNull();
  });

  it("crée des départs futurs à partir de l’heure courante", () => {
    const now = new Date("2026-10-12T08:00:00.000Z");
    const slots = creerCreneaux(now);
    expect(slots).toHaveLength(4);
    expect(slots[0]?.departureAt).toBe("2026-10-12T08:15:00.000Z");
    expect(slots[3]?.departureAt).toBe("2026-10-12T09:00:00.000Z");
  });
});
