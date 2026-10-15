import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import { authenticationAs } from "../test-utils/authentication.js";

const apps: ReturnType<typeof buildApp>[] = [];
const authorization = { authorization: "Bearer test-token" };

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("appareils push et position du trajet", () => {
  it("enregistre un jeton Expo pour l'utilisateur connecté", async () => {
    const device = { id: "device-1", token: "ExpoPushToken[test]", platform: "ANDROID" };
    const prisma = { pushDevice: { upsert: vi.fn().mockResolvedValue(device) } };
    const app = buildApp({
      prisma: prisma as unknown as PrismaClient,
      authentication: authenticationAs("client-1", "CLIENT"),
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/push-devices",
      headers: authorization,
      payload: { token: device.token, platform: "ANDROID" },
    });

    expect(response.statusCode).toBe(201);
    expect(prisma.pushDevice.upsert).toHaveBeenCalledWith({
      where: { token: device.token },
      create: { userId: "client-1", token: device.token, platform: "ANDROID" },
      update: { userId: "client-1", platform: "ANDROID", enabled: true },
    });
  });

  it("autorise uniquement le chauffeur du trajet à publier une position valide", async () => {
    const location = { tripId: "trip-1", latitude: 4.0511, longitude: 9.7679 };
    const prisma = {
      trip: { findUnique: vi.fn().mockResolvedValue({ driverId: "driver-1", status: "OPEN" }) },
      tripLocation: { upsert: vi.fn().mockResolvedValue(location) },
    };
    const app = buildApp({
      prisma: prisma as unknown as PrismaClient,
      authentication: authenticationAs("driver-1", "DRIVER"),
    });
    apps.push(app);

    const response = await app.inject({
      method: "PUT",
      url: "/trips/trip-1/location",
      headers: authorization,
      payload: { latitude: 4.0511, longitude: 9.7679, accuracy: 12, heading: null },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(location);
  });

  it("renvoie l'itinéraire géolocalisé à un client confirmé", async () => {
    const route = {
      id: "trip-1",
      driverId: "driver-1",
      bookings: [{ id: "booking-1" }],
      tripStops: [
        {
          sequence: 0,
          stop: {
            id: "stop-1",
            name: "Bonabéri Centre",
            latitude: 4.079,
            longitude: 9.6666,
            meetingInstructions: "Devant la mairie de Douala IV.",
          },
        },
      ],
    };
    const prisma = { trip: { findUnique: vi.fn().mockResolvedValue(route) } };
    const app = buildApp({
      prisma: prisma as unknown as PrismaClient,
      authentication: authenticationAs("client-1", "CLIENT"),
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/trips/trip-1/route",
      headers: authorization,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: route.id,
      driverId: route.driverId,
      tripStops: route.tripStops,
    });
    expect(prisma.trip.findUnique).toHaveBeenCalledWith({
      where: { id: "trip-1" },
      include: {
        fares: true,
        tripStops: {
          orderBy: { sequence: "asc" },
          include: { stop: true },
        },
        bookings: {
          where: { clientId: "client-1", status: "CONFIRMED" },
          select: { id: true },
          take: 1,
        },
      },
    });
  });
});
