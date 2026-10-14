import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { PrismaMatchingService } from "./matching.js";

function tripStops() {
  return [
    { stopId: "stop-1", sequence: 0, stop: { id: "stop-1", name: "Départ" } },
    { stopId: "stop-2", sequence: 1, stop: { id: "stop-2", name: "Milieu" } },
    { stopId: "stop-3", sequence: 2, stop: { id: "stop-3", name: "Arrivée" } },
  ];
}

describe("PrismaMatchingService", () => {
  it("propose au client uniquement les trajets ayant de la place sur son tronçon", async () => {
    const request = {
      id: "request-1",
      clientId: "client-1",
      corridorId: "corridor-1",
      fromStopId: "stop-2",
      toStopId: "stop-3",
      windowStart: new Date("2027-01-15T07:00:00Z"),
      windowEnd: new Date("2027-01-15T09:00:00Z"),
      status: "OPEN",
    };
    const commonTrip = {
      corridorId: "corridor-1",
      capacity: 1,
      departureAt: new Date("2027-01-15T08:00:00Z"),
      status: "OPEN",
      driver: {
        id: "driver-1",
        name: "Chauffeur",
        vehicle: { plate: "LT 001 AA", model: "Toyota", seats: 4 },
        ratingsReceived: [{ score: 4 }, { score: 5 }],
      },
      tripStops: tripStops(),
    };
    const prisma = {
      tripRequest: { findUnique: vi.fn().mockResolvedValue(request) },
      trip: {
        findMany: vi.fn().mockResolvedValue([
          {
            ...commonTrip,
            id: "trip-available",
            bookings: [{ pickupStopId: "stop-1", dropoffStopId: "stop-2" }],
          },
          {
            ...commonTrip,
            id: "trip-full-on-segment",
            bookings: [{ pickupStopId: "stop-2", dropoffStopId: "stop-3" }],
          },
        ]),
      },
    } as unknown as PrismaClient;

    const matches = await new PrismaMatchingService(prisma).findTripsForRequest(
      "request-1",
      "client-1",
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ id: "trip-available" });
    expect(matches[0]).not.toHaveProperty("bookings");
  });

  it("signale au chauffeur seulement les demandes compatibles avec les tronçons libres", async () => {
    const prisma = {
      trip: {
        findUnique: vi.fn().mockResolvedValue({
          id: "trip-1",
          driverId: "driver-1",
          corridorId: "corridor-1",
          capacity: 1,
          departureAt: new Date("2027-01-15T08:00:00Z"),
          status: "OPEN",
          tripStops: tripStops().map(({ stopId, sequence }) => ({
            stopId,
            sequence,
          })),
          bookings: [{ pickupStopId: "stop-1", dropoffStopId: "stop-2" }],
        }),
      },
      tripRequest: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "request-next-leg",
            fromStopId: "stop-2",
            toStopId: "stop-3",
            proposedPrice: 700,
          },
          {
            id: "request-overlap",
            fromStopId: "stop-1",
            toStopId: "stop-3",
            proposedPrice: 1_000,
          },
          {
            id: "request-wrong-direction",
            fromStopId: "stop-3",
            toStopId: "stop-2",
            proposedPrice: 800,
          },
        ]),
      },
    } as unknown as PrismaClient;

    const matches = await new PrismaMatchingService(prisma).findRequestsForTrip(
      "trip-1",
      "driver-1",
    );

    expect(matches).toEqual([
      expect.objectContaining({ id: "request-next-leg", proposedPrice: 700 }),
    ]);
  });
});
