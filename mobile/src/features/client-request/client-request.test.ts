import { describe, expect, it } from "vitest";
import { parseClientRequestForm } from "./client-request";

describe("parseClientRequestForm", () => {
  it("construit une fenêtre de départ et conserve un prix FCFA entier", () => {
    const result = parseClientRequestForm(
      {
        corridorId: "axe",
        fromStopId: "a",
        toStopId: "b",
        price: "1500",
        startMinutes: 30,
        durationMinutes: 60,
      },
      new Date("2026-01-01T10:00:00.000Z"),
    );
    expect(result).toMatchObject({
      success: true,
      data: {
        price: 1500,
        windowStart: "2026-01-01T10:30:00.000Z",
        windowEnd: "2026-01-01T11:30:00.000Z",
      },
    });
  });

  it("refuse le même arrêt et un prix décimal", () => {
    expect(
      parseClientRequestForm({
        corridorId: "axe",
        fromStopId: "a",
        toStopId: "a",
        price: "1500",
        startMinutes: 0,
        durationMinutes: 30,
      }).success,
    ).toBe(false);
    expect(
      parseClientRequestForm({
        corridorId: "axe",
        fromStopId: "a",
        toStopId: "b",
        price: "1500.5",
        startMinutes: 0,
        durationMinutes: 30,
      }).success,
    ).toBe(false);
  });
});
