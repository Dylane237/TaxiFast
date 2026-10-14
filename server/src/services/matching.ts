import type { PrismaClient } from "@prisma/client";
import { canBook, isValidSegment, type Segment } from "../domain/capacity.js";

export type MatchingErrorCode =
  | "SOURCE_NOT_FOUND"
  | "SOURCE_FORBIDDEN"
  | "SOURCE_NOT_OPEN";

export class MatchingError extends Error {
  constructor(public readonly code: MatchingErrorCode) {
    super(code);
    this.name = "MatchingError";
  }
}

export interface Matching {
  findTripsForRequest(requestId: string, clientId: string): Promise<unknown[]>;
  findRequestsForTrip(tripId: string, driverId: string): Promise<unknown[]>;
}

function getSegment(
  sequenceByStopId: Map<string, number>,
  pickupStopId: string,
  dropoffStopId: string,
): Segment | null {
  const segment = {
    pickup: sequenceByStopId.get(pickupStopId) ?? -1,
    dropoff: sequenceByStopId.get(dropoffStopId) ?? -1,
  };
  return isValidSegment(segment) ? segment : null;
}

export class PrismaMatchingService implements Matching {
  constructor(private readonly prisma: PrismaClient) {}

  async findTripsForRequest(requestId: string, clientId: string) {
    const request = await this.prisma.tripRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        clientId: true,
        corridorId: true,
        fromStopId: true,
        toStopId: true,
        windowStart: true,
        windowEnd: true,
        status: true,
      },
    });
    if (!request) throw new MatchingError("SOURCE_NOT_FOUND");
    if (request.clientId !== clientId)
      throw new MatchingError("SOURCE_FORBIDDEN");
    if (request.status !== "OPEN") throw new MatchingError("SOURCE_NOT_OPEN");

    const trips = await this.prisma.trip.findMany({
      where: {
        corridorId: request.corridorId,
        status: "OPEN",
        departureAt: { gte: request.windowStart, lte: request.windowEnd },
        bookings: {
          none: {
            requestId: request.id,
            status: {
              in: ["PROPOSED_BY_CLIENT", "PROPOSED_BY_DRIVER", "CONFIRMED"],
            },
          },
        },
      },
      orderBy: { departureAt: "asc" },
      select: {
        id: true,
        corridorId: true,
        capacity: true,
        departureAt: true,
        status: true,
        driver: {
          select: {
            id: true,
            name: true,
            vehicle: { select: { plate: true, model: true, seats: true } },
            ratingsReceived: { select: { score: true } },
          },
        },
        tripStops: {
          orderBy: { sequence: "asc" },
          select: {
            sequence: true,
            stopId: true,
            stop: { select: { id: true, name: true } },
          },
        },
        bookings: {
          where: { status: "CONFIRMED" },
          select: { pickupStopId: true, dropoffStopId: true },
        },
      },
    });

    return trips.flatMap((trip) => {
      const sequenceByStopId = new Map(
        trip.tripStops.map((tripStop) => [tripStop.stopId, tripStop.sequence]),
      );
      const candidate = getSegment(
        sequenceByStopId,
        request.fromStopId,
        request.toStopId,
      );
      const existing = trip.bookings.map((booking) =>
        getSegment(
          sequenceByStopId,
          booking.pickupStopId,
          booking.dropoffStopId,
        ),
      );
      if (!candidate || existing.some((segment) => segment === null)) return [];
      if (!canBook(trip.capacity, existing as Segment[], candidate)) return [];

      const { bookings: _bookings, driver, ...publicTrip } = trip;
      const rating = driver.ratingsReceived.length
        ? driver.ratingsReceived.reduce((sum, item) => sum + item.score, 0) /
          driver.ratingsReceived.length
        : null;
      return [
        {
          ...publicTrip,
          driver: {
            id: driver.id,
            name: driver.name,
            vehicle: driver.vehicle,
            rating,
          },
        },
      ];
    });
  }

  async findRequestsForTrip(tripId: string, driverId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        driverId: true,
        corridorId: true,
        capacity: true,
        departureAt: true,
        status: true,
        tripStops: {
          orderBy: { sequence: "asc" },
          select: { stopId: true, sequence: true },
        },
        bookings: {
          where: { status: "CONFIRMED" },
          select: { pickupStopId: true, dropoffStopId: true },
        },
      },
    });
    if (!trip) throw new MatchingError("SOURCE_NOT_FOUND");
    if (trip.driverId !== driverId) throw new MatchingError("SOURCE_FORBIDDEN");
    if (trip.status !== "OPEN") throw new MatchingError("SOURCE_NOT_OPEN");

    const requests = await this.prisma.tripRequest.findMany({
      where: {
        corridorId: trip.corridorId,
        status: "OPEN",
        windowStart: { lte: trip.departureAt },
        windowEnd: { gte: trip.departureAt },
        bookings: {
          none: {
            tripId: trip.id,
            status: {
              in: ["PROPOSED_BY_CLIENT", "PROPOSED_BY_DRIVER", "CONFIRMED"],
            },
          },
        },
      },
      orderBy: [{ proposedPrice: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        clientId: true,
        fromStopId: true,
        toStopId: true,
        windowStart: true,
        windowEnd: true,
        proposedPrice: true,
        client: { select: { id: true, name: true } },
        fromStop: { select: { id: true, name: true } },
        toStop: { select: { id: true, name: true } },
      },
    });

    const sequenceByStopId = new Map(
      trip.tripStops.map((tripStop) => [tripStop.stopId, tripStop.sequence]),
    );
    const existing = trip.bookings.map((booking) =>
      getSegment(sequenceByStopId, booking.pickupStopId, booking.dropoffStopId),
    );
    if (existing.some((segment) => segment === null)) return [];

    return requests.filter((request) => {
      const candidate = getSegment(
        sequenceByStopId,
        request.fromStopId,
        request.toStopId,
      );
      return (
        candidate !== null &&
        canBook(trip.capacity, existing as Segment[], candidate)
      );
    });
  }
}
