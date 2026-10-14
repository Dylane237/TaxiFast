import { describe, expect, it } from "vitest";
import type { TripManifest } from "@/api";
import { buildTripTimeline, parseTripId } from "./active-trip";

const manifest: TripManifest = {
  trip: {
    id: "trip-1",
    driverId: "driver-1",
    corridorId: "corridor-1",
    capacity: 2,
    departureAt: "2026-10-13T12:00:00.000Z",
    status: "OPEN",
    createdAt: "2026-10-13T10:00:00.000Z",
    tripStops: ["Départ", "Milieu", "Arrivée"].map((name, sequence) => ({
      id: `trip-stop-${sequence}`,
      tripId: "trip-1",
      stopId: `stop-${sequence}`,
      sequence,
      stop: {
        id: `stop-${sequence}`,
        corridorId: "corridor-1",
        name,
        position: sequence,
        latitude: null,
        longitude: null,
        meetingInstructions: null,
      },
    })),
  },
  passengers: [
    { bookingId: "booking-1", clientId: "client-1", clientName: "Nadia", pickupStopId: "stop-0", dropoffStopId: "stop-1" },
    { bookingId: "booking-2", clientId: "client-2", clientName: "Patrick", pickupStopId: "stop-1", dropoffStopId: "stop-2" },
  ],
};

describe("trajet en cours", () => {
  it("calcule les montées, descentes et places restantes par tronçon", () => {
    const timeline = buildTripTimeline(manifest);

    expect(timeline[0]).toMatchObject({ boarding: ["Nadia"], leaving: [], occupiedAfter: 1, availableAfter: 1 });
    expect(timeline[1]).toMatchObject({ boarding: ["Patrick"], leaving: ["Nadia"], occupiedAfter: 1, availableAfter: 1 });
    expect(timeline[2]).toMatchObject({ boarding: [], leaving: ["Patrick"], occupiedAfter: null, availableAfter: null });
  });

  it("refuse un identifiant de trajet vide", () => {
    expect(parseTripId(" trip-1 ")).toBe("trip-1");
    expect(parseTripId(" ")).toBeNull();
    expect(parseTripId(undefined)).toBeNull();
  });
});
