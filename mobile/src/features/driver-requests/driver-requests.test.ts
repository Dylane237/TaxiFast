import { describe, expect, it } from "vitest";
import type { Booking, Trip } from "@/api";
import { parseCounterPrice, selectDriverRequests } from "./driver-requests";

const trip = {
  id: "trip-1",
  driverId: "driver-1",
  corridorId: "corridor-1",
  capacity: 3,
  departureAt: "2026-10-12T12:00:00.000Z",
  availableUntil: "2026-10-12T14:00:00.000Z",
  availabilityMode: "SCHEDULED",
  status: "OPEN",
  createdAt: "2026-10-12T10:00:00.000Z",
  fares: [],
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
} satisfies Trip;

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking-1",
    tripId: "trip-1",
    clientId: "client-1",
    requestId: "request-1",
    pickupStopId: "stop-0",
    dropoffStopId: "stop-2",
    initiatedBy: "CLIENT",
    status: "PROPOSED_BY_CLIENT",
    proposedPrice: 1500,
    counterPrice: null,
    agreedPrice: null,
    commission: null,
    expiresAt: null,
    createdAt: "2026-10-12T10:00:00.000Z",
    updatedAt: "2026-10-12T10:00:00.000Z",
    ...overrides,
  };
}

describe("demandes chauffeur", () => {
  it("ne garde que les propositions dont le tronçon appartient au trajet ouvert", () => {
    const result = selectDriverRequests([
      booking(),
      booking({ id: "confirmed", status: "CONFIRMED" }),
      booking({ id: "reverse", pickupStopId: "stop-2", dropoffStopId: "stop-0" }),
      booking({ id: "outside", dropoffStopId: "other-stop" }),
    ], [trip]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ pickupName: "Départ", dropoffName: "Arrivée" });
  });

  it("valide une contre-proposition entière et positive en FCFA", () => {
    expect(parseCounterPrice("1 800")).toBe(1800);
    expect(parseCounterPrice("0")).toBeNull();
    expect(parseCounterPrice("12,50")).toBeNull();
  });
});
