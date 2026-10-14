import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import { authenticationAs } from "../test-utils/authentication.js";

const apps: ReturnType<typeof buildApp>[] = [];
const authorization = { authorization: "Bearer test-token" };

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("contrat HTTP de l'application mobile", () => {
  it("retourne le profil enrichi et les axes ordonnés", async () => {
    const profile = {
      id: "client-1",
      phone: "+237690000001",
      name: "Nadia",
      role: "CLIENT",
      vehicle: null,
    };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(profile) },
      corridor: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ id: "axis-1", name: "Axe", stops: [] }]),
      },
    };
    const app = buildApp({
      prisma: prisma as unknown as PrismaClient,
      authentication: authenticationAs("client-1", "CLIENT"),
    });
    apps.push(app);

    const me = await app.inject({
      method: "GET",
      url: "/me",
      headers: authorization,
    });
    const corridors = await app.inject({
      method: "GET",
      url: "/corridors",
      headers: authorization,
    });

    expect(me.statusCode).toBe(200);
    expect(me.json()).toEqual(profile);
    expect(corridors.json()).toEqual({
      corridors: [{ id: "axis-1", name: "Axe", stops: [] }],
    });
    expect(prisma.corridor.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
      include: { stops: { orderBy: { position: "asc" } } },
    });
  });

  it("liste puis annule uniquement la demande du client connecté", async () => {
    const openRequest = {
      id: "request-1",
      clientId: "client-1",
      status: "OPEN",
    };
    const updateRequest = vi
      .fn()
      .mockResolvedValue({ ...openRequest, status: "CANCELLED" });
    const prisma = {
      booking: { findMany: vi.fn().mockResolvedValue([]) },
      tripRequest: {
        findMany: vi.fn().mockResolvedValue([openRequest]),
        findUnique: vi.fn().mockResolvedValue(openRequest),
        update: updateRequest,
      },
      $transaction: vi.fn(async (operation: (tx: unknown) => unknown) =>
        operation({
          booking: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
          tripRequest: {
            update: updateRequest,
          },
        }),
      ),
    };
    const app = buildApp({
      prisma: prisma as unknown as PrismaClient,
      authentication: authenticationAs("client-1", "CLIENT"),
    });
    apps.push(app);

    const list = await app.inject({
      method: "GET",
      url: "/trip-requests",
      headers: authorization,
    });
    const cancel = await app.inject({
      method: "POST",
      url: "/trip-requests/request-1/cancel",
      headers: authorization,
    });

    expect(list.json()).toEqual({ requests: [openRequest] });
    expect(cancel.json().status).toBe("CANCELLED");
    expect(prisma.tripRequest.update).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: { status: "CANCELLED" },
    });
  });

  it("clôt un trajet et termine ses réservations dans une transaction", async () => {
    const completedTrip = {
      id: "trip-1",
      driverId: "driver-1",
      status: "COMPLETED",
      tripStops: [],
    };
    const transaction = {
      booking: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      tripLocation: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      trip: { update: vi.fn().mockResolvedValue(completedTrip) },
    };
    const prisma = {
      trip: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            id: "trip-1",
            driverId: "driver-1",
            status: "OPEN",
          }),
      },
      $transaction: vi.fn(
        async (operation: (tx: typeof transaction) => unknown) =>
          operation(transaction),
      ),
    };
    const app = buildApp({
      prisma: prisma as unknown as PrismaClient,
      authentication: authenticationAs("driver-1", "DRIVER"),
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/trips/trip-1/close",
      headers: authorization,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("COMPLETED");
    expect(transaction.booking.updateMany).toHaveBeenCalledTimes(2);
    expect(transaction.trip.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "COMPLETED" },
      }),
    );
  });

  it("retourne le détail agrégé d'une réservation avec la note moyenne", async () => {
    const prisma = {
      booking: {
        findUnique: vi.fn().mockResolvedValue({
          id: "booking-1",
          tripId: "trip-1",
          clientId: "client-1",
          requestId: null,
          pickupStopId: "stop-1",
          dropoffStopId: "stop-2",
          initiatedBy: "CLIENT",
          status: "COMPLETED",
          proposedPrice: 1_500,
          counterPrice: null,
          agreedPrice: 1_500,
          commission: 150,
          expiresAt: null,
          createdAt: new Date("2026-10-01T08:00:00Z"),
          updatedAt: new Date("2026-10-01T09:00:00Z"),
          client: { id: "client-1", name: "Nadia" },
          pickupStop: { id: "stop-1", name: "Départ" },
          dropoffStop: { id: "stop-2", name: "Arrivée" },
          ratings: [],
          trip: {
            id: "trip-1",
            driverId: "driver-1",
            corridorId: "axis-1",
            capacity: 4,
            departureAt: new Date("2026-10-01T08:00:00Z"),
            status: "COMPLETED",
            createdAt: new Date("2026-09-30T08:00:00Z"),
            tripStops: [],
            driver: {
              id: "driver-1",
              name: "Alain",
              vehicle: { plate: "LT 001 AA", model: "Toyota", seats: 4 },
              ratingsReceived: [{ score: 4 }, { score: 5 }],
            },
          },
        }),
      },
    };
    const app = buildApp({
      prisma: prisma as unknown as PrismaClient,
      authentication: authenticationAs("client-1", "CLIENT"),
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/bookings/booking-1",
      headers: authorization,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      booking: { id: "booking-1" },
      trip: { id: "trip-1" },
      driver: { id: "driver-1", rating: 4.5 },
      ratedByCurrentUser: false,
    });
  });

  it("crée une note autorisée et calcule le portefeuille chauffeur", async () => {
    const createdRating = {
      id: "rating-1",
      bookingId: "booking-1",
      authorId: "driver-1",
      targetId: "client-1",
      score: 5,
      comment: "Ponctuel",
      createdAt: new Date(),
    };
    const prisma = {
      booking: {
        findUnique: vi.fn().mockResolvedValue({
          clientId: "client-1",
          status: "COMPLETED",
          trip: { driverId: "driver-1" },
        }),
      },
      rating: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(createdRating),
      },
      walletTransaction: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "payout",
            userId: "driver-1",
            bookingId: "booking-1",
            type: "PAYOUT",
            amount: 1_350,
            createdAt: new Date(),
          },
          {
            id: "commission",
            userId: "driver-1",
            bookingId: "booking-1",
            type: "COMMISSION",
            amount: -150,
            createdAt: new Date(),
          },
        ]),
      },
    };
    const app = buildApp({
      prisma: prisma as unknown as PrismaClient,
      authentication: authenticationAs("driver-1", "DRIVER"),
    });
    apps.push(app);

    const rating = await app.inject({
      method: "POST",
      url: "/ratings",
      headers: authorization,
      payload: {
        bookingId: "booking-1",
        targetId: "client-1",
        score: 5,
        comment: "Ponctuel",
      },
    });
    const wallet = await app.inject({
      method: "GET",
      url: "/wallet",
      headers: authorization,
    });

    expect(rating.statusCode).toBe(201);
    expect(wallet.json()).toMatchObject({
      balance: 1_200,
      earnings: 1_350,
      commissions: 150,
    });
  });
});
