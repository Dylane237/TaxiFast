import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { requireUser } from "../http/authorization.js";
import type { Authentication } from "../services/authentication.js";

const deviceSchema = z.object({
  token: z.string().trim().regex(/^(Expo|Exponent)PushToken\[.+\]$/),
  platform: z.enum(["ANDROID", "IOS"]),
});

function invalidInput(reply: FastifyReply, error: z.ZodError) {
  return reply.status(400).send({ error: "INVALID_INPUT", details: z.treeifyError(error) });
}

export function registerDeviceRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  authentication: Authentication,
): void {
  app.post("/push-devices", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, ["CLIENT", "DRIVER"]);
    if (!principal) return;
    const parsed = deviceSchema.safeParse(request.body);
    if (!parsed.success) return invalidInput(reply, parsed.error);

    const device = await prisma.pushDevice.upsert({
      where: { token: parsed.data.token },
      create: { userId: principal.userId, ...parsed.data },
      update: { userId: principal.userId, platform: parsed.data.platform, enabled: true },
    });
    return reply.status(201).send(device);
  });

  app.delete("/push-devices", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, ["CLIENT", "DRIVER"]);
    if (!principal) return;
    const parsed = deviceSchema.pick({ token: true }).safeParse(request.body);
    if (!parsed.success) return invalidInput(reply, parsed.error);

    await prisma.pushDevice.updateMany({
      where: { token: parsed.data.token, userId: principal.userId },
      data: { enabled: false },
    });
    return reply.status(204).send();
  });
}
