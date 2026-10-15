import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { requireUser } from "../http/authorization.js";
import type { Authentication } from "../services/authentication.js";
import type { Notifier } from "../services/notifications.js";

const fareSchema = z.object({
  fromStopId: z.string().trim().min(1),
  toStopId: z.string().trim().min(1),
  price: z.number().int().positive(),
});

const createTripSchema = z
  .object({
    corridorId: z.string().trim().min(1),
    capacity: z.number().int().positive(),
    departureAt: z.iso.datetime({ offset: true }),
    availableUntil: z.iso.datetime({ offset: true }).optional(),
    availabilityMode: z.enum(["IMMEDIATE", "SCHEDULED"]).default("SCHEDULED"),
    stopIds: z
      .array(z.string().trim().min(1))
      .min(2)
      .refine((stopIds) => new Set(stopIds).size === stopIds.length, {
        message: "Les arrêts doivent être uniques",
      }),
    fares: z
      .array(fareSchema)
      .refine(
        (fares) => new Set(fares.map((fare) => `${fare.fromStopId}:${fare.toStopId}`)).size === fares.length,
        { message: "Les tarifs doivent être uniques" },
      )
      .default([]),
  })
  .refine(
    (input) => !input.availableUntil || new Date(input.departureAt) < new Date(input.availableUntil),
    { message: "La fin de disponibilité doit suivre le départ", path: ["availableUntil"] },
  );

const tripParamsSchema = z.object({ tripId: z.string().trim().min(1) });
const updateTripSchema = z
  .object({
    corridorId: z.string().trim().min(1).optional(),
    capacity: z.number().int().positive().optional(),
    departureAt: z.iso.datetime({ offset: true }).optional(),
    stopIds: z
      .array(z.string().trim().min(1))
      .min(2)
      .refine((stopIds) => new Set(stopIds).size === stopIds.length, {
        message: "Les arrêts doivent être uniques",
      })
      .optional(),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: "Indiquez au moins une modification",
  });

function invalidInput(reply: FastifyReply, error: z.ZodError) {
  return reply
    .status(400)
    .send({ error: "INVALID_INPUT", details: z.treeifyError(error) });
}

const tripInclude = {
  tripStops: {
    orderBy: { sequence: "asc" as const },
    include: { stop: true },
  },
  fares: true,
} as const;

function followsCorridorOrder(positions: number[]): boolean {
  const ascending = positions.every(
    (position, index) => index === 0 || positions[index - 1]! < position,
  );
  const descending = positions.every(
    (position, index) => index === 0 || positions[index - 1]! > position,
  );

  return ascending || descending;
}

