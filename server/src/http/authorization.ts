import type { Role } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  AuthenticationError,
  type AuthenticatedPrincipal,
  type Authentication,
} from "../services/authentication.js";

const authorizationSchema = z
  .string()
  .regex(/^Bearer\s+\S+$/)
  .transform((header) => header.replace(/^Bearer\s+/, ""));

export async function requireUser(
  request: FastifyRequest,
  reply: FastifyReply,
  authentication: Authentication,
  allowedRoles?: Role[],
): Promise<AuthenticatedPrincipal | null> {
  const authorization = authorizationSchema.safeParse(request.headers.authorization);
  if (!authorization.success) {
    await reply.status(401).send({ error: "AUTHENTICATION_REQUIRED" });
    return null;
  }

  try {
    const principal = await authentication.authenticate(authorization.data);
    if (allowedRoles && !allowedRoles.includes(principal.role)) {
      await reply.status(403).send({ error: "ROLE_FORBIDDEN" });
      return null;
    }
    return principal;
  } catch (error) {
    if (error instanceof AuthenticationError && error.code === "TOKEN_INVALID") {
      await reply.status(401).send({ error: error.code });
      return null;
    }
    throw error;
  }
}
