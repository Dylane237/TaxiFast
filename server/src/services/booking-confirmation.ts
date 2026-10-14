import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { canBook, isValidSegment, type Segment } from "../domain/capacity.js";

const confirmBookingSchema = z.object({
  bookingId: z.string().trim().min(1),
});

export type ConfirmBookingErrorCode =
  | "BOOKING_NOT_FOUND"
  | "BOOKING_NOT_CONFIRMABLE"
  | "BOOKING_EXPIRED"
  | "TRIP_NOT_BOOKABLE"
  | "INVALID_BOOKING_STOPS"
  | "CAPACITY_EXCEEDED";

export class ConfirmBookingError extends Error {
  constructor(public readonly code: ConfirmBookingErrorCode) {
    super(code);
    this.name = "ConfirmBookingError";
  }
}

function tripIsFull(capacity: number, stopCount: number, bookings: Segment[]): boolean {
  for (let leg = 0; leg < stopCount - 1; leg++) {
    if (canBook(capacity, bookings, { pickup: leg, dropoff: leg + 1 })) {
      return false;
    }
  }

  return true;
}

export async function confirmBooking(prisma: PrismaClient, input: unknown) {
  const { bookingId } = confirmBookingSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const bookingReference = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { tripId: true },
    });
    if (!bookingReference) {
      throw new ConfirmBookingError("BOOKING_NOT_FOUND");
    }

    await tx.$queryRaw`
      SELECT "id"
      FROM "Trip"
      WHERE "id" = ${bookingReference.tripId}
      FOR UPDATE
    `;

    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        tripId: true,
        pickupStopId: true,
        dropoffStopId: true,
        status: true,
        proposedPrice: true,
        counterPrice: true,
        expiresAt: true,
      },
    });
    if (!booking) {
      throw new ConfirmBookingError("BOOKING_NOT_FOUND");
    }
    if (booking.status === "CONFIRMED") {
      return booking;
    }
    if (booking.status !== "PROPOSED_BY_CLIENT" && booking.status !== "PROPOSED_BY_DRIVER") {
      throw new ConfirmBookingError("BOOKING_NOT_CONFIRMABLE");
    }
    if (booking.expiresAt && booking.expiresAt <= new Date()) {
      throw new ConfirmBookingError("BOOKING_EXPIRED");
    }

    const trip = await tx.trip.findUnique({
      where: { id: booking.tripId },
      select: {
        id: true,
        capacity: true,
        status: true,
        tripStops: {
          orderBy: { sequence: "asc" },
          select: { stopId: true, sequence: true },
        },
      },
    });
    if (!trip || (trip.status !== "OPEN" && trip.status !== "FULL")) {
      throw new ConfirmBookingError("TRIP_NOT_BOOKABLE");
    }

    const sequenceByStopId = new Map(
      trip.tripStops.map((tripStop) => [tripStop.stopId, tripStop.sequence]),
    );
    const candidate: Segment = {
      pickup: sequenceByStopId.get(booking.pickupStopId) ?? -1,
      dropoff: sequenceByStopId.get(booking.dropoffStopId) ?? -1,
    };
    if (!isValidSegment(candidate)) {
      throw new ConfirmBookingError("INVALID_BOOKING_STOPS");
    }

    const confirmedBookings = await tx.booking.findMany({
      where: { tripId: booking.tripId, status: "CONFIRMED" },
      select: { pickupStopId: true, dropoffStopId: true },
    });
    const existingSegments = confirmedBookings.map(({ pickupStopId, dropoffStopId }) => ({
      pickup: sequenceByStopId.get(pickupStopId) ?? -1,
      dropoff: sequenceByStopId.get(dropoffStopId) ?? -1,
    }));
    if (existingSegments.some((segment) => !isValidSegment(segment))) {
      throw new ConfirmBookingError("INVALID_BOOKING_STOPS");
    }

    if (!canBook(trip.capacity, existingSegments, candidate)) {
      throw new ConfirmBookingError("CAPACITY_EXCEEDED");
    }

    const confirmedBooking = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "CONFIRMED",
        agreedPrice: booking.counterPrice ?? booking.proposedPrice,
      },
    });
    const allSegments = [...existingSegments, candidate];
    const status = tripIsFull(trip.capacity, trip.tripStops.length, allSegments)
      ? "FULL"
      : "OPEN";

    await tx.trip.update({
      where: { id: trip.id },
      data: { status },
    });

    return confirmedBooking;
  });
}
