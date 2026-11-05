import type { PrismaClient } from "@prisma/client";
import Fastify, { type FastifyPluginAsync } from "fastify";
import { creerPrisma } from "./db.js";
import { enregistrerGestionErreurs } from "./http/erreurs.js";
import { enregistrerLimiteDebit, lireTrustProxy } from "./http/rate-limit.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerAccountRoutes } from "./routes/account.js";
import {
  registerBookingRoutes,
  type ConfirmBooking,
} from "./routes/bookings.js";
import { registerCorridorRoutes } from "./routes/corridors.js";
import { registerDeviceRoutes } from "./routes/devices.js";
import { registerLocationRoutes } from "./routes/locations.js";
import { registerMatchingRoutes } from "./routes/matching.js";
import { registerRatingAndWalletRoutes } from "./routes/ratings-wallet.js";
import { registerTripRequestRoutes } from "./routes/trip-requests.js";
import { registerTripRoutes } from "./routes/trips.js";
import {
  createDefaultAuthentication,
  type Authentication,
} from "./services/authentication.js";
import { confirmBooking } from "./services/booking-confirmation.js";
import { PrismaMatchingService, type Matching } from "./services/matching.js";
import {
  ExpoPushNotifier,
  NoopNotifier,
  type Notifier,
} from "./services/notifications.js";

type BuildAppOptions = {
  prisma?: PrismaClient;
  confirmBooking?: ConfirmBooking;
  authentication?: Authentication;
  matching?: Matching;
  notifier?: Notifier;
};

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test",
    trustProxy: lireTrustProxy(process.env.TRUST_PROXY),
  });
  const prisma = options.prisma ?? creerPrisma();
  const authentication =
    options.authentication ?? createDefaultAuthentication(prisma);
  const notifier =
    options.notifier ??
    (process.env.NODE_ENV === "test"
      ? new NoopNotifier()
      : new ExpoPushNotifier(prisma));

  enregistrerGestionErreurs(app);
  enregistrerLimiteDebit(app);
  // Les routes sont déclarées une fois la limite de débit chargée, pour qu'elle s'applique à toutes.
  const declarerRoutes: FastifyPluginAsync = async (routes) => {
    routes.get("/health", async () => ({ status: "ok" }));
    registerAuthRoutes(routes, authentication);
    registerAccountRoutes(routes, prisma, authentication);
    registerCorridorRoutes(routes, prisma, authentication);
    registerDeviceRoutes(routes, prisma, authentication);
    registerLocationRoutes(routes, prisma, authentication);
    registerTripRoutes(routes, prisma, authentication, notifier);
    registerTripRequestRoutes(routes, prisma, authentication, notifier);
    registerBookingRoutes(
      routes,
      prisma,
      options.confirmBooking ?? confirmBooking,
      authentication,
      notifier,
    );
    registerMatchingRoutes(
      routes,
      options.matching ?? new PrismaMatchingService(prisma),
      authentication,
    );
    registerRatingAndWalletRoutes(routes, prisma, authentication);
  };
  app.register(declarerRoutes);

  if (!options.prisma) {
    app.addHook("onClose", async () => {
      await prisma.$disconnect();
    });
  }

  return app;
}
