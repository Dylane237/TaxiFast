import { describe, expect, it } from "vitest";
import { canBook } from "./capacity.js";

// Arrêts : 0 Bonabéri, 1 Akwa, 2 Bonanjo, 3 Bonapriso
describe("canBook (capacité par tronçon)", () => {
  it("accepte deux clients qui ne se chevauchent pas, avec 1 seule place", () => {
    const existing = [{ pickup: 0, dropoff: 1 }]; // Bonabéri -> Akwa
    expect(canBook(1, existing, { pickup: 1, dropoff: 3 })).toBe(true); // Akwa -> Bonapriso
  });

  it("refuse un client dont le trajet chevauche un tronçon plein", () => {
    const existing = [
      { pickup: 0, dropoff: 1 },
      { pickup: 1, dropoff: 3 },
    ];
    expect(canBook(1, existing, { pickup: 0, dropoff: 3 })).toBe(false); // Bonabéri -> Bonapriso
  });

  it("accepte tant que la capacité n'est pas atteinte sur aucun tronçon", () => {
    const existing = [
      { pickup: 0, dropoff: 3 },
      { pickup: 1, dropoff: 2 },
    ];
    expect(canBook(3, existing, { pickup: 0, dropoff: 3 })).toBe(true);
  });

  it("refuse quand un seul tronçon du milieu est plein", () => {
    const existing = [
      { pickup: 1, dropoff: 2 },
      { pickup: 1, dropoff: 2 },
    ];
    expect(canBook(2, existing, { pickup: 0, dropoff: 3 })).toBe(false);
  });

  it("refuse un segment invalide", () => {
    expect(canBook(3, [], { pickup: 2, dropoff: 2 })).toBe(false);
    expect(canBook(3, [], { pickup: 3, dropoff: 1 })).toBe(false);
  });
});
