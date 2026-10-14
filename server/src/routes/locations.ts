import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { requireUser } from "../http/authorization.js";
import type { Authentication } from "../services/authentication.js";

const tripParamsSchema = z.object({ tripId: z.string().trim().min(1) });
const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().nullable().optional(),
  heading: z.number().min(0).max(360).nullable().optional(),
});

function invalidInput(reply: FastifyReply, error: z.ZodError) {
  return reply.status(400).send({ error: "INVALID_INPUT", details: z.treeifyError(error) });
}

export function registerLocationRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  authentication: Authentication,
): void {
  app.get("/trips/:tripId/route", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, ["CLIENT", "DRIVER"]);
    if (!principal) return;
    const params = tripParamsSchema.safeParse(request.params);
    if (!params.success) return invalidInput(reply, params.error);

    const trip = await prisma.trip.findUnique({
      where: { id: params.data.tripId },
      include: {
        tripStops: {
          orderBy: { sequence: "asc" },
          include: { stop: true },
        },
        bookings: {
          where: { clientId: principal.userId, status: "CONFIRMED" },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (!trip) return reply.status(404).send({ error: "TRIP_NOT_FOUND" });
    if (trip.driverId !== principal.userId && trip.bookings.length === 0) {
      return reply.status(403).send({ error: "LOCATION_ACTION_FORBIDDEN" });
    }

    const { bookings: _bookings, ...route } = trip;
    return reply.send(route);
  });

  app.put("/trips/:tripId/location", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, ["DRIVER"]);
    if (!principal) return;
    const params = tripParamsSchema.safeParse(request.params);
    const body = locationSchema.safeParse(request.body);
    if (!params.success) return invalidInput(reply, params.error);
    if (!body.success) return invalidInput(reply, body.error);

    const trip = await prisma.trip.findUnique({
      where: { id: params.data.tripId },
      select: { driverId: true, status: true },
    });
    if (!trip) return reply.status(404).send({ error: "TRIP_NOT_FOUND" });
    if (trip.driverId !== principal.userId) {
      return reply.status(403).send({ error: "TRIP_ACTION_FORBIDDEN" });
    }
    if (trip.status !== "OPEN" && trip.status !== "FULL") {
      return reply.status(409).send({ error: "LOCATION_SHARING_NOT_ALLOWED" });
    }

    const location = await prisma.tripLocation.upsert({
      where: { tripId: params.data.tripId },
      create: { tripId: params.data.tripId, ...body.data },
      update: body.data,
    });
    return reply.send(location);
  });

  app.get("/trips/:tripId/location", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, ["CLIENT", "DRIVER"]);
    if (!principal) return;
    const params = tripParamsSchema.safeParse(request.params);
    if (!params.success) return invalidInput(reply, params.error);

    const trip = await prisma.trip.findUnique({
      where: { id: params.data.tripId },
      select: {
        driverId: true,
        status: true,
        bookings: {
          where: { clientId: principal.userId, status: "CONFIRMED" },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (!trip) return reply.status(404).send({ error: "TRIP_NOT_FOUND" });
    if (trip.driverId !== principal.userId && trip.bookings.length === 0) {
      return reply.status(403).send({ error: "LOCATION_ACTION_FORBIDDEN" });
    }
    if (trip.status !== "OPEN" && trip.status !== "FULL") {
      return reply.status(409).send({ error: "LOCATION_SHARING_NOT_ALLOWED" });
    }

    const location = await prisma.tripLocation.findUnique({ where: { tripId: params.data.tripId } });
    return reply.send({ location });
  });
}
