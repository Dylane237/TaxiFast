import { PrismaClient } from "@prisma/client";
import Fastify from "fastify";
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
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });
  const prisma = options.prisma ?? new PrismaClient();
  const authentication =
    options.authentication ?? createDefaultAuthentication(prisma);
  const notifier =
    options.notifier ??
    (process.env.NODE_ENV === "test"
      ? new NoopNotifier()
      : new ExpoPushNotifier(prisma));

  app.get("/health", async () => ({ status: "ok" }));
  registerAuthRoutes(app, authentication);
  registerAccountRoutes(app, prisma, authentication);
  registerCorridorRoutes(app, prisma, authentication);
  registerDeviceRoutes(app, prisma, authentication);
  registerLocationRoutes(app, prisma, authentication);
  registerTripRoutes(app, prisma, authentication, notifier);
  registerTripRequestRoutes(app, prisma, authentication, notifier);
  registerBookingRoutes(
    app,
    prisma,
    options.confirmBooking ?? confirmBooking,
    authentication,
    notifier,
  );
  registerMatchingRoutes(
    app,
    options.matching ?? new PrismaMatchingService(prisma),
    authentication,
  );
  registerRatingAndWalletRoutes(app, prisma, authentication);

  if (!options.prisma) {
    app.addHook("onClose", async () => {
      await prisma.$disconnect();
    });
  }

  return app;
}
