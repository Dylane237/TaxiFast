import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  AuthenticationError,
  type Authentication,
} from "../services/authentication.js";

const phoneSchema = z.string().trim().regex(/^\+[1-9]\d{7,14}$/, {
  message: "Le téléphone doit être au format international E.164",
});

const requestOtpSchema = z.object({
  phone: phoneSchema,
});

const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/),
  role: z.enum(["CLIENT", "DRIVER"]).optional(),
});

function invalidInput(reply: FastifyReply, error: z.ZodError) {
  return reply.status(400).send({
    error: "INVALID_INPUT",
    details: z.treeifyError(error),
  });
}

function authenticationError(reply: FastifyReply, error: AuthenticationError) {
  if (error.code === "OTP_RATE_LIMITED") {
    return reply.status(429).send({ error: error.code });
  }
  if (error.code === "ROLE_REQUIRED") {
    return reply.status(400).send({ error: error.code });
  }
  return reply.status(401).send({ error: error.code });
}

export function registerAuthRoutes(app: FastifyInstance, authentication: Authentication): void {
  app.post("/auth/otp/request", async (request, reply) => {
    const parsed = requestOtpSchema.safeParse(request.body);
    if (!parsed.success) return invalidInput(reply, parsed.error);

    try {
      await authentication.requestOtp(parsed.data);
      return reply.status(202).send({ status: "OTP_SENT" });
    } catch (error) {
      if (error instanceof AuthenticationError) return authenticationError(reply, error);
      throw error;
    }
  });

  app.post("/auth/otp/verify", async (request, reply) => {
    const parsed = verifyOtpSchema.safeParse(request.body);
    if (!parsed.success) return invalidInput(reply, parsed.error);

    try {
      return reply.send(await authentication.verifyOtp(parsed.data));
    } catch (error) {
      if (error instanceof AuthenticationError) return authenticationError(reply, error);
      throw error;
    }
  });
}
