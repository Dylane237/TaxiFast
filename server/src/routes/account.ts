import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { requireUser } from "../http/authorization.js";
import type { Authentication } from "../services/authentication.js";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  plate: z.string().trim().min(2).max(30).optional(),
  model: z.string().trim().min(2).max(80).optional(),
  seats: z.number().int().min(1).max(8).optional(),
});

function invalidInput(reply: FastifyReply, error: z.ZodError) {
  return reply
    .status(400)
    .send({ error: "INVALID_INPUT", details: z.treeifyError(error) });
}

const profileSelection = {
  id: true,
  phone: true,
  name: true,
  role: true,
  vehicle: true,
} as const;

export function registerAccountRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  authentication: Authentication,
): void {
  app.get("/me", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication);
    if (!principal) return;

    const user = await prisma.user.findUnique({
      where: { id: principal.userId },
      select: profileSelection,
    });
    if (!user) return reply.status(404).send({ error: "USER_NOT_FOUND" });
    return reply.send(user);
  });

  app.patch("/me", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication);
    if (!principal) return;

    const parsed = profileSchema.safeParse(request.body);
    if (!parsed.success) return invalidInput(reply, parsed.error);
    const { name, plate, model, seats } = parsed.data;
    if (principal.role === "DRIVER" && (!plate || !seats)) {
      return reply.status(400).send({ error: "INVALID_DRIVER_PROFILE" });
    }

    const user = await prisma.user.update({
      where: { id: principal.userId },
      data: {
        name,
        ...(principal.role === "DRIVER"
          ? {
              vehicle: {
                upsert: {
                  create: {
                    plate: plate!,
                    model: model ?? null,
                    seats: seats!,
                  },
                  update: {
                    plate: plate!,
                    model: model ?? null,
                    seats: seats!,
                  },
                },
              },
            }
          : {}),
      },
      select: profileSelection,
    });
    return reply.send(user);
  });
}
