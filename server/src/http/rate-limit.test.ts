import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import { MAX_DEMANDES_OUVERTES } from "../routes/trip-requests.js";
import type { Authentication } from "../services/authentication.js";
import { authenticationAs } from "../test-utils/authentication.js";
import { LIMITES, lireTrustProxy } from "./rate-limit.js";

const apps: ReturnType<typeof buildApp>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function application(options: Parameters<typeof buildApp>[0]) {
  const app = buildApp(options);
  apps.push(app);
  return app;
}

describe("limite de débit par adresse IP", () => {
  it("bloque les demandes de code OTP au-delà de la limite, même pour des numéros différents", async () => {
    const requestOtp = vi.fn().mockResolvedValue(undefined);
    const authentication = { ...authenticationAs("x", "CLIENT"), requestOtp } as Authentication;
    const app = application({ prisma: {} as PrismaClient, authentication });

    const statuts: number[] = [];
    for (let i = 0; i <= LIMITES.demandeOtp.max; i += 1) {
      const response = await app.inject({
        method: "POST",
        url: "/auth/otp/request",
        payload: { phone: `+23769000000${i}` },
      });
      statuts.push(response.statusCode);
    }

    expect(statuts.slice(0, LIMITES.demandeOtp.max).every((statut) => statut === 202)).toBe(true);
    const bloquee = await app.inject({ method: "POST", url: "/auth/otp/request", payload: { phone: "+237690000099" } });
    expect(bloquee.statusCode).toBe(429);
    expect(bloquee.json()).toMatchObject({ error: "RATE_LIMITED" });
    expect(requestOtp).toHaveBeenCalledTimes(LIMITES.demandeOtp.max);
  });

  it("laisse passer les routes ordinaires bien au-delà de la limite OTP", async () => {
    const app = application({ prisma: {} as PrismaClient, authentication: authenticationAs("x", "CLIENT") });
    for (let i = 0; i < LIMITES.demandeOtp.max * 3; i += 1) {
      const response = await app.inject({ method: "GET", url: "/health" });
      expect(response.statusCode).toBe(200);
    }
  });
});

describe("plafonds métier", () => {
  it(`refuse une ${MAX_DEMANDES_OUVERTES + 1}e demande ouverte`, async () => {
    const prisma = {
      corridor: { findUnique: vi.fn().mockResolvedValue({ id: "corridor-1" }) },
      stop: { findMany: vi.fn().mockResolvedValue([{ id: "stop-1", position: 1 }, { id: "stop-2", position: 2 }]) },
      tripRequest: { count: vi.fn().mockResolvedValue(MAX_DEMANDES_OUVERTES), create: vi.fn() },
    };
    const app = application({
      prisma: prisma as unknown as PrismaClient,
      authentication: authenticationAs("client-1", "CLIENT"),
    });

    const response = await app.inject({
      method: "POST",
      url: "/trip-requests",
      headers: { authorization: "Bearer test-token" },
      payload: {
        corridorId: "corridor-1",
        fromStopId: "stop-1",
        toStopId: "stop-2",
        windowStart: "2027-01-15T07:00:00+01:00",
        windowEnd: "2027-01-15T08:00:00+01:00",
        proposedPrice: 500,
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: "TOO_MANY_OPEN_REQUESTS" });
    expect(prisma.tripRequest.create).not.toHaveBeenCalled();
  });

  it("refuse une deuxième proposition en attente sur le même trajet", async () => {
    const prisma = {
      trip: {
        findUnique: vi.fn().mockResolvedValue({
          id: "trip-1",
          corridorId: "corridor-1",
          driverId: "driver-1",
          status: "OPEN",
          tripStops: [{ stopId: "stop-1", sequence: 0 }, { stopId: "stop-2", sequence: 1 }],
        }),
      },
      booking: { count: vi.fn().mockResolvedValue(1), create: vi.fn() },
    };
    const app = application({
      prisma: prisma as unknown as PrismaClient,
      authentication: authenticationAs("client-1", "CLIENT"),
    });

    const response = await app.inject({
      method: "POST",
      url: "/bookings",
      headers: { authorization: "Bearer test-token" },
      payload: { tripId: "trip-1", pickupStopId: "stop-1", dropoffStopId: "stop-2", proposedPrice: 750 },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: "BOOKING_ALREADY_PENDING" });
    expect(prisma.booking.create).not.toHaveBeenCalled();
  });
});

describe("lecture de TRUST_PROXY", () => {
  it("ne fait confiance à aucun proxy par défaut", () => {
    expect(lireTrustProxy(undefined)).toBe(false);
    expect(lireTrustProxy("false")).toBe(false);
  });

  it("accepte true ou une liste d'adresses", () => {
    expect(lireTrustProxy("true")).toBe(true);
    expect(lireTrustProxy("10.0.0.1,10.0.0.2")).toBe("10.0.0.1,10.0.0.2");
  });
});
