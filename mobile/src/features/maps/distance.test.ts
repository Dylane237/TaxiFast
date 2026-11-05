import { describe, expect, it } from "vitest";
import type { Corridor, Stop } from "@/api";
import { arretLePlusProche, distanceMetres, formatDistance } from "./distance";

function arret(id: string, latitude: number | null, longitude: number | null): Stop {
  return { id, name: id, corridorId: "axe", position: 0, latitude, longitude, meetingInstructions: null } as Stop;
}

const axe = {
  id: "axe",
  name: "Axe",
  stops: [arret("akwa", 4.0483, 9.7043), arret("deido", 4.0617, 9.7125), arret("sans-gps", null, null)],
} as unknown as Corridor;

describe("distances", () => {
  it("mesure environ 1,7 km entre Akwa et Deïdo", () => {
    const d = distanceMetres({ latitude: 4.0483, longitude: 9.7043 }, { latitude: 4.0617, longitude: 9.7125 });
    expect(d).toBeGreaterThan(1600);
    expect(d).toBeLessThan(1900);
  });

  it("arrondit comme on le dirait", () => {
    expect(formatDistance(3)).toBe("10 m");
    expect(formatDistance(347)).toBe("350 m");
    expect(formatDistance(1234)).toBe("1,2 km");
    expect(formatDistance(12_345)).toBe("12 km");
  });

  it("trouve l'arrêt le plus proche et ignore ceux sans position", () => {
    const proche = arretLePlusProche([axe], { latitude: 4.0490, longitude: 9.7050 });
    expect(proche?.arret.id).toBe("akwa");
    expect(proche!.distance).toBeLessThan(150);
  });

  it("ne renvoie rien quand aucun arrêt n'a de position", () => {
    const vide = { ...axe, stops: [arret("x", null, null)] } as unknown as Corridor;
    expect(arretLePlusProche([vide], { latitude: 4, longitude: 9 })).toBeNull();
  });
});
