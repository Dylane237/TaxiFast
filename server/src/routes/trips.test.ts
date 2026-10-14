import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import { authenticationAs } from "../test-utils/authentication.js";

function createPrismaMock() {
  return {
    corridor: { findUnique: vi.fn() },
    stop: { findMany: vi.fn() },
    trip: { create: vi.fn() },
  };
}

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("POST /trips", () => {
  it("refuse une publication sans jeton d'accès", async () => {
    const prisma = createPrismaMock();
    const app = buildApp({ prisma: prisma as unknown as PrismaClient });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/trips",
      payload: {},
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "AUTHENTICATION_REQUIRED" });
    expect(prisma.trip.create).not.toHaveBeenCalled();
  });

  it("permet à un chauffeur de publier un trajet avec ses arrêts ordonnés", async () => {
    const prisma = createPrismaMock();
    prisma.corridor.findUnique.mockResolvedValue({ id: "corridor-1" });
    prisma.stop.findMany.mockResolvedValue([
      { id: "stop-akwa", position: 4 },
      { id: "stop-deido", position: 2 },
      { id: "stop-bonanjo", position: 5 },
    ]);
    const createdTrip = {
      id: "trip-1",
      driverId: "driver-1",
      corridorId: "corridor-1",
      capacity: 3,
      departureAt: new Date("2027-01-15T08:00:00+01:00"),
      status: "OPEN",
      tripStops: [],
    };
    prisma.trip.create.mockResolvedValue(createdTrip);
    const app = buildApp({
      prisma: prisma as unknown as PrismaClient,
      authentication: authenticationAs("driver-1", "DRIVER"),
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/trips",
      headers: { authorization: "Bearer test-token" },
      payload: {
        corridorId: "corridor-1",
        capacity: 3,
        departureAt: "2027-01-15T08:00:00+01:00",
        stopIds: ["stop-deido", "stop-akwa", "stop-bonanjo"],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().id).toBe("trip-1");
    expect(prisma.trip.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tripStops: {
            create: [
              { stopId: "stop-deido", sequence: 0 },
              { stopId: "stop-akwa", sequence: 1 },
              { stopId: "stop-bonanjo", sequence: 2 },
            ],
          },
        }),
      }),
    );
  });

  it("refuse les entrées invalides avant tout accès à la base", async () => {
    const prisma = createPrismaMock();
    const app = buildApp({
      prisma: prisma as unknown as PrismaClient,
      authentication: authenticationAs("driver-1", "DRIVER"),
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/trips",
      headers: { authorization: "Bearer test-token" },
      payload: {
        corridorId: "corridor-1",
        capacity: 2.5,
        departureAt: "demain",
        stopIds: ["stop-1", "stop-1"],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("INVALID_INPUT");
    expect(prisma.trip.create).not.toHaveBeenCalled();
  });

  it("refuse des arrêts qui ne suivent pas l'ordre de l'axe", async () => {
    const prisma = createPrismaMock();
    prisma.corridor.findUnique.mockResolvedValue({ id: "corridor-1" });
    prisma.stop.findMany.mockResolvedValue([
      { id: "stop-1", position: 1 },
      { id: "stop-2", position: 3 },
      { id: "stop-3", position: 2 },
    ]);
    const app = buildApp({
      prisma: prisma as unknown as PrismaClient,
      authentication: authenticationAs("driver-1", "DRIVER"),
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/trips",
      headers: { authorization: "Bearer test-token" },
      payload: {
        corridorId: "corridor-1",
        capacity: 3,
        departureAt: "2027-01-15T08:00:00+01:00",
        stopIds: ["stop-1", "stop-2", "stop-3"],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "STOPS_OUT_OF_ORDER" });
    expect(prisma.trip.create).not.toHaveBeenCalled();
  });
});
