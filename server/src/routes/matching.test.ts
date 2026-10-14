import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import type { Matching } from "../services/matching.js";
import { authenticationAs } from "../test-utils/authentication.js";

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("routes de matching", () => {
  it("retourne au client les trajets correspondant à sa demande", async () => {
    const matching: Matching = {
      findTripsForRequest: vi.fn().mockResolvedValue([{ id: "trip-1" }]),
      findRequestsForTrip: vi.fn(),
    };
    const app = buildApp({
      prisma: {} as PrismaClient,
      authentication: authenticationAs("client-1", "CLIENT"),
      matching,
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/matching/requests/request-1/trips",
      headers: { authorization: "Bearer test-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ trips: [{ id: "trip-1" }] });
    expect(matching.findTripsForRequest).toHaveBeenCalledWith("request-1", "client-1");
  });

  it("retourne au chauffeur les demandes correspondant à son trajet", async () => {
    const matching: Matching = {
      findTripsForRequest: vi.fn(),
      findRequestsForTrip: vi.fn().mockResolvedValue([{ id: "request-1" }]),
    };
    const app = buildApp({
      prisma: {} as PrismaClient,
      authentication: authenticationAs("driver-1", "DRIVER"),
      matching,
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/matching/trips/trip-1/requests",
      headers: { authorization: "Bearer test-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ requests: [{ id: "request-1" }] });
    expect(matching.findRequestsForTrip).toHaveBeenCalledWith("trip-1", "driver-1");
  });
});
