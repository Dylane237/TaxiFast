import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import { PRIX_MAX_FCFA } from "../domain/limites.js";
import { authenticationAs } from "../test-utils/authentication.js";

const apps: ReturnType<typeof buildApp>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

const authorization = { authorization: "Bearer test-token" };
const dansUneHeure = () => new Date(Date.now() + 60 * 60_000);
const ilYaUneHeure = () => new Date(Date.now() - 60 * 60_000);

function application(prisma: unknown, userId: string, role: "CLIENT" | "DRIVER") {
  const app = buildApp({ prisma: prisma as PrismaClient, authentication: authenticationAs(userId, role) });
  apps.push(app);
  return app;
}

describe("clôture d'un trajet", () => {
  it("refuse de clôturer avant l'heure de départ", async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      trip: {
        findUnique: vi.fn().mockResolvedValue({ id: "trip-1", driverId: "driver-1", status: "OPEN", departureAt: dansUneHeure() }),
        update: vi.fn(),
      },
      booking: { updateMany: vi.fn() },
      tripLocation: { deleteMany: vi.fn() },
    };
    const prisma = { $transaction: vi.fn(async (operation: (client: typeof tx) => unknown) => operation(tx)) };

    const response = await application(prisma, "driver-1", "DRIVER").inject({
      method: "POST",
      url: "/trips/trip-1/close",
      headers: authorization,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: "TRIP_NOT_STARTED" });
    expect(tx.booking.updateMany).not.toHaveBeenCalled();
    expect(String(tx.$queryRaw.mock.calls[0]?.[0])).toContain("FOR UPDATE");
  });
});

describe("propositions et contre-propositions", () => {
  const tripOuvert = {
    id: "trip-1",
    corridorId: "corridor-1",
    driverId: "driver-1",
    status: "OPEN",
    tripStops: [{ stopId: "stop-1", sequence: 0 }, { stopId: "stop-2", sequence: 1 }],
  };
  const proposition = { tripId: "trip-1", pickupStopId: "stop-1", dropoffStopId: "stop-2", proposedPrice: 750 };

  it("refuse une proposition après la fin de disponibilité du trajet", async () => {
    const prisma = {
      trip: { findUnique: vi.fn().mockResolvedValue({ ...tripOuvert, availableUntil: ilYaUneHeure() }) },
      booking: { count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    };

    const response = await application(prisma, "client-1", "CLIENT").inject({
      method: "POST",
      url: "/bookings",
      headers: authorization,
      payload: proposition,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: "TRIP_NOT_OPEN" });
    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  it(`refuse un prix au-dessus de ${PRIX_MAX_FCFA} FCFA`, async () => {
    const prisma = { trip: { findUnique: vi.fn() } };

    const response = await application(prisma, "client-1", "CLIENT").inject({
      method: "POST",
      url: "/bookings",
      headers: authorization,
      payload: { ...proposition, proposedPrice: PRIX_MAX_FCFA + 1 },
    });

    expect(response.statusCode).toBe(400);
    expect(prisma.trip.findUnique).not.toHaveBeenCalled();
  });

  it("refuse une contre-proposition sur une proposition expirée", async () => {
    const prisma = {
      booking: {
        findUnique: vi.fn().mockResolvedValue({
          id: "booking-1",
          clientId: "client-1",
          status: "PROPOSED_BY_CLIENT",
          counterPrice: null,
          expiresAt: ilYaUneHeure(),
          trip: { driverId: "driver-1" },
        }),
        updateMany: vi.fn(),
      },
    };

    const response = await application(prisma, "driver-1", "DRIVER").inject({
      method: "POST",
      url: "/bookings/booking-1/counter-offer",
      headers: authorization,
      payload: { counterPrice: 900 },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: "BOOKING_EXPIRED" });
    expect(prisma.booking.updateMany).not.toHaveBeenCalled();
  });

  it("redonne au client le délai complet pour répondre à une contre-proposition", async () => {
    const prisma = {
      booking: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            id: "booking-1",
            clientId: "client-1",
            status: "PROPOSED_BY_CLIENT",
            counterPrice: null,
            expiresAt: new Date(Date.now() + 60_000),
            trip: { driverId: "driver-1" },
          })
          .mockResolvedValueOnce({ id: "booking-1", status: "PROPOSED_BY_DRIVER" }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    await application(prisma, "driver-1", "DRIVER").inject({
      method: "POST",
      url: "/bookings/booking-1/counter-offer",
      headers: authorization,
      payload: { counterPrice: 900 },
    });

    const { data } = prisma.booking.updateMany.mock.calls[0]![0] as { data: { expiresAt: Date } };
    expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 60_000);
  });
});

describe("dates de publication et de demande", () => {
  it("refuse un trajet dont le départ est passé depuis plus d'un quart d'heure", async () => {
    const prisma = { corridor: { findUnique: vi.fn() } };

    const response = await application(prisma, "driver-1", "DRIVER").inject({
      method: "POST",
      url: "/trips",
      headers: authorization,
      payload: { corridorId: "corridor-1", capacity: 3, departureAt: ilYaUneHeure().toISOString(), stopIds: ["a", "b"] },
    });

    expect(response.statusCode).toBe(400);
    expect(prisma.corridor.findUnique).not.toHaveBeenCalled();
  });

  it("refuse un trajet de plus de 8 places", async () => {
    const response = await application({}, "driver-1", "DRIVER").inject({
      method: "POST",
      url: "/trips",
      headers: authorization,
      payload: { corridorId: "corridor-1", capacity: 40, departureAt: dansUneHeure().toISOString(), stopIds: ["a", "b"] },
    });

    expect(response.statusCode).toBe(400);
  });

  it("refuse une demande dont la fenêtre de départ est déjà passée", async () => {
    const prisma = { corridor: { findUnique: vi.fn() } };

    const response = await application(prisma, "client-1", "CLIENT").inject({
      method: "POST",
      url: "/trip-requests",
      headers: authorization,
      payload: {
        corridorId: "corridor-1",
        fromStopId: "stop-1",
        toStopId: "stop-2",
        windowStart: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
        windowEnd: ilYaUneHeure().toISOString(),
        proposedPrice: 500,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(prisma.corridor.findUnique).not.toHaveBeenCalled();
  });
});
