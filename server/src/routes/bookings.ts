import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { canBook, isValidSegment } from "../domain/capacity.js";
import { requireUser } from "../http/authorization.js";
import type { Authentication } from "../services/authentication.js";
import { ConfirmBookingError } from "../services/booking-confirmation.js";
import type { Notifier } from "../services/notifications.js";

export type ConfirmBooking = (
  prisma: PrismaClient,
  input: unknown,
) => Promise<unknown>;

const bookingIdParamsSchema = z.object({
  bookingId: z.string().trim().min(1),
});

const counterOfferSchema = z.object({
  counterPrice: z.number().int().positive(),
});

const proposalSchema = z.object({
  tripId: z.string().trim().min(1),
  pickupStopId: z.string().trim().min(1),
  dropoffStopId: z.string().trim().min(1),
  proposedPrice: z.number().int().positive(),
  requestId: z.string().trim().min(1).optional(),
});

const terminalStatuses = [
  "COMPLETED",
  "CANCELLED",
  "REFUSED",
  "EXPIRED",
] as const;

function invalidInput(reply: FastifyReply, error: z.ZodError) {
  return reply.status(400).send({
    error: "INVALID_INPUT",
    details: z.treeifyError(error),
  });
}

function expectedResponderId(booking: {
  status: string;
  clientId: string;
  trip: { driverId: string };
}): string | null {
  if (booking.status === "PROPOSED_BY_CLIENT") return booking.trip.driverId;
  if (booking.status === "PROPOSED_BY_DRIVER") return booking.clientId;
  return null;
}

function sendConfirmationError(
  reply: FastifyReply,
  error: ConfirmBookingError,
) {
  if (error.code === "BOOKING_NOT_FOUND") {
    return reply.status(404).send({ error: error.code });
  }
  if (error.code === "CAPACITY_EXCEEDED") {
    return reply.status(409).send({ error: error.code });
  }
  return reply.status(409).send({ error: error.code });
}

