import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import { authenticationAs } from "../test-utils/authentication.js";

const apps: ReturnType<typeof buildApp>[] = [];
const authorization = { authorization: "Bearer test-token" };

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("modification et annulation de trajet", () => {
  it("refuse une capacité inférieure à l'occupation maximale d'un tronçon", async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      trip: {
        findUnique: vi.fn().mockResolvedValue({
          id: "trip-1",
          driverId: "driver-1",
          corridorId: "corridor-1",
          status: "OPEN",
          capacity: 3,
          departureAt: new Date("2027-01-15T08:00:00+01:00"),
          availableUntil: null,
          availabilityMode: "SCHEDULED",
          fares: [],
          tripStops: [
            { stopId: "a", sequence: 0 },
            { stopId: "b", sequence: 1 },
          ],
          bookings: [
            { pickupStopId: "a", dropoffStopId: "b", clientId: "client-1", status: "CONFIRMED" },
            { pickupStopId: "a", dropoffStopId: "b", clientId: "client-2", status: "CONFIRMED" },
          ],
        }),
        update: vi.fn(),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (operation: (tx: typeof transaction) => unknown) => operation(transaction)),
    };
    const app = buildApp({
      prisma: prisma as unknown as PrismaClient,
      authentication: authenticationAs("driver-1", "DRIVER"),
    });
    apps.push(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/trips/trip-1",
      headers: authorization,
      payload: { capacity: 1 },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: "CAPACITY_BELOW_OCCUPANCY" });
    expect(transaction.trip.update).not.toHaveBeenCalled();
  });

  it("refuse un nouvel ordre d'arrêts incompatible avec une réservation confirmée", async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      corridor: { findUnique: vi.fn().mockResolvedValue({ id: "corridor-1" }) },
      stop: { findMany: vi.fn().mockResolvedValue([{ id: "a", position: 0 }, { id: "b", position: 1 }]) },
      booking: { updateMany: vi.fn() },
      trip: {
        findUnique: vi.fn().mockResolvedValue({
          id: "trip-1",
          driverId: "driver-1",
          corridorId: "corridor-1",
          status: "OPEN",
          capacity: 3,
          departureAt: new Date("2027-01-15T08:00:00+01:00"),
          availableUntil: null,
          availabilityMode: "SCHEDULED",
          fares: [],
          tripStops: [{ stopId: "a", sequence: 0 }, { stopId: "b", sequence: 1 }],
          bookings: [{ pickupStopId: "a", dropoffStopId: "b", clientId: "client-1", status: "CONFIRMED" }],
        }),
        update: vi.fn(),
      },
    };
    const prisma = { $transaction: vi.fn(async (operation: (tx: typeof transaction) => unknown) => operation(transaction)) };
    const app = buildApp({
      prisma: prisma as unknown as PrismaClient,
      authentication: authenticationAs("driver-1", "DRIVER"),
    });
    apps.push(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/trips/trip-1",
      headers: authorization,
      payload: { stopIds: ["b", "a"] },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: "CONFIRMED_BOOKING_CONFLICT" });
    expect(transaction.trip.update).not.toHaveBeenCalled();
  });

  it("annule le trajet, les réservations actives et sa position", async () => {
    const cancelledTrip = { id: "trip-1", driverId: "driver-1", status: "CANCELLED", tripStops: [] };
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      trip: {
        findUnique: vi.fn().mockResolvedValue({
          id: "trip-1",
          driverId: "driver-1",
          status: "OPEN",
          bookings: [{ clientId: "client-1" }],
        }),
        update: vi.fn().mockResolvedValue(cancelledTrip),
      },
      booking: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      tripLocation: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      $transaction: vi.fn(async (operation: (tx: typeof transaction) => unknown) => operation(transaction)),
    };
    const app = buildApp({
      prisma: prisma as unknown as PrismaClient,
      authentication: authenticationAs("driver-1", "DRIVER"),
    });
    apps.push(app);

    const response = await app.inject({ method: "POST", url: "/trips/trip-1/cancel", headers: authorization });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("CANCELLED");
    expect(transaction.booking.updateMany).toHaveBeenCalledOnce();
    expect(transaction.tripLocation.deleteMany).toHaveBeenCalledWith({ where: { tripId: "trip-1" } });
  });
});
