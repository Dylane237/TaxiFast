import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { requireUser } from "../http/authorization.js";
import type { Authentication } from "../services/authentication.js";
import type { Notifier } from "../services/notifications.js";

const createTripRequestSchema = z
  .object({
    corridorId: z.string().trim().min(1),
    fromStopId: z.string().trim().min(1),
    toStopId: z.string().trim().min(1),
    windowStart: z.iso.datetime({ offset: true }),
    windowEnd: z.iso.datetime({ offset: true }),
    proposedPrice: z.number().int().positive(),
  })
  .refine((input) => input.fromStopId !== input.toStopId, {
    message: "Les arrêts de départ et d'arrivée doivent être différents",
    path: ["toStopId"],
  })
  .refine((input) => new Date(input.windowStart) < new Date(input.windowEnd), {
    message: "La fin de la fenêtre doit être postérieure au début",
    path: ["windowEnd"],
  });

const requestParamsSchema = z.object({ requestId: z.string().trim().min(1) });
const updateTripRequestSchema = z
  .object({
    corridorId: z.string().trim().min(1).optional(),
    fromStopId: z.string().trim().min(1).optional(),
    toStopId: z.string().trim().min(1).optional(),
    windowStart: z.iso.datetime({ offset: true }).optional(),
    windowEnd: z.iso.datetime({ offset: true }).optional(),
    proposedPrice: z.number().int().positive().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "Indiquez au moins une modification",
  });

function invalidInput(reply: FastifyReply, error: z.ZodError) {
  return reply
    .status(400)
    .send({ error: "INVALID_INPUT", details: z.treeifyError(error) });
}