export function registerTripRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  authentication: Authentication,
  notifier: Notifier,
): void {
  app.post("/trips", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, [
      "DRIVER",
    ]);
    if (!principal) return;

    const parsed = createTripSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "INVALID_INPUT",
        details: z.treeifyError(parsed.error),
      });
    }

    const {
      corridorId,
      capacity,
      departureAt,
      availableUntil,
      availabilityMode,
      stopIds,
      fares,
    } = parsed.data;
    const [corridor, stops] = await Promise.all([
      prisma.corridor.findUnique({
        where: { id: corridorId },
        select: { id: true },
      }),
      prisma.stop.findMany({
        where: { id: { in: stopIds }, corridorId },
        select: { id: true, position: true },
      }),
    ]);

    if (!corridor) {
      return reply.status(404).send({ error: "CORRIDOR_NOT_FOUND" });
    }
    if (stops.length !== stopIds.length) {
      return reply.status(400).send({ error: "INVALID_TRIP_STOPS" });
    }

    const positionById = new Map(stops.map((stop) => [stop.id, stop.position]));
    const positions = stopIds.map((stopId) => positionById.get(stopId)!);
    if (!followsCorridorOrder(positions)) {
      return reply.status(400).send({ error: "STOPS_OUT_OF_ORDER" });
    }
    const sequenceByStop = new Map(stopIds.map((stopId, sequence) => [stopId, sequence]));
    if (fares.some((fare) => {
      const from = sequenceByStop.get(fare.fromStopId);
      const to = sequenceByStop.get(fare.toStopId);
      return from === undefined || to === undefined || from >= to;
    })) {
      return reply.status(400).send({ error: "INVALID_TRIP_FARES" });
    }

    const trip = await prisma.trip.create({
      data: {
        driverId: principal.userId,
        corridorId,
        capacity,
        departureAt: new Date(departureAt),
        availableUntil: availableUntil ? new Date(availableUntil) : null,
        availabilityMode,
        tripStops: {
          create: stopIds.map((stopId, sequence) => ({ stopId, sequence })),
        },
        fares: {
          create: fares.map((fare) => ({
            fromStopId: fare.fromStopId,
            toStopId: fare.toStopId,
            price: fare.price,
          })),
        },
      },
      include: {
        ...tripInclude,
      },
    });

    return reply.status(201).send(trip);
  });

  app.get("/trips", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, [
      "DRIVER",
    ]);
    if (!principal) return;

    const trips = await prisma.trip.findMany({
      where: { driverId: principal.userId },
      orderBy: { departureAt: "desc" },
      include: tripInclude,
    });
    return reply.send({ trips });
  });

  app.get("/trips/:tripId/manifest", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, [
      "DRIVER",
    ]);
    if (!principal) return;
    const params = tripParamsSchema.safeParse(request.params);
    if (!params.success) return invalidInput(reply, params.error);

    const trip = await prisma.trip.findUnique({
      where: { id: params.data.tripId },
      include: {
        ...tripInclude,
        bookings: {
          where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
          select: {
            id: true,
            clientId: true,
            pickupStopId: true,
            dropoffStopId: true,
            client: { select: { name: true } },
          },
        },
      },
    });
    if (!trip) return reply.status(404).send({ error: "TRIP_NOT_FOUND" });
    if (trip.driverId !== principal.userId) {
      return reply.status(403).send({ error: "TRIP_ACTION_FORBIDDEN" });
    }

    const { bookings, ...publicTrip } = trip;
    return reply.send({
      trip: publicTrip,
      passengers: bookings.map((booking) => ({
        bookingId: booking.id,
        clientId: booking.clientId,
        clientName: booking.client.name,
        pickupStopId: booking.pickupStopId,
        dropoffStopId: booking.dropoffStopId,
      })),
    });
  });

  app.patch("/trips/:tripId", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, ["DRIVER"]);
    if (!principal) return;
    const params = tripParamsSchema.safeParse(request.params);
    const body = updateTripSchema.safeParse(request.body);
    if (!params.success) return invalidInput(reply, params.error);
    if (!body.success) return invalidInput(reply, body.error);
    if (body.data.departureAt && new Date(body.data.departureAt) <= new Date()) {
      return reply.status(400).send({ error: "DEPARTURE_MUST_BE_FUTURE" });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Trip" WHERE "id" = ${params.data.tripId} FOR UPDATE`;
      const current = await tx.trip.findUnique({
        where: { id: params.data.tripId },
        select: {
          id: true,
          driverId: true,
          corridorId: true,
          status: true,
          capacity: true,
          tripStops: { select: { stopId: true, sequence: true } },
          bookings: {
            where: { status: { in: ["PROPOSED_BY_CLIENT", "PROPOSED_BY_DRIVER", "CONFIRMED"] } },
            select: { pickupStopId: true, dropoffStopId: true, clientId: true, status: true },
          },
        },
      });
      if (!current) return { error: "TRIP_NOT_FOUND" as const };
      if (current.driverId !== principal.userId) return { error: "TRIP_ACTION_FORBIDDEN" as const };
      if (current.status !== "OPEN" && current.status !== "FULL") {
        return { error: "TRIP_NOT_EDITABLE" as const };
      }

      const corridorId = body.data.corridorId ?? current.corridorId;
      const stopIds = body.data.stopIds ?? current.tripStops
        .sort((a, b) => a.sequence - b.sequence)
        .map((stop) => stop.stopId);
      const routeChanged = corridorId !== current.corridorId || body.data.stopIds !== undefined;
      if (routeChanged) {
        const [corridor, stops] = await Promise.all([
          tx.corridor.findUnique({ where: { id: corridorId }, select: { id: true } }),
          tx.stop.findMany({
            where: { id: { in: stopIds }, corridorId },
            select: { id: true, position: true },
          }),
        ]);
        if (!corridor) return { error: "CORRIDOR_NOT_FOUND" as const };
        if (stops.length !== stopIds.length) return { error: "INVALID_TRIP_STOPS" as const };
        const positionById = new Map(stops.map((stop) => [stop.id, stop.position]));
        if (!followsCorridorOrder(stopIds.map((stopId) => positionById.get(stopId)!))) {
          return { error: "STOPS_OUT_OF_ORDER" as const };
        }
      }

      const sequenceByStop = new Map(stopIds.map((stopId, sequence) => [stopId, sequence]));
      const confirmedBookings = current.bookings.filter((booking) => booking.status === "CONFIRMED");
      if (confirmedBookings.some((booking) => {
        const pickup = sequenceByStop.get(booking.pickupStopId);
        const dropoff = sequenceByStop.get(booking.dropoffStopId);
        return pickup === undefined || dropoff === undefined || pickup >= dropoff;
      })) {
        return { error: "CONFIRMED_BOOKING_CONFLICT" as const };
      }

      const occupancy = Array.from(
        { length: Math.max(0, stopIds.length - 1) },
        () => 0,
      );
      for (const booking of confirmedBookings) {
        const pickup = sequenceByStop.get(booking.pickupStopId)!;
        const dropoff = sequenceByStop.get(booking.dropoffStopId)!;
        for (let leg = pickup; leg < dropoff; leg += 1) occupancy[leg]! += 1;
      }
      const maximumOccupancy = Math.max(0, ...occupancy);
      const capacity = body.data.capacity ?? current.capacity;
      if (capacity < maximumOccupancy) {
        return { error: "CAPACITY_BELOW_OCCUPANCY" as const };
      }

      if (routeChanged) {
        await tx.booking.updateMany({
          where: { tripId: current.id, status: { in: ["PROPOSED_BY_CLIENT", "PROPOSED_BY_DRIVER"] } },
          data: { status: "CANCELLED" },
        });
      }

      const trip = await tx.trip.update({
        where: { id: current.id },
        data: {
          corridorId,
          capacity,
          ...(body.data.departureAt ? { departureAt: new Date(body.data.departureAt) } : {}),
          status: capacity <= maximumOccupancy ? "FULL" : "OPEN",
          ...(routeChanged ? {
            tripStops: {
              deleteMany: {},
              create: stopIds.map((stopId, sequence) => ({ stopId, sequence })),
            },
          } : {}),
        },
        include: tripInclude,
      });
      return { trip, clientIds: current.bookings.map((booking) => booking.clientId) };
    });

    if ("error" in result) {
      const status = result.error === "TRIP_NOT_FOUND" || result.error === "CORRIDOR_NOT_FOUND"
        ? 404
        : result.error === "TRIP_ACTION_FORBIDDEN"
          ? 403
          : result.error === "INVALID_TRIP_STOPS" || result.error === "STOPS_OUT_OF_ORDER"
            ? 400
            : 409;
      return reply.status(status).send({ error: result.error });
    }
    void notifier.notifyUsers(result.clientIds, {
      title: "Trajet modifié",
      body: "Le chauffeur a modifié les informations du trajet.",
      data: { url: "/mes-demandes", tripId: result.trip.id },
    }).catch((error) => request.log.error(error, "Échec de notification de modification"));
    return reply.send(result.trip);
  });

  app.post("/trips/:tripId/cancel", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, ["DRIVER"]);
    if (!principal) return;
    const params = tripParamsSchema.safeParse(request.params);
    if (!params.success) return invalidInput(reply, params.error);

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Trip" WHERE "id" = ${params.data.tripId} FOR UPDATE`;
      const current = await tx.trip.findUnique({
        where: { id: params.data.tripId },
        select: {
          id: true,
          driverId: true,
          status: true,
          bookings: {
            where: { status: { in: ["PROPOSED_BY_CLIENT", "PROPOSED_BY_DRIVER", "CONFIRMED"] } },
            select: { clientId: true },
          },
        },
      });
      if (!current) return { error: "TRIP_NOT_FOUND" as const };
      if (current.driverId !== principal.userId) return { error: "TRIP_ACTION_FORBIDDEN" as const };
      if (current.status !== "OPEN" && current.status !== "FULL") {
        return { error: "TRIP_NOT_CANCELLABLE" as const };
      }
      await tx.booking.updateMany({
        where: { tripId: current.id, status: { in: ["PROPOSED_BY_CLIENT", "PROPOSED_BY_DRIVER", "CONFIRMED"] } },
        data: { status: "CANCELLED" },
      });
      await tx.tripLocation.deleteMany({ where: { tripId: current.id } });
      const trip = await tx.trip.update({
        where: { id: current.id },
        data: { status: "CANCELLED" },
        include: tripInclude,
      });
      return { trip, clientIds: current.bookings.map((booking) => booking.clientId) };
    });
    if ("error" in result) {
      const status = result.error === "TRIP_NOT_FOUND" ? 404 : result.error === "TRIP_ACTION_FORBIDDEN" ? 403 : 409;
      return reply.status(status).send({ error: result.error });
    }
    void notifier.notifyUsers(result.clientIds, {
      title: "Trajet annulé",
      body: "Le chauffeur a annulé le trajet.",
      data: { url: "/mes-demandes", tripId: result.trip.id },
    }).catch((error) => request.log.error(error, "Échec de notification d’annulation du trajet"));
    return reply.send(result.trip);
  });

  app.post("/trips/:tripId/close", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, [
      "DRIVER",
    ]);
    if (!principal) return;
    const params = tripParamsSchema.safeParse(request.params);
    if (!params.success) return invalidInput(reply, params.error);

    const current = await prisma.trip.findUnique({
      where: { id: params.data.tripId },
      select: { id: true, driverId: true, status: true },
    });
    if (!current) return reply.status(404).send({ error: "TRIP_NOT_FOUND" });
    if (current.driverId !== principal.userId) {
      return reply.status(403).send({ error: "TRIP_ACTION_FORBIDDEN" });
    }
    if (current.status !== "OPEN" && current.status !== "FULL") {
      return reply.status(409).send({ error: "TRIP_NOT_OPEN" });
    }

    const trip = await prisma.$transaction(async (tx) => {
      await tx.booking.updateMany({
        where: {
          tripId: current.id,
          status: { in: ["PROPOSED_BY_CLIENT", "PROPOSED_BY_DRIVER"] },
        },
        data: { status: "EXPIRED" },
      });
      await tx.booking.updateMany({
        where: { tripId: current.id, status: "CONFIRMED" },
        data: { status: "COMPLETED" },
      });
      await tx.tripLocation.deleteMany({ where: { tripId: current.id } });
      return tx.trip.update({
        where: { id: current.id },
        data: { status: "COMPLETED" },
        include: tripInclude,
      });
    });
    return reply.send(trip);
  });
}
