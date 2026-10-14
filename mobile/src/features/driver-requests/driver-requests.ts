import { z } from "zod";
import type { Booking, Trip } from "@/api";

const prixSchema = z
  .string()
  .trim()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().positive());

export type DriverRequest = {
  booking: Booking;
  trip: Trip;
  pickupName: string;
  dropoffName: string;
};

export function parseCounterPrice(value: string): number | null {
  const parsed = prixSchema.safeParse(value.replace(/\s/g, ""));
  return parsed.success ? parsed.data : null;
}

export function selectDriverRequests(bookings: Booking[], trips: Trip[]): DriverRequest[] {
  const tripsById = new Map(trips.map((trip) => [trip.id, trip]));

  return bookings.flatMap((booking) => {
    if (booking.status !== "PROPOSED_BY_CLIENT") return [];
    const trip = tripsById.get(booking.tripId);
    if (!trip || trip.status !== "OPEN") return [];

    const pickupIndex = trip.tripStops.findIndex((tripStop) => tripStop.stopId === booking.pickupStopId);
    const dropoffIndex = trip.tripStops.findIndex((tripStop) => tripStop.stopId === booking.dropoffStopId);
    if (pickupIndex < 0 || dropoffIndex <= pickupIndex) return [];

    return [{
      booking,
      trip,
      pickupName: trip.tripStops[pickupIndex]!.stop.name,
      dropoffName: trip.tripStops[dropoffIndex]!.stop.name,
    }];
  }).sort((a, b) => b.booking.proposedPrice - a.booking.proposedPrice);
}
