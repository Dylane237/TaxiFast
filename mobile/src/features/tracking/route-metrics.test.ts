import { describe, expect, it } from "vitest";
import {
  distanceBetweenKm,
  estimatedDurationMinutes,
  routeCamera,
  routeDistanceKm,
} from "./route-metrics";

describe("mesures locales d'un itinéraire", () => {
  const bonaberi = { latitude: 4.079, longitude: 9.6666 };
  const deido = { latitude: 4.0642, longitude: 9.70687 };
  const akwa = { latitude: 4.05106, longitude: 9.69675 };

  it("calcule une distance géodésique cohérente", () => {
    expect(distanceBetweenKm(bonaberi, deido)).toBeGreaterThan(4);
    expect(distanceBetweenKm(bonaberi, deido)).toBeLessThan(6);
    expect(routeDistanceKm([bonaberi, deido, akwa])).toBeGreaterThan(5);
  });

  it("produit une durée indicative et une caméra centrée", () => {
    expect(estimatedDurationMinutes(11)).toBe(30);
    expect(estimatedDurationMinutes(0)).toBe(0);
    expect(routeCamera([bonaberi, akwa])).toMatchObject({ zoom: 12 });
  });
});
