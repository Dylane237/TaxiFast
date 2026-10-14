import type {
  Booking,
  Corridor,
  Rating,
  Trip,
  TripRequest,
  UserProfile,
  WalletTransaction,
} from "./types";

export type MockData = {
  users: UserProfile[];
  corridors: Corridor[];
  trips: Trip[];
  requests: TripRequest[];
  bookings: Booking[];
  ratings: Rating[];
  transactions: WalletTransaction[];
};

export const mockIds = {
  client: "client-1",
  secondClient: "client-2",
  driver: "driver-1",
  tripWithOneSeatLeft: "trip-1",
  fullTrip: "trip-3",
  pendingBookingA: "booking-pending-a",
  pendingBookingB: "booking-pending-b",
  counteredBooking: "booking-countered",
} as const;

function iso(offsetMinutes: number): string {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString();
}

export function createMockData(): MockData {
  const users: UserProfile[] = [
    {
      id: "client-1",
      phone: "+237690000001",
      name: "Nadia",
      role: "CLIENT",
      vehicle: null,
    },
    {
      id: "client-2",
      phone: "+237690000002",
      name: "Patrick",
      role: "CLIENT",
      vehicle: null,
    },
    {
      id: "driver-1",
      phone: "+237670000001",
      name: "Alain",
      role: "DRIVER",
      vehicle: {
        id: "vehicle-1",
        driverId: "driver-1",
        plate: "LT 001 AA",
        model: "Toyota Corolla",
        seats: 4,
      },
    },
    {
      id: "driver-2",
      phone: "+237670000002",
      name: "Brigitte",
      role: "DRIVER",
      vehicle: {
        id: "vehicle-2",
        driverId: "driver-2",
        plate: "LT 002 BB",
        model: "Toyota Yaris",
        seats: 3,
      },
    },
    {
      id: "driver-3",
      phone: "+237670000003",
      name: "Cédric",
      role: "DRIVER",
      vehicle: {
        id: "vehicle-3",
        driverId: "driver-3",
        plate: "LT 003 CC",
        model: "Hyundai Accent",
        seats: 4,
      },
    },
  ];

  const corridors: Corridor[] = [
    {
      id: "corridor-1",
      name: "Itinéraire Centre - Ouest (provisoire)",
      stops: [
        "Carrefour Central",
        "Marché Ouest",
        "Rond-point du Fleuve",
        "Gare Routière",
        "Terminus Ouest",
      ].map((name, position) => ({
        id: `c1-stop-${position + 1}`,
        corridorId: "corridor-1",
        name,
        position,
      })),
    },
    {
      id: "corridor-2",
      name: "Itinéraire Centre - Est (provisoire)",
      stops: [
        "Place du Centre",
        "Hôpital Général",
        "Carrefour des Écoles",
        "Marché Est",
        "Terminus Est",
      ].map((name, position) => ({
        id: `c2-stop-${position + 1}`,
        corridorId: "corridor-2",
        name,
        position,
      })),
    },
  ];

  const makeTrip = (
    id: string,
    driverId: string,
    corridorId: string,
    capacity: number,
    stopIds: string[],
    departureOffset: number,
  ): Trip => {
    const corridor = corridors.find((item) => item.id === corridorId)!;
    return {
      id,
      driverId,
      corridorId,
      capacity,
      departureAt: iso(departureOffset),
      status: "OPEN",
      createdAt: iso(-30),
      tripStops: stopIds.map((stopId, sequence) => ({
        id: `${id}-stop-${sequence + 1}`,
        tripId: id,
        stopId,
        sequence,
        stop: corridor.stops.find((stop) => stop.id === stopId)!,
      })),
    };
  };

  const trips = [
    makeTrip(
      "trip-1",
      "driver-1",
      "corridor-1",
      2,
      ["c1-stop-1", "c1-stop-2", "c1-stop-3", "c1-stop-4", "c1-stop-5"],
      60,
    ),
    makeTrip(
      "trip-2",
      "driver-2",
      "corridor-1",
      3,
      ["c1-stop-2", "c1-stop-3", "c1-stop-4", "c1-stop-5"],
      90,
    ),
    makeTrip(
      "trip-3",
      "driver-3",
      "corridor-2",
      1,
      ["c2-stop-1", "c2-stop-2", "c2-stop-3", "c2-stop-4", "c2-stop-5"],
      120,
    ),
    makeTrip(
      "trip-4",
      "driver-1",
      "corridor-1",
      4,
      ["c1-stop-1", "c1-stop-2", "c1-stop-3", "c1-stop-4"],
      -1440,
    ),
    makeTrip(
      "trip-5",
      "driver-2",
      "corridor-1",
      3,
      ["c1-stop-2", "c1-stop-3", "c1-stop-4", "c1-stop-5"],
      -3000,
    ),
  ];

  const requests: TripRequest[] = [
    {
      id: "request-1",
      clientId: "client-1",
      corridorId: "corridor-1",
      fromStopId: "c1-stop-2",
      toStopId: "c1-stop-4",
      windowStart: iso(30),
      windowEnd: iso(120),
      proposedPrice: 1500,
      status: "OPEN",
      createdAt: iso(-10),
    },
    {
      id: "request-2",
      clientId: "client-2",
      corridorId: "corridor-2",
      fromStopId: "c2-stop-2",
      toStopId: "c2-stop-5",
      windowStart: iso(60),
      windowEnd: iso(180),
      proposedPrice: 1800,
      status: "OPEN",
      createdAt: iso(-5),
    },
  ];

  const booking = (
    value: Partial<Booking> &
      Pick<
        Booking,
        | "id"
        | "tripId"
        | "clientId"
        | "pickupStopId"
        | "dropoffStopId"
        | "status"
        | "proposedPrice"
      >,
  ): Booking => ({
    requestId: null,
    initiatedBy: "CLIENT",
    counterPrice: null,
    agreedPrice: null,
    commission: null,
    expiresAt: iso(45),
    createdAt: iso(-10),
    updatedAt: iso(-10),
    ...value,
  });

  const bookings: Booking[] = [
    booking({
      id: "booking-confirmed",
      tripId: "trip-1",
      clientId: "client-2",
      pickupStopId: "c1-stop-1",
      dropoffStopId: "c1-stop-3",
      status: "CONFIRMED",
      proposedPrice: 1200,
      agreedPrice: 1200,
    }),
    booking({
      id: "booking-pending-a",
      tripId: "trip-1",
      clientId: "client-1",
      requestId: "request-1",
      pickupStopId: "c1-stop-2",
      dropoffStopId: "c1-stop-4",
      status: "PROPOSED_BY_CLIENT",
      proposedPrice: 1500,
    }),
    booking({
      id: "booking-pending-b",
      tripId: "trip-1",
      clientId: "client-2",
      pickupStopId: "c1-stop-2",
      dropoffStopId: "c1-stop-4",
      status: "PROPOSED_BY_CLIENT",
      proposedPrice: 1600,
    }),
    booking({
      id: "booking-refused",
      tripId: "trip-2",
      clientId: "client-2",
      pickupStopId: "c1-stop-2",
      dropoffStopId: "c1-stop-4",
      status: "REFUSED",
      proposedPrice: 1300,
    }),
    booking({
      id: "booking-countered",
      tripId: "trip-2",
      clientId: "client-1",
      pickupStopId: "c1-stop-2",
      dropoffStopId: "c1-stop-5",
      status: "PROPOSED_BY_DRIVER",
      proposedPrice: 1400,
      counterPrice: 1700,
    }),
    booking({
      id: "booking-full-trip",
      tripId: "trip-3",
      clientId: "client-2",
      pickupStopId: "c2-stop-1",
      dropoffStopId: "c2-stop-5",
      status: "CONFIRMED",
      proposedPrice: 2000,
      agreedPrice: 2000,
    }),
    booking({
      id: "booking-driver-offer",
      tripId: "trip-2",
      clientId: "client-1",
      requestId: "request-1",
      initiatedBy: "DRIVER",
      pickupStopId: "c1-stop-2",
      dropoffStopId: "c1-stop-4",
      status: "PROPOSED_BY_DRIVER",
      proposedPrice: 1700,
    }),
    booking({
      id: "booking-history",
      tripId: "trip-4",
      clientId: "client-1",
      pickupStopId: "c1-stop-1",
      dropoffStopId: "c1-stop-4",
      status: "COMPLETED",
      proposedPrice: 1900,
      agreedPrice: 1900,
      commission: 190,
      createdAt: iso(-1500),
      updatedAt: iso(-1440),
    }),
    booking({
      id: "booking-history-brigitte",
      tripId: "trip-5",
      clientId: "client-2",
      pickupStopId: "c1-stop-2",
      dropoffStopId: "c1-stop-5",
      status: "COMPLETED",
      proposedPrice: 1600,
      agreedPrice: 1600,
      commission: 160,
      createdAt: iso(-3060),
      updatedAt: iso(-3000),
    }),
  ];
  trips[2]!.status = "FULL";
  trips[3]!.status = "COMPLETED";
  trips[4]!.status = "COMPLETED";

  return {
    users,
    corridors,
    trips,
    requests,
    bookings,
    ratings: [
      {
        id: "rating-seed",
        bookingId: "booking-history-brigitte",
        authorId: "client-2",
        targetId: "driver-2",
        score: 5,
        comment: "Conduite agréable",
        createdAt: iso(-2990),
      },
    ],
    transactions: [
      {
        id: "transaction-1",
        userId: "driver-1",
        bookingId: "booking-confirmed",
        type: "PAYOUT",
        amount: 1080,
        createdAt: iso(-2),
      },
      {
        id: "transaction-2",
        userId: "driver-1",
        bookingId: "booking-confirmed",
        type: "COMMISSION",
        amount: -120,
        createdAt: iso(-2),
      },
      {
        id: "transaction-3",
        userId: "driver-1",
        bookingId: "booking-history",
        type: "PAYOUT",
        amount: 1710,
        createdAt: iso(-1440),
      },
      {
        id: "transaction-4",
        userId: "driver-1",
        bookingId: "booking-history",
        type: "COMMISSION",
        amount: -190,
        createdAt: iso(-1440),
      },
    ],
  };
}
