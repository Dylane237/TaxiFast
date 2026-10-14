import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import { authenticationAs } from "../test-utils/authentication.js";

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("POST /trip-requests", () => {
  it("permet au client de publier une demande de trajet", async () => {
    const prisma = {
      corridor: { findUnique: vi.fn().mockResolvedValue({ id: "corridor-1" }) },
      stop: {
        findMany: vi.fn().mockResolvedValue([
          { id: "stop-1", position: 1 },
          { id: "stop-2", position: 2 },
        ]),
      },
      tripRequest: {
        create: vi.fn().mockResolvedValue({ id: "request-1", status: "OPEN" }),
      },
    };
    const app = buildApp({
      prisma: prisma as unknown as PrismaClient,
      authentication: authenticationAs("client-1", "CLIENT"),
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/trip-requests",
      headers: { authorization: "Bearer test-token" },
      payload: {
        corridorId: "corridor-1",
        fromStopId: "stop-1",
        toStopId: "stop-2",
        windowStart: "2027-01-15T07:00:00+01:00",
        windowEnd: "2027-01-15T09:00:00+01:00",
        proposedPrice: 800,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ id: "request-1", status: "OPEN" });
    expect(prisma.tripRequest.create).toHaveBeenCalledWith({
      data: {
        clientId: "client-1",
        corridorId: "corridor-1",
        fromStopId: "stop-1",
        toStopId: "stop-2",
        windowStart: new Date("2027-01-15T07:00:00+01:00"),
        windowEnd: new Date("2027-01-15T09:00:00+01:00"),
        proposedPrice: 800,
      },
    });
  });

  it("refuse une fenêtre horaire inversée et un prix non entier", async () => {
    const prisma = {
      corridor: { findUnique: vi.fn() },
      stop: { findMany: vi.fn() },
      tripRequest: { create: vi.fn() },
    };
    const app = buildApp({
      prisma: prisma as unknown as PrismaClient,
      authentication: authenticationAs("client-1", "CLIENT"),
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/trip-requests",
      headers: { authorization: "Bearer test-token" },
      payload: {
        corridorId: "corridor-1",
        fromStopId: "stop-1",
        toStopId: "stop-2",
        windowStart: "2027-01-15T09:00:00+01:00",
        windowEnd: "2027-01-15T07:00:00+01:00",
        proposedPrice: 800.5,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("INVALID_INPUT");
    expect(prisma.tripRequest.create).not.toHaveBeenCalled();
  });
});