export function registerBookingRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  confirm: ConfirmBooking,
  authentication: Authentication,
  notifier: Notifier,
): void {
  app.post("/bookings", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, [
      "CLIENT",
    ]);
    if (!principal) return;

    const parsed = proposalSchema.safeParse(request.body);
    if (!parsed.success) return invalidInput(reply, parsed.error);

    const { tripId, pickupStopId, dropoffStopId, proposedPrice, requestId } =
      parsed.data;
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        corridorId: true,
        driverId: true,
        status: true,
        tripStops: { select: { stopId: true, sequence: true } },
      },
    });

    if (!trip) return reply.status(404).send({ error: "TRIP_NOT_FOUND" });
    if (trip.status !== "OPEN")
      return reply.status(409).send({ error: "TRIP_NOT_OPEN" });

    const sequenceByStopId = new Map(
      trip.tripStops.map((tripStop) => [tripStop.stopId, tripStop.sequence]),
    );
    const segment = {
      pickup: sequenceByStopId.get(pickupStopId) ?? -1,
      dropoff: sequenceByStopId.get(dropoffStopId) ?? -1,
    };
    if (!isValidSegment(segment)) {
      return reply.status(400).send({ error: "INVALID_BOOKING_STOPS" });
    }

    if (requestId) {
      const tripRequest = await prisma.tripRequest.findUnique({
        where: { id: requestId },
      });
      if (!tripRequest)
        return reply.status(404).send({ error: "REQUEST_NOT_FOUND" });
      if (tripRequest.clientId !== principal.userId) {
        return reply.status(403).send({ error: "REQUEST_ACTION_FORBIDDEN" });
      }
      if (
        tripRequest.status !== "OPEN" ||
        tripRequest.corridorId !== trip.corridorId ||
        tripRequest.fromStopId !== pickupStopId ||
        tripRequest.toStopId !== dropoffStopId
      ) {
        return reply.status(409).send({ error: "REQUEST_NOT_BOOKABLE" });
      }
    }

    const booking = await prisma.booking.create({
      data: {
        tripId,
        clientId: principal.userId,
        pickupStopId,
        dropoffStopId,
        initiatedBy: "CLIENT",
        status: "PROPOSED_BY_CLIENT",
        proposedPrice,
        ...(requestId ? { requestId } : {}),
        expiresAt: new Date(Date.now() + 30 * 60_000),
      },
    });

    void notifier
      .notifyUsers([trip.driverId], {
        title: "Nouvelle proposition",
        body: `Un client propose ${proposedPrice.toLocaleString("fr-FR")} FCFA pour votre trajet.`,
        data: { url: `/demandes/${booking.id}`, bookingId: booking.id },
      })
      .catch((error) =>
        request.log.error(error, "Échec de notification du chauffeur"),
      );

    return reply.status(201).send(booking);
  });

  app.get("/bookings/client", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, [
      "CLIENT",
    ]);
    if (!principal) return;
    const bookings = await prisma.booking.findMany({
      where: { clientId: principal.userId },
      orderBy: { updatedAt: "desc" },
    });
    return reply.send({ bookings });
  });

  app.get("/bookings/driver", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, [
      "DRIVER",
    ]);
    if (!principal) return;
    const bookings = await prisma.booking.findMany({
      where: { trip: { driverId: principal.userId } },
      orderBy: { updatedAt: "desc" },
    });
    return reply.send({ bookings });
  });

  app.get("/bookings/history", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, [
      "CLIENT",
      "DRIVER",
    ]);
    if (!principal) return;
    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: [...terminalStatuses] },
        ...(principal.role === "CLIENT"
          ? { clientId: principal.userId }
          : { trip: { driverId: principal.userId } }),
      },
      orderBy: { updatedAt: "desc" },
    });
    return reply.send({ bookings });
  });

  app.get("/bookings/:bookingId", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, [
      "CLIENT",
      "DRIVER",
    ]);
    if (!principal) return;
    const params = bookingIdParamsSchema.safeParse(request.params);
    if (!params.success) return invalidInput(reply, params.error);

    const booking = await prisma.booking.findUnique({
      where: { id: params.data.bookingId },
      include: {
        client: { select: { id: true, name: true } },
        pickupStop: { select: { id: true, name: true } },
        dropoffStop: { select: { id: true, name: true } },
        ratings: {
          where: { authorId: principal.userId },
          select: { id: true },
        },
        trip: {
          include: {
            tripStops: {
              orderBy: { sequence: "asc" },
              include: { stop: true },
            },
            fares: true,
            driver: {
              select: {
                id: true,
                name: true,
                vehicle: { select: { plate: true, model: true, seats: true } },
                ratingsReceived: { select: { score: true } },
              },
            },
          },
        },
      },
    });
    if (!booking) return reply.status(404).send({ error: "BOOKING_NOT_FOUND" });
    if (
      booking.clientId !== principal.userId &&
      booking.trip.driverId !== principal.userId
    ) {
      return reply.status(403).send({ error: "BOOKING_ACTION_FORBIDDEN" });
    }

    const { client, pickupStop, dropoffStop, ratings, trip, ...publicBooking } =
      booking;
    const { driver, ...publicTrip } = trip;
    const rating = driver.ratingsReceived.length
      ? driver.ratingsReceived.reduce((sum, item) => sum + item.score, 0) /
        driver.ratingsReceived.length
      : null;
    return reply.send({
      booking: publicBooking,
      trip: publicTrip,
      driver: {
        id: driver.id,
        name: driver.name,
        vehicle: driver.vehicle,
        rating,
      },
      client,
      pickupStop,
      dropoffStop,
      ratedByCurrentUser: ratings.length > 0,
    });
  });

  app.post("/bookings/:bookingId/accept", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, [
      "CLIENT",
      "DRIVER",
    ]);
    if (!principal) return;

    const params = bookingIdParamsSchema.safeParse(request.params);
    if (!params.success) return invalidInput(reply, params.error);

    const booking = await prisma.booking.findUnique({
      where: { id: params.data.bookingId },
      select: {
        id: true,
        clientId: true,
        status: true,
        trip: { select: { driverId: true } },
      },
    });
    if (!booking) return reply.status(404).send({ error: "BOOKING_NOT_FOUND" });

    const responderId = expectedResponderId(booking);
    if (!responderId)
      return reply.status(409).send({ error: "BOOKING_NOT_CONFIRMABLE" });
    if (principal.userId !== responderId) {
      return reply.status(403).send({ error: "BOOKING_ACTION_FORBIDDEN" });
    }

    try {
      const confirmed = await confirm(prisma, { bookingId: booking.id });
      const targetId =
        principal.userId === booking.clientId
          ? booking.trip.driverId
          : booking.clientId;
      void notifier
        .notifyUsers([targetId], {
          title: "Réservation confirmée",
          body: "La réservation a été acceptée.",
          data: { url: `/reservation/${booking.id}`, bookingId: booking.id },
        })
        .catch((error) =>
          request.log.error(error, "Échec de notification de confirmation"),
        );
      return reply.send(confirmed);
    } catch (error) {
      if (error instanceof ConfirmBookingError)
        return sendConfirmationError(reply, error);
      throw error;
    }
  });

  app.post("/bookings/:bookingId/refuse", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, [
      "CLIENT",
      "DRIVER",
    ]);
    if (!principal) return;

    const params = bookingIdParamsSchema.safeParse(request.params);
    if (!params.success) return invalidInput(reply, params.error);

    const booking = await prisma.booking.findUnique({
      where: { id: params.data.bookingId },
      select: {
        id: true,
        clientId: true,
        status: true,
        trip: { select: { driverId: true } },
      },
    });
    if (!booking) return reply.status(404).send({ error: "BOOKING_NOT_FOUND" });

    const responderId = expectedResponderId(booking);
    if (!responderId)
      return reply.status(409).send({ error: "BOOKING_NOT_REFUSABLE" });
    if (principal.userId !== responderId) {
      return reply.status(403).send({ error: "BOOKING_ACTION_FORBIDDEN" });
    }

    const result = await prisma.booking.updateMany({
      where: { id: booking.id, status: booking.status },
      data: { status: "REFUSED" },
    });
    if (result.count !== 1) {
      return reply.status(409).send({ error: "BOOKING_ALREADY_CHANGED" });
    }

    const refused = await prisma.booking.findUnique({
      where: { id: booking.id },
    });
    const refusedTargetId =
      principal.userId === booking.clientId
        ? booking.trip.driverId
        : booking.clientId;
    void notifier
      .notifyUsers([refusedTargetId], {
        title: "Proposition refusée",
        body: "La proposition de réservation a été refusée.",
        data: { url: "/mes-demandes", bookingId: booking.id },
      })
      .catch((error) =>
        request.log.error(error, "Échec de notification de refus"),
      );
    return reply.send(refused);
  });

  app.post("/bookings/:bookingId/counter-offer", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, [
      "DRIVER",
    ]);
    if (!principal) return;

    const params = bookingIdParamsSchema.safeParse(request.params);
    const body = counterOfferSchema.safeParse(request.body);
    if (!params.success) return invalidInput(reply, params.error);
    if (!body.success) return invalidInput(reply, body.error);

    const booking = await prisma.booking.findUnique({
      where: { id: params.data.bookingId },
      select: {
        id: true,
        clientId: true,
        status: true,
        counterPrice: true,
        trip: { select: { driverId: true } },
      },
    });
    if (!booking) return reply.status(404).send({ error: "BOOKING_NOT_FOUND" });
    if (principal.userId !== booking.trip.driverId) {
      return reply.status(403).send({ error: "BOOKING_ACTION_FORBIDDEN" });
    }
    if (
      booking.status !== "PROPOSED_BY_CLIENT" ||
      booking.counterPrice !== null
    ) {
      return reply.status(409).send({ error: "COUNTER_OFFER_NOT_ALLOWED" });
    }

    const result = await prisma.booking.updateMany({
      where: {
        id: booking.id,
        status: "PROPOSED_BY_CLIENT",
        counterPrice: null,
      },
      data: {
        counterPrice: body.data.counterPrice,
        status: "PROPOSED_BY_DRIVER",
      },
    });
    if (result.count !== 1) {
      return reply.status(409).send({ error: "BOOKING_ALREADY_CHANGED" });
    }

    const countered = await prisma.booking.findUnique({
      where: { id: booking.id },
    });
    void notifier
      .notifyUsers([booking.clientId], {
        title: "Nouvelle contre-proposition",
        body: `Le chauffeur propose ${body.data.counterPrice.toLocaleString("fr-FR")} FCFA.`,
        data: { url: `/offre/${booking.id}`, bookingId: booking.id },
      })
      .catch((error) =>
        request.log.error(error, "Échec de notification de contre-proposition"),
      );
    return reply.send(countered);
  });

  app.post("/bookings/:bookingId/cancel", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, [
      "CLIENT",
      "DRIVER",
    ]);
    if (!principal) return;
    const params = bookingIdParamsSchema.safeParse(request.params);
    if (!params.success) return invalidInput(reply, params.error);

    const reference = await prisma.booking.findUnique({
      where: { id: params.data.bookingId },
      select: {
        id: true,
        tripId: true,
        clientId: true,
        status: true,
        trip: { select: { driverId: true } },
      },
    });
    if (!reference)
      return reply.status(404).send({ error: "BOOKING_NOT_FOUND" });
    if (
      reference.clientId !== principal.userId &&
      reference.trip.driverId !== principal.userId
    ) {
      return reply.status(403).send({ error: "BOOKING_ACTION_FORBIDDEN" });
    }
    if (
      terminalStatuses.includes(
        reference.status as (typeof terminalStatuses)[number],
      )
    ) {
      return reply.status(409).send({ error: "BOOKING_NOT_CANCELLABLE" });
    }

    const cancelled = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Trip" WHERE "id" = ${reference.tripId} FOR UPDATE`;
      const result = await tx.booking.updateMany({
        where: { id: reference.id, status: reference.status },
        data: { status: "CANCELLED" },
      });
      if (result.count !== 1)
        throw new ConfirmBookingError("BOOKING_NOT_CONFIRMABLE");
      const trip = await tx.trip.findUnique({
        where: { id: reference.tripId },
        select: {
          id: true,
          capacity: true,
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
      if (trip && (trip.status === "OPEN" || trip.status === "FULL")) {
        const sequenceByStop = new Map(
          trip.tripStops.map((tripStop) => [
            tripStop.stopId,
            tripStop.sequence,
          ]),
        );
        const segments = trip.bookings.map((item) => ({
          pickup: sequenceByStop.get(item.pickupStopId) ?? -1,
          dropoff: sequenceByStop.get(item.dropoffStopId) ?? -1,
        }));
        const full = trip.tripStops
          .slice(0, -1)
          .every(
            (_, leg) =>
              !canBook(trip.capacity, segments, {
                pickup: leg,
                dropoff: leg + 1,
              }),
          );
        await tx.trip.update({
          where: { id: trip.id },
          data: { status: full ? "FULL" : "OPEN" },
        });
      }
      return tx.booking.findUniqueOrThrow({ where: { id: reference.id } });
    });
    const cancelledTargetId =
      principal.userId === reference.clientId
        ? reference.trip.driverId
        : reference.clientId;
    void notifier
      .notifyUsers([cancelledTargetId], {
        title: "Réservation annulée",
        body: "La réservation a été annulée.",
        data: { url: "/historique", bookingId: reference.id },
      })
      .catch((error) =>
        request.log.error(error, "Échec de notification d’annulation"),
      );
    return reply.send(cancelled);
  });
}
