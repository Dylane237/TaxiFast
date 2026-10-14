import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { requireUser } from "../http/authorization.js";
import type { Authentication } from "../services/authentication.js";

const ratingSchema = z.object({
  bookingId: z.string().trim().min(1),
  targetId: z.string().trim().min(1),
  score: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

function invalidInput(reply: FastifyReply, error: z.ZodError) {
  return reply
    .status(400)
    .send({ error: "INVALID_INPUT", details: z.treeifyError(error) });
}

export function registerRatingAndWalletRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  authentication: Authentication,
): void {
  app.post("/ratings", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, [
      "CLIENT",
      "DRIVER",
    ]);
    if (!principal) return;
    const parsed = ratingSchema.safeParse(request.body);
    if (!parsed.success) return invalidInput(reply, parsed.error);

    const booking = await prisma.booking.findUnique({
      where: { id: parsed.data.bookingId },
      select: {
        clientId: true,
        status: true,
        trip: { select: { driverId: true } },
      },
    });
    if (!booking) return reply.status(404).send({ error: "BOOKING_NOT_FOUND" });
    if (booking.status !== "COMPLETED") {
      return reply.status(409).send({ error: "RATING_NOT_ALLOWED" });
    }
    const expectedTarget =
      principal.userId === booking.clientId
        ? booking.trip.driverId
        : principal.userId === booking.trip.driverId
          ? booking.clientId
          : null;
    if (!expectedTarget || parsed.data.targetId !== expectedTarget) {
      return reply.status(403).send({ error: "RATING_ACTION_FORBIDDEN" });
    }
    const previous = await prisma.rating.findUnique({
      where: {
        bookingId_authorId: {
          bookingId: parsed.data.bookingId,
          authorId: principal.userId,
        },
      },
      select: { id: true },
    });
    if (previous)
      return reply.status(409).send({ error: "RATING_ALREADY_EXISTS" });

    const rating = await prisma.rating.create({
      data: {
        bookingId: parsed.data.bookingId,
        authorId: principal.userId,
        targetId: parsed.data.targetId,
        score: parsed.data.score,
        comment: parsed.data.comment ?? null,
      },
    });
    return reply.status(201).send(rating);
  });

  app.get("/wallet", async (request, reply) => {
    const principal = await requireUser(request, reply, authentication, [
      "DRIVER",
    ]);
    if (!principal) return;
    const transactions = await prisma.walletTransaction.findMany({
      where: { userId: principal.userId },
      orderBy: { createdAt: "desc" },
    });
    const balance = transactions.reduce(
      (total, item) => total + item.amount,
      0,
    );
    const earnings = transactions
      .filter((item) => item.type === "PAYOUT")
      .reduce((total, item) => total + item.amount, 0);
    const commissions = Math.abs(
      transactions
        .filter((item) => item.type === "COMMISSION")
        .reduce((total, item) => total + item.amount, 0),
    );
    return reply.send({ balance, earnings, commissions, transactions });
  });
}
