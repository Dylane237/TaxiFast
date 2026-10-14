import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { corridorSeeds, seedCorridors } from "./corridors.js";

describe("seedCorridors", () => {
  it("définit deux itinéraires réels de Douala avec des arrêts géolocalisés", () => {
    expect(corridorSeeds).toHaveLength(2);
    expect(corridorSeeds.map((corridor) => corridor.name)).toEqual([
      "Bonabéri – Bonanjo",
      "Ndokoti – PK 14",
    ]);
    expect(corridorSeeds.every((corridor) => corridor.stops.length >= 2)).toBe(true);
    expect(
      corridorSeeds.every((corridor) =>
        corridor.stops.every(
          (stop) =>
            stop.latitude >= -90 &&
            stop.latitude <= 90 &&
            stop.longitude >= -180 &&
            stop.longitude <= 180 &&
            stop.meetingInstructions.length > 0,
        ),
      ),
    ).toBe(true);
  });

  it("crée les axes et leurs arrêts par upsert dans une transaction", async () => {
    const corridorUpsert = vi
      .fn()
      .mockResolvedValueOnce({ id: "corridor-1" })
      .mockResolvedValueOnce({ id: "corridor-2" });
    const stopUpsert = vi.fn().mockResolvedValue({});
    const transaction = vi.fn(async (callback) =>
      callback({
        corridor: { upsert: corridorUpsert },
        stop: { upsert: stopUpsert },
      }),
    );
    const prisma = { $transaction: transaction } as unknown as PrismaClient;

    await seedCorridors(prisma);

    expect(transaction).toHaveBeenCalledTimes(2);
    expect(corridorUpsert).toHaveBeenCalledTimes(2);
    expect(stopUpsert).toHaveBeenCalledTimes(11);
    expect(stopUpsert).toHaveBeenNthCalledWith(1, {
      where: {
        corridorId_position: {
          corridorId: "corridor-1",
          position: 0,
        },
      },
      update: {
        name: "Bonabéri Centre",
        latitude: 4.079,
        longitude: 9.6666,
        meetingInstructions: "Devant la mairie de Douala IV, côté stationnement.",
      },
      create: {
        corridorId: "corridor-1",
        name: "Bonabéri Centre",
        position: 0,
        latitude: 4.079,
        longitude: 9.6666,
        meetingInstructions: "Devant la mairie de Douala IV, côté stationnement.",
      },
    });
  });
});
