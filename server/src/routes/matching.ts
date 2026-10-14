import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { requireUser } from "../http/authorization.js";
import type { Authentication } from "../services/authentication.js";
import { MatchingError, type Matching } from "../services/matching.js";

const requestParamsSchema = z.object({
  requestId: z.string().trim().min(1),
});

const tripParamsSchema = z.object({
  tripId: z.string().trim().min(1),
});

function invalidInput(reply: FastifyReply, error: z.ZodError) {
  return reply.status(400).send({
    error: "INVALID_INPUT",
    details: z.treeifyError(error),
  });
}

function matchingError(reply: FastifyReply, error: MatchingError) {
  if (error.code === "SOURCE_NOT_FOUND") return reply.status(404).send({ error: error.code });
  if (error.code === "SOURCE_FORBIDDEN") return reply.status(403).send({ error: error.code });
  return reply.status(409).send({ error: error.code });
}

export function registerMatchingRoutes(
  app: FastifyInstance,
  matching: Matching,
  authentication: Authentication,
): void {
  app.get("/matching/requests/:requestId/trips", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, ["CLIENT"]);
    if (!principal) return;

    const params = requestParamsSchema.safeParse(request.params);
    if (!params.success) return invalidInput(reply, params.error);

    try {
      const trips = await matching.findTripsForRequest(params.data.requestId, principal.userId);
      return reply.send({ trips });
    } catch (error) {
      if (error instanceof MatchingError) return matchingError(reply, error);
      throw error;
    }
  });

  app.get("/matching/trips/:tripId/requests", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, ["DRIVER"]);
    if (!principal) return;

    const params = tripParamsSchema.safeParse(request.params);
    if (!params.success) return invalidInput(reply, params.error);

    try {
      const requests = await matching.findRequestsForTrip(params.data.tripId, principal.userId);
      return reply.send({ requests });
    } catch (error) {
      if (error instanceof MatchingError) return matchingError(reply, error);
      throw error;
    }
  });
}
