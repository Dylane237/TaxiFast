import rateLimit, { type RateLimitPluginOptions } from "@fastify/rate-limit";
import type { FastifyInstance, RouteShorthandOptions } from "fastify";

type Limite = { max: number; timeWindow: string };

/**
 * Limites par adresse IP. Elles protègent les routes qui coûtent (SMS, notifications
 * envoyées à tous les chauffeurs d'un axe) et rendent le forçage de code OTP impraticable.
 * Le compteur est en mémoire : avec plusieurs instances du serveur, il faudra un stockage partagé.
 */
export const LIMITES = {
  global: { max: 300, timeWindow: "1 minute" },
  demandeOtp: { max: 5, timeWindow: "15 minutes" },
  verificationOtp: { max: 10, timeWindow: "15 minutes" },
  demandeTrajet: { max: 20, timeWindow: "1 hour" },
  proposition: { max: 40, timeWindow: "1 hour" },
} satisfies Record<string, Limite>;

export function enregistrerLimiteDebit(app: FastifyInstance): void {
  const options: RateLimitPluginOptions = {
    global: true,
    ...LIMITES.global,
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: "RATE_LIMITED",
      retryAfterSeconds: Math.ceil(context.ttl / 1000),
    }),
  };
  app.register(rateLimit, options);
}

/** Options de route qui remplacent la limite globale par une limite plus stricte. */
export function limiteRoute(limite: Limite): RouteShorthandOptions {
  return { config: { rateLimit: limite } };
}

/**
 * Lit TRUST_PROXY (true, ou les adresses du proxy séparées par des virgules).
 * Derrière un proxy (Render, Nginx…), sans cette option, toutes les requêtes semblent
 * venir du proxy et partageraient la même limite.
 */
export function lireTrustProxy(valeur: string | undefined): boolean | string {
  if (!valeur || valeur === "false") return false;
  if (valeur === "true") return true;
  return valeur;
}
