import { describe, expect, it } from "vitest";
import { canBook, isValidSegment } from "./capacity";

describe("canBook", () => {
  it("réutilise une place sur des tronçons disjoints", () => {
    expect(canBook(1, [{ pickup: 0, dropoff: 2 }], { pickup: 2, dropoff: 4 })).toBe(true);
  });

  it("refuse un tronçon qui chevauche une capacité atteinte", () => {
    expect(canBook(1, [{ pickup: 0, dropoff: 2 }], { pickup: 1, dropoff: 3 })).toBe(false);
  });

  it("contrôle chaque tronçon et non le trajet entier", () => {
    const confirmed = [
      { pickup: 0, dropoff: 1 },
      { pickup: 2, dropoff: 3 },
    ];

    expect(canBook(1, confirmed, { pickup: 1, dropoff: 2 })).toBe(true);
    expect(canBook(1, confirmed, { pickup: 0, dropoff: 3 })).toBe(false);
  });

  it("refuse les segments et capacités invalides", () => {
    expect(isValidSegment({ pickup: 2, dropoff: 2 })).toBe(false);
    expect(canBook(0, [], { pickup: 0, dropoff: 1 })).toBe(false);
  });
});
