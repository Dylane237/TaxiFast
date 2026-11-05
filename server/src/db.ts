import { PrismaClient } from "@prisma/client";

/**
 * Délais des transactions interactives (réservation, modification de trajet…).
 * Le défaut de Prisma (5 s) suppose une base à côté du serveur. Avec la base Neon à Francfort
 * et le serveur lancé depuis un PC au Cameroun, chaque requête fait environ 235 ms aller-retour :
 * une transaction d'une vingtaine de requêtes dépassait les 5 s et échouait.
 */
export const OPTIONS_TRANSACTION = { maxWait: 10_000, timeout: 20_000 } as const;

export function creerPrisma(): PrismaClient {
  return new PrismaClient({ transactionOptions: OPTIONS_TRANSACTION });
}
