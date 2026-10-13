import { z } from "zod";
import type { TripManifest, TripStop } from "@/api";

const tripIdSchema = z.string().trim().min(1);

export type StopTimelineItem = {
  tripStop: TripStop;
  boarding: string[];
  leaving: string[];
  occupiedAfter: number | null;
  availableAfter: number | null;
};

export function parseTripId(value: string | string[] | undefined): string | null {
  const parsed = tripIdSchema.safeParse(Array.isArray(value) ? value[0] : value);
  return parsed.success ? parsed.data : null;
}

export function buildTripTimeline(manifest: TripManifest): StopTimelineItem[] {
  const stopIndex = new Map(manifest.trip.tripStops.map((tripStop, index) => [tripStop.stopId, index]));
  const passengers = manifest.passengers.flatMap((passenger, index) => {
    const pickup = stopIndex.get(passenger.pickupStopId);
    const dropoff = stopIndex.get(passenger.dropoffStopId);
    if (pickup === undefined || dropoff === undefined || pickup >= dropoff) return [];
    return [{
      ...passenger,
      displayName: passenger.clientName?.trim() || `Passager ${index + 1}`,
      pickup,
      dropoff,
    }];
  });

  return manifest.trip.tripStops.map((tripStop, index) => {
    const hasNextLeg = index < manifest.trip.tripStops.length - 1;
    const occupiedAfter = hasNextLeg
      ? passengers.filter((passenger) => passenger.pickup <= index && index < passenger.dropoff).length
      : null;
    return {
      tripStop,
      boarding: passengers.filter((passenger) => passenger.pickup === index).map((passenger) => passenger.displayName),
      leaving: passengers.filter((passenger) => passenger.dropoff === index).map((passenger) => passenger.displayName),
      occupiedAfter,
      availableAfter: occupiedAfter === null ? null : Math.max(0, manifest.trip.capacity - occupiedAfter),
    };
  });
}
