import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { requireUser } from "../http/authorization.js";
import type { Authentication } from "../services/authentication.js";

export function registerCorridorRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  authentication: Authentication,
): void {
  app.get("/corridors", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, [
      "CLIENT",
      "DRIVER",
    ]);
    if (!principal) return;

    const corridors = await prisma.corridor.findMany({
      orderBy: { name: "asc" },
      include: { stops: { orderBy: { position: "asc" } } },
    });
    return reply.send({ corridors });
  });
}
