import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { ConfirmBookingError, confirmBooking } from "./booking-confirmation.js";

type FakeBooking = {
  id: string;
  tripId: string;
  pickupStopId: string;
  dropoffStopId: string;
  status: "PROPOSED_BY_CLIENT" | "CONFIRMED" | "REFUSED";
  proposedPrice: number;
  counterPrice: number | null;
  expiresAt: Date | null;
  agreedPrice?: number;
};

function createConcurrentPrismaMock() {
  const bookings = new Map<string, FakeBooking>([
    [
      "booking-1",
      {
        id: "booking-1",
        tripId: "trip-1",
        pickupStopId: "stop-1",
        dropoffStopId: "stop-2",
        status: "PROPOSED_BY_CLIENT",
        proposedPrice: 500,
        counterPrice: null,
        expiresAt: null,
      },
    ],
    [
      "booking-2",
      {
        id: "booking-2",
        tripId: "trip-1",
        pickupStopId: "stop-1",
        dropoffStopId: "stop-2",
        status: "PROPOSED_BY_CLIENT",
        proposedPrice: 600,
        counterPrice: null,
        expiresAt: null,
      },
    ],
  ]);
  const trip = {
    id: "trip-1",
    capacity: 1,
    status: "OPEN",
    tripStops: [
      { stopId: "stop-1", sequence: 0 },
      { stopId: "stop-2", sequence: 1 },
    ],
  };

  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: "trip-1" }]),
    booking: {
      findUnique: vi.fn(({ where }: { where: { id: string } }) => {
        const booking = bookings.get(where.id);
        return Promise.resolve(booking ? { ...booking } : null);
      }),
      findMany: vi.fn(() =>
        Promise.resolve(
          [...bookings.values()]
            .filter((booking) => booking.status === "CONFIRMED")
            .map(({ pickupStopId, dropoffStopId }) => ({ pickupStopId, dropoffStopId })),
        ),
      ),
      updateMany: vi.fn(
        ({ where, data }: { where: { id: string; status: string }; data: Partial<FakeBooking> }) => {
          const current = bookings.get(where.id);
          if (!current || current.status !== where.status) return Promise.resolve({ count: 0 });
          bookings.set(where.id, { ...current, ...data });
          return Promise.resolve({ count: 1 });
        },
      ),
      findUniqueOrThrow: vi.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve({ ...bookings.get(where.id)! }),
      ),
    },
    trip: {
      findUnique: vi.fn(() => Promise.resolve({ ...trip })),
      update: vi.fn(({ data }: { data: { status: string } }) => {
        trip.status = data.status;
        return Promise.resolve({ ...trip });
      }),
    },
  };

  let transactionQueue = Promise.resolve();
  const prisma = {
    $transaction: vi.fn(<T>(callback: (client: typeof tx) => Promise<T>) => {
      const result = transactionQueue.then(() => callback(tx));
      transactionQueue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    }),
  } as unknown as PrismaClient;

  return { prisma, bookings, trip, queryRaw: tx.$queryRaw, tx };
}

describe("confirmBooking", () => {
  it("ne confirme qu'une réservation lors de deux confirmations simultanées sur la dernière place", async () => {
    const { prisma, bookings, trip, queryRaw } = createConcurrentPrismaMock();

    const results = await Promise.allSettled([
      confirmBooking(prisma, { bookingId: "booking-1" }),
      confirmBooking(prisma, { bookingId: "booking-2" }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected).toMatchObject({
      reason: expect.objectContaining<Partial<ConfirmBookingError>>({
        code: "CAPACITY_EXCEEDED",
      }),
    });
    expect([...bookings.values()].filter((booking) => booking.status === "CONFIRMED")).toHaveLength(
      1,
    );
    expect(trip.status).toBe("FULL");
    expect(queryRaw).toHaveBeenCalledTimes(2);
    expect(String(queryRaw.mock.calls[0]?.[0])).toContain("FOR UPDATE");
  });

  it("ne confirme pas une réservation refusée entre la lecture et l'écriture", async () => {
    const { prisma, bookings, tx } = createConcurrentPrismaMock();
    // Le refus du client arrive pendant la confirmation, après la lecture du statut.
    tx.booking.findMany.mockImplementationOnce(() => {
      bookings.set("booking-1", { ...bookings.get("booking-1")!, status: "REFUSED" });
      return Promise.resolve([]);
    });

    await expect(confirmBooking(prisma, { bookingId: "booking-1" })).rejects.toMatchObject({
      code: "BOOKING_NOT_CONFIRMABLE",
    });
    expect(bookings.get("booking-1")!.status).toBe("REFUSED");
  });
});
