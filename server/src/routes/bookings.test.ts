import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import { authenticationAs } from "../test-utils/authentication.js";

function createPrismaMock() {
  return {
    trip: { findUnique: vi.fn() },
    booking: {
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("routes de réservation", () => {
  it("permet à un client de proposer une réservation avec un prix entier en FCFA", async () => {
    const prisma = createPrismaMock();
    prisma.trip.findUnique.mockResolvedValue({
      id: "trip-1",
      status: "OPEN",
      tripStops: [
        { stopId: "stop-1", sequence: 0 },
        { stopId: "stop-2", sequence: 1 },
      ],
    });
    prisma.booking.create.mockResolvedValue({
      id: "booking-1",
      status: "PROPOSED_BY_CLIENT",
    });
    const app = buildApp({
      prisma: prisma as unknown as PrismaClient,
      authentication: authenticationAs("client-1", "CLIENT"),
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/bookings",
      headers: { authorization: "Bearer test-token" },
      payload: {
        tripId: "trip-1",
        pickupStopId: "stop-1",
        dropoffStopId: "stop-2",
        proposedPrice: 750,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(prisma.booking.create).toHaveBeenCalledWith({
      data: {
        clientId: "client-1",
        tripId: "trip-1",
        pickupStopId: "stop-1",
        dropoffStopId: "stop-2",
        initiatedBy: "CLIENT",
        status: "PROPOSED_BY_CLIENT",
        proposedPrice: 750,
        expiresAt: expect.any(Date),
      },
    });
  });

  it("permet au chauffeur d'accepter la proposition du client", async () => {
    const prisma = createPrismaMock();
    prisma.booking.findUnique.mockResolvedValue({
      id: "booking-1",
      clientId: "client-1",
      status: "PROPOSED_BY_CLIENT",
      trip: { driverId: "driver-1" },
    });
    const confirm = vi
      .fn()
      .mockResolvedValue({ id: "booking-1", status: "CONFIRMED" });
    const app = buildApp({
      prisma: prisma as unknown as PrismaClient,
      confirmBooking: confirm,
      authentication: authenticationAs("driver-1", "DRIVER"),
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/bookings/booking-1/accept",
      headers: { authorization: "Bearer test-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("CONFIRMED");
    expect(confirm).toHaveBeenCalledWith(prisma, { bookingId: "booking-1" });
  });

  it("permet au client d'accepter la contre-proposition du chauffeur", async () => {
    const prisma = createPrismaMock();
    prisma.booking.findUnique.mockResolvedValue({
      id: "booking-1",
      clientId: "client-1",
      status: "PROPOSED_BY_DRIVER",
      trip: { driverId: "driver-1" },
    });
    const confirm = vi.fn().mockResolvedValue({
      id: "booking-1",
      status: "CONFIRMED",
      agreedPrice: 900,
    });
    const app = buildApp({
      prisma: prisma as unknown as PrismaClient,
      confirmBooking: confirm,
      authentication: authenticationAs("client-1", "CLIENT"),
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/bookings/booking-1/accept",
      headers: { authorization: "Bearer test-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "CONFIRMED",
      agreedPrice: 900,
    });
    expect(confirm).toHaveBeenCalledWith(prisma, { bookingId: "booking-1" });
  });

  it("permet au chauffeur de refuser la proposition", async () => {
    const prisma = createPrismaMock();
    prisma.booking.findUnique
      .mockResolvedValueOnce({
        id: "booking-1",
        clientId: "client-1",
        status: "PROPOSED_BY_CLIENT",
        trip: { driverId: "driver-1" },
      })
      .mockResolvedValueOnce({ id: "booking-1", status: "REFUSED" });
    prisma.booking.updateMany.mockResolvedValue({ count: 1 });
    const app = buildApp({
      prisma: prisma as unknown as PrismaClient,
      authentication: authenticationAs("driver-1", "DRIVER"),
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/bookings/booking-1/refuse",
      headers: { authorization: "Bearer test-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("REFUSED");
  });

  it("n'autorise qu'une seule contre-proposition du chauffeur", async () => {
    const prisma = createPrismaMock();
    let booking = {
      id: "booking-1",
      status: "PROPOSED_BY_CLIENT",
      counterPrice: null as number | null,
      trip: { driverId: "driver-1" },
    };
    prisma.booking.findUnique.mockImplementation(() =>
      Promise.resolve({ ...booking }),
    );
    prisma.booking.updateMany.mockImplementation(({ data }) => {
      booking = { ...booking, ...data };
      return Promise.resolve({ count: 1 });
    });
    const app = buildApp({
      prisma: prisma as unknown as PrismaClient,
      authentication: authenticationAs("driver-1", "DRIVER"),
    });
    apps.push(app);

    const first = await app.inject({
      method: "POST",
      url: "/bookings/booking-1/counter-offer",
      headers: { authorization: "Bearer test-token" },
      payload: { counterPrice: 900 },
    });
    const second = await app.inject({
      method: "POST",
      url: "/bookings/booking-1/counter-offer",
      headers: { authorization: "Bearer test-token" },
      payload: { counterPrice: 1_000 },
    });

    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({
      status: "PROPOSED_BY_DRIVER",
      counterPrice: 900,
    });
    expect(second.statusCode).toBe(409);
    expect(second.json()).toEqual({ error: "COUNTER_OFFER_NOT_ALLOWED" });
    expect(prisma.booking.updateMany).toHaveBeenCalledTimes(1);
  });
});
