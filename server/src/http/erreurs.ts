import type { FastifyError, FastifyInstance } from "fastify";

type ErreurLimite = { statusCode?: number; retryAfterSeconds?: number };

/**
 * Dernier filet pour les erreurs que les routes ne gèrent pas elles-mêmes.
 * Le client ne reçoit qu'un code stable : jamais le message brut (Prisma, pile d'appels,
 * chemins de fichiers, extraits de requêtes). Le détail complet reste dans les journaux du serveur.
 */
export function enregistrerGestionErreurs(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const statut = typeof error.statusCode === "number" ? error.statusCode : 500;

    // La limite de débit lève sa propre réponse (voir rate-limit.ts) : on garde son format.
    if (statut === 429) {
      const { retryAfterSeconds } = error as unknown as ErreurLimite;
      return reply.status(429).send({ error: "RATE_LIMITED", retryAfterSeconds });
    }

    // Requête mal formée vue par Fastify (JSON illisible, corps trop gros, type non pris en charge…).
    if (statut >= 400 && statut < 500) {
      return reply.status(statut).send({ error: "INVALID_INPUT" });
    }

    request.log.error({ err: error }, "Erreur interne");
    return reply.status(500).send({ error: "INTERNAL_ERROR" });
  });
}