export function registerTripRequestRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  authentication: Authentication,
  notifier: Notifier,
): void {
  app.post("/trip-requests", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, [
      "CLIENT",
    ]);
    if (!principal) return;

    const parsed = createTripRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "INVALID_INPUT",
        details: z.treeifyError(parsed.error),
      });
    }

    const {
      corridorId,
      fromStopId,
      toStopId,
      windowStart,
      windowEnd,
      proposedPrice,
    } = parsed.data;
    const [corridor, stops] = await Promise.all([
      prisma.corridor.findUnique({
        where: { id: corridorId },
        select: { id: true },
      }),
      prisma.stop.findMany({
        where: { corridorId, id: { in: [fromStopId, toStopId] } },
        select: { id: true, position: true },
      }),
    ]);

    if (!corridor)
      return reply.status(404).send({ error: "CORRIDOR_NOT_FOUND" });
    if (stops.length !== 2)
      return reply.status(400).send({ error: "INVALID_REQUEST_STOPS" });
    const positionById = new Map(stops.map((stop) => [stop.id, stop.position]));
    if (positionById.get(fromStopId)! >= positionById.get(toStopId)!) {
      return reply.status(400).send({ error: "INVALID_REQUEST_STOPS" });
    }

    const tripRequest = await prisma.tripRequest.create({
      data: {
        clientId: principal.userId,
        corridorId,
        fromStopId,
        toStopId,
        windowStart: new Date(windowStart),
        windowEnd: new Date(windowEnd),
        proposedPrice,
      },
    });

    void notifier
      .notifyDriversOnCorridor(corridorId, {
        title: "Nouvelle demande sur votre itinéraire",
        body: `Un client propose ${proposedPrice.toLocaleString("fr-FR")} FCFA.`,
        data: { url: "/demandes", requestId: tripRequest.id },
      })
      .catch((error) =>
        request.log.error(error, "Échec de notification des chauffeurs"),
      );

    return reply.status(201).send(tripRequest);
  });

  app.get("/trip-requests", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, [
      "CLIENT",
    ]);
    if (!principal) return;
    const tripRequests = await prisma.tripRequest.findMany({
      where: { clientId: principal.userId },
      orderBy: { createdAt: "desc" },
    });
    return reply.send({ requests: tripRequests });
  });

  app.patch("/trip-requests/:requestId", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, ["CLIENT"]);
    if (!principal) return;
    const params = requestParamsSchema.safeParse(request.params);
    const body = updateTripRequestSchema.safeParse(request.body);
    if (!params.success) return invalidInput(reply, params.error);
    if (!body.success) return invalidInput(reply, body.error);

    const current = await prisma.tripRequest.findUnique({
      where: { id: params.data.requestId },
      include: {
        bookings: {
          where: { status: { in: ["PROPOSED_BY_CLIENT", "PROPOSED_BY_DRIVER", "CONFIRMED"] } },
          select: { id: true, status: true, trip: { select: { driverId: true } } },
        },
      },
    });
    if (!current) return reply.status(404).send({ error: "REQUEST_NOT_FOUND" });
    if (current.clientId !== principal.userId) {
      return reply.status(403).send({ error: "REQUEST_ACTION_FORBIDDEN" });
    }
    if (current.status !== "OPEN") {
      return reply.status(409).send({ error: "REQUEST_NOT_EDITABLE" });
    }
    if (current.bookings.some((booking) => booking.status === "CONFIRMED")) {
      return reply.status(409).send({ error: "REQUEST_ALREADY_CONFIRMED" });
    }

    const merged = {
      corridorId: body.data.corridorId ?? current.corridorId,
      fromStopId: body.data.fromStopId ?? current.fromStopId,
      toStopId: body.data.toStopId ?? current.toStopId,
      windowStart: body.data.windowStart ? new Date(body.data.windowStart) : current.windowStart,
      windowEnd: body.data.windowEnd ? new Date(body.data.windowEnd) : current.windowEnd,
      proposedPrice: body.data.proposedPrice ?? current.proposedPrice,
    };
    if (merged.windowStart >= merged.windowEnd || merged.windowStart <= new Date()) {
      return reply.status(400).send({ error: "INVALID_REQUEST_WINDOW" });
    }
    const corridor = await prisma.corridor.findUnique({
      where: { id: merged.corridorId },
      select: { id: true },
    });
    if (!corridor) return reply.status(404).send({ error: "CORRIDOR_NOT_FOUND" });
    const stops = await prisma.stop.findMany({
      where: { corridorId: merged.corridorId, id: { in: [merged.fromStopId, merged.toStopId] } },
      select: { id: true, position: true },
    });
    const positions = new Map(stops.map((stop) => [stop.id, stop.position]));
    if (stops.length !== 2 || positions.get(merged.fromStopId)! >= positions.get(merged.toStopId)!) {
      return reply.status(400).send({ error: "INVALID_REQUEST_STOPS" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.booking.updateMany({
        where: { requestId: current.id, status: { in: ["PROPOSED_BY_CLIENT", "PROPOSED_BY_DRIVER"] } },
        data: { status: "CANCELLED" },
      });
      return tx.tripRequest.update({ where: { id: current.id }, data: merged });
    });
    const driverIds = current.bookings.map((booking) => booking.trip.driverId);
    void notifier.notifyUsers(driverIds, {
      title: "Demande modifiée",
      body: "Le client a modifié sa demande de trajet.",
      data: { url: "/demandes", requestId: current.id },
    }).catch((error) => request.log.error(error, "Échec de notification de modification"));
    if (merged.corridorId !== current.corridorId) {
      void notifier.notifyDriversOnCorridor(merged.corridorId, {
        title: "Nouvelle demande sur votre itinéraire",
        body: `Un client propose ${merged.proposedPrice.toLocaleString("fr-FR")} FCFA.`,
        data: { url: "/demandes", requestId: current.id },
      }).catch((error) => request.log.error(error, "Échec de notification du nouvel itinéraire"));
    }
    return reply.send(updated);
  });

  app.post("/trip-requests/:requestId/cancel", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, [
      "CLIENT",
    ]);
    if (!principal) return;
    const params = requestParamsSchema.safeParse(request.params);
    if (!params.success) return invalidInput(reply, params.error);

    const tripRequest = await prisma.tripRequest.findUnique({
      where: { id: params.data.requestId },
    });
    if (!tripRequest)
      return reply.status(404).send({ error: "REQUEST_NOT_FOUND" });
    if (tripRequest.clientId !== principal.userId) {
      return reply.status(403).send({ error: "REQUEST_ACTION_FORBIDDEN" });
    }
    if (tripRequest.status !== "OPEN" && tripRequest.status !== "MATCHED") {
      return reply.status(409).send({ error: "REQUEST_NOT_CANCELLABLE" });
    }

    const activeBookings = await prisma.booking.findMany({
      where: {
        requestId: tripRequest.id,
        status: { in: ["PROPOSED_BY_CLIENT", "PROPOSED_BY_DRIVER", "CONFIRMED"] },
      },
      select: { status: true, trip: { select: { driverId: true } } },
    });
    if (activeBookings.some((booking) => booking.status === "CONFIRMED")) {
      return reply.status(409).send({ error: "REQUEST_ALREADY_CONFIRMED" });
    }
    const cancelled = await prisma.$transaction(async (tx) => {
      await tx.booking.updateMany({
        where: { requestId: tripRequest.id, status: { in: ["PROPOSED_BY_CLIENT", "PROPOSED_BY_DRIVER"] } },
        data: { status: "CANCELLED" },
      });
      return tx.tripRequest.update({
        where: { id: tripRequest.id },
        data: { status: "CANCELLED" },
      });
    });
    void notifier.notifyUsers(activeBookings.map((booking) => booking.trip.driverId), {
      title: "Demande annulée",
      body: "Le client a annulé sa demande.",
      data: { url: "/demandes", requestId: tripRequest.id },
    }).catch((error) => request.log.error(error, "Échec de notification d’annulation"));
    return reply.send(cancelled);
  });
}
