import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "../src/app.js";
import { seedCorridors } from "../src/seeds/corridors.js";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL est requis");
process.env.DEV_OTP_CODE = "123456";

const prisma = new PrismaClient();
await seedCorridors(prisma);
const app = buildApp({ prisma });

try {
  const address = await app.listen({ host: "127.0.0.1", port: 0 });
  process.env.EXPO_PUBLIC_API_URL = address;
  const { httpApi } = await import("../../mobile/src/api/httpApi.ts");

  const clientPhone = "+237699990001";
  const driverPhone = "+237699990002";

  await httpApi.requestOtp(clientPhone);
  const clientSession = await httpApi.verifyOtp(
    clientPhone,
    "123456",
    "CLIENT",
  );
  const client = await httpApi.updateProfile({ name: "Cliente E2E" });
  const corridors = await httpApi.listCorridors();
  assert.ok(corridors.length > 0, "Le seed doit fournir au moins un axe");
  const corridor = corridors[0]!;
  assert.ok(
    corridor.stops.length >= 2,
    "L'axe doit fournir au moins deux arrêts",
  );
  const fromStop = corridor.stops[0]!;
  const toStop = corridor.stops[1]!;
  const departureAt = new Date(Date.now() + 60 * 60_000);
  let tripRequest = await httpApi.createTripRequest({
    corridorId: corridor.id,
    fromStopId: fromStop.id,
    toStopId: toStop.id,
    windowStart: new Date(departureAt.getTime() - 30 * 60_000).toISOString(),
    windowEnd: new Date(departureAt.getTime() + 30 * 60_000).toISOString(),
    proposedPrice: 1_500,
  });
  assert.equal(tripRequest.clientId, client.id);
  tripRequest = await httpApi.updateTripRequest(tripRequest.id, {
    proposedPrice: 1_600,
  });
  assert.equal(tripRequest.proposedPrice, 1_600);

  await httpApi.signOut();
  await httpApi.requestOtp(driverPhone);
  const driverSession = await httpApi.verifyOtp(
    driverPhone,
    "123456",
    "DRIVER",
  );
  await httpApi.updateProfile({
    name: "Chauffeur E2E",
    plate: "E2E 001",
    model: "Toyota",
    seats: 4,
  });
  let trip = await httpApi.createTrip({
    corridorId: corridor.id,
    capacity: 4,
    departureAt: departureAt.toISOString(),
    stopIds: corridor.stops.map((stop) => stop.id),
  });
  const updatedStopIds = corridor.stops.length > 2
    ? corridor.stops.slice(0, -1).map((stop) => stop.id)
    : corridor.stops.map((stop) => stop.id);
  trip = await httpApi.updateTrip(trip.id, {
    capacity: 3,
    departureAt: new Date(departureAt.getTime() + 5 * 60_000).toISOString(),
    stopIds: updatedStopIds,
  });
  assert.equal(trip.capacity, 3);
  assert.deepEqual(trip.tripStops.map((stop) => stop.stopId), updatedStopIds);
  const matchedRequests = await httpApi.listRequestsForTrip(trip.id);
  assert.ok(matchedRequests.some((item) => item.id === tripRequest.id));

  await httpApi.restoreSession(clientSession.token, client);
  const matchedTrips = await httpApi.listTripsForRequest(tripRequest.id);
  assert.ok(matchedTrips.some((item) => item.id === trip.id));
  const proposal = await httpApi.proposeBooking({
    tripId: trip.id,
    requestId: tripRequest.id,
    pickupStopId: fromStop.id,
    dropoffStopId: toStop.id,
    proposedPrice: 1_600,
  });

  await httpApi.restoreSession(driverSession.token, {
    ...driverSession.user,
    vehicle: null,
  });
  const confirmed = await httpApi.acceptBooking(proposal.id);
  assert.equal(confirmed.status, "CONFIRMED");
  const manifest = await httpApi.getTripManifest(trip.id);
  assert.ok(
    manifest.passengers.some((passenger) => passenger.clientId === client.id),
  );
  const completedTrip = await httpApi.closeTrip(trip.id);
  assert.equal(completedTrip.status, "COMPLETED");

  await httpApi.restoreSession(clientSession.token, client);
  const details = await httpApi.getBookingDetails(proposal.id);
  assert.equal(details.booking.status, "COMPLETED");
  const rating = await httpApi.createRating({
    bookingId: proposal.id,
    targetId: driverSession.user.id,
    score: 5,
    comment: "Scénario E2E validé",
  });
  assert.equal(rating.score, 5);

  console.log("Scénario E2E mobile/API/PostgreSQL validé.");
} finally {
  await app.close();
  await prisma.$disconnect();
}
