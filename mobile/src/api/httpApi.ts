import { z } from "zod";
import type { Api } from "./api";
import { ApiError, type ApiErrorCode } from "./errors";
import { notifySessionExpired } from "./session-events";
import type {
  AuthResult,
  Booking,
  BookingDetails,
  Corridor,
  CreateRatingInput,
  CreateTripInput,
  CreateTripRequestInput,
  MatchedTrip,
  MatchedTripRequest,
  OtpRequestResult,
  ProposeBookingInput,
  Rating,
  Role,
  Trip,
  TripLocation,
  TripManifest,
  TripRequest,
  UpdateProfileInput,
  UpdateTripInput,
  UpdateTripLocationInput,
  UpdateTripRequestInput,
  PushDeviceInput,
  UserProfile,
  Wallet,
} from "./types";

const apiUrl = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"
).replace(/\/$/, "");
let accessToken: string | null = null;

const errorCodeByServerCode: Record<string, ApiErrorCode> = {
  INVALID_INPUT: "INVALID_INPUT",
  INVALID_DRIVER_PROFILE: "INVALID_INPUT",
  AUTHENTICATION_REQUIRED: "UNAUTHENTICATED",
  TOKEN_INVALID: "SESSION_EXPIRED",
  ROLE_REQUIRED: "ROLE_REQUIRED",
  ROLE_FORBIDDEN: "FORBIDDEN",
  OTP_INVALID: "OTP_INVALID",
  OTP_EXPIRED: "OTP_INVALID",
  OTP_RATE_LIMITED: "OTP_INVALID",
  CORRIDOR_NOT_FOUND: "NOT_FOUND",
  USER_NOT_FOUND: "NOT_FOUND",
  TRIP_NOT_FOUND: "NOT_FOUND",
  REQUEST_NOT_FOUND: "NOT_FOUND",
  BOOKING_NOT_FOUND: "NOT_FOUND",
  SOURCE_NOT_FOUND: "NOT_FOUND",
  TRIP_NOT_OPEN: "TRIP_NOT_OPEN",
  TRIP_NOT_EDITABLE: "TRIP_NOT_OPEN",
  TRIP_NOT_CANCELLABLE: "TRIP_NOT_OPEN",
  REQUEST_NOT_EDITABLE: "INVALID_INPUT",
  REQUEST_NOT_CANCELLABLE: "INVALID_INPUT",
  REQUEST_ALREADY_CONFIRMED: "BOOKING_NOT_CONFIRMABLE",
  INVALID_REQUEST_WINDOW: "INVALID_INPUT",
  CAPACITY_BELOW_OCCUPANCY: "CAPACITY_EXCEEDED",
  CONFIRMED_BOOKING_CONFLICT: "INVALID_BOOKING_STOPS",
  LOCATION_SHARING_NOT_ALLOWED: "TRIP_NOT_OPEN",
  LOCATION_ACTION_FORBIDDEN: "FORBIDDEN",
  INVALID_TRIP_STOPS: "INVALID_TRIP_STOPS",
  STOPS_OUT_OF_ORDER: "INVALID_TRIP_STOPS",
  INVALID_REQUEST_STOPS: "INVALID_INPUT",
  INVALID_BOOKING_STOPS: "INVALID_BOOKING_STOPS",
  BOOKING_NOT_CONFIRMABLE: "BOOKING_NOT_CONFIRMABLE",
  BOOKING_NOT_REFUSABLE: "BOOKING_NOT_CONFIRMABLE",
  BOOKING_NOT_CANCELLABLE: "BOOKING_NOT_CONFIRMABLE",
  BOOKING_EXPIRED: "BOOKING_EXPIRED",
  CAPACITY_EXCEEDED: "CAPACITY_EXCEEDED",
  COUNTER_OFFER_NOT_ALLOWED: "COUNTER_OFFER_ALREADY_USED",
  RATING_NOT_ALLOWED: "RATING_NOT_ALLOWED",
  RATING_ALREADY_EXISTS: "RATING_NOT_ALLOWED",
};

type ErrorPayload = { error?: string };

async function clearExpiredSession(): Promise<void> {
  accessToken = null;
  notifySessionExpired();
  try {
    const SecureStore = await import("expo-secure-store");
    await Promise.all([
      SecureStore.deleteItemAsync("covoiturage-taxi.token"),
      SecureStore.deleteItemAsync("covoiturage-taxi.user"),
    ]);
  } catch {
    // La mémoire est déjà nettoyée ; SecureStore peut être indisponible dans les tests.
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  schema?: z.ZodType<T>,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      "NETWORK_ERROR",
      "Impossible de joindre le serveur. Vérifiez votre connexion et l’adresse de l’API.",
    );
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const serverError = (payload as ErrorPayload | null)?.error;
    if (
      response.status === 401 &&
      serverError !== "OTP_INVALID" &&
      serverError !== "OTP_EXPIRED"
    ) {
      await clearExpiredSession();
      throw new ApiError(
        "SESSION_EXPIRED",
        "Votre session a expiré. Reconnectez-vous.",
      );
    }
    const code = serverError ? errorCodeByServerCode[serverError] : undefined;
    throw new ApiError(
      code ?? (response.status === 403 ? "FORBIDDEN" : "INVALID_INPUT"),
    );
  }

  if (!schema) return payload as T;
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError(
      "INVALID_RESPONSE",
      "Le serveur a renvoyé une réponse inattendue.",
    );
  }
  return parsed.data;
}

const roleSchema = z.enum(["CLIENT", "DRIVER", "ADMIN"]);
const userSchema = z.object({
  id: z.string(),
  phone: z.string(),
  name: z.string().nullable(),
  role: roleSchema,
});
const vehicleSchema = z.object({
  id: z.string(),
  driverId: z.string(),
  plate: z.string(),
  model: z.string().nullable(),
  seats: z.number().int(),
});
const profileSchema = userSchema.extend({ vehicle: vehicleSchema.nullable() });
const stopSchema = z.object({
  id: z.string(),
  corridorId: z.string(),
  name: z.string(),
  position: z.number().int(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  meetingInstructions: z.string().nullable(),
});
const corridorSchema = z.object({
  id: z.string(),
  name: z.string(),
  stops: z.array(stopSchema),
});
const tripStopSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  stopId: z.string(),
  sequence: z.number().int(),
  stop: stopSchema,
});
const tripSchema = z.object({
  id: z.string(),
  driverId: z.string(),
  corridorId: z.string(),
  capacity: z.number().int(),
  departureAt: z.string(),
  status: z.enum(["OPEN", "FULL", "CLOSED", "COMPLETED", "CANCELLED"]),
  createdAt: z.string(),
  tripStops: z.array(tripStopSchema),
});
const tripRequestSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  corridorId: z.string(),
  fromStopId: z.string(),
  toStopId: z.string(),
  windowStart: z.string(),
  windowEnd: z.string(),
  proposedPrice: z.number().int(),
  status: z.enum(["OPEN", "MATCHED", "EXPIRED", "CANCELLED"]),
  createdAt: z.string(),
});
const bookingSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  clientId: z.string(),
  requestId: z.string().nullable(),
  pickupStopId: z.string(),
  dropoffStopId: z.string(),
  initiatedBy: z.enum(["CLIENT", "DRIVER"]),
  status: z.enum([
    "PROPOSED_BY_CLIENT",
    "PROPOSED_BY_DRIVER",
    "CONFIRMED",
    "REFUSED",
    "EXPIRED",
    "CANCELLED",
    "COMPLETED",
  ]),
  proposedPrice: z.number().int(),
  counterPrice: z.number().int().nullable(),
  agreedPrice: z.number().int().nullable(),
  commission: z.number().int().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
const matchedDriverSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  rating: z.number().nullable(),
  vehicle: vehicleSchema
    .pick({ plate: true, model: true, seats: true })
    .nullable(),
});
const matchedTripSchema = z.object({
  id: z.string(),
  corridorId: z.string(),
  capacity: z.number().int(),
  departureAt: z.string(),
  status: z.enum(["OPEN", "FULL", "CLOSED", "COMPLETED", "CANCELLED"]),
  driver: matchedDriverSchema,
  tripStops: z.array(
    z.object({
      sequence: z.number().int(),
      stopId: z.string(),
      stop: stopSchema.pick({ id: true, name: true }),
    }),
  ),
});
const matchedRequestSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  fromStopId: z.string(),
  toStopId: z.string(),
  windowStart: z.string(),
  windowEnd: z.string(),
  proposedPrice: z.number().int(),
  client: userSchema.pick({ id: true, name: true }),
  fromStop: stopSchema.pick({ id: true, name: true }),
  toStop: stopSchema.pick({ id: true, name: true }),
});
const ratingSchema = z.object({
  id: z.string(),
  bookingId: z.string(),
  authorId: z.string(),
  targetId: z.string(),
  score: z.number().int(),
  comment: z.string().nullable(),
  createdAt: z.string(),
});
const transactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  bookingId: z.string().nullable(),
  type: z.enum(["TOPUP", "COMMISSION", "PAYOUT"]),
  amount: z.number().int(),
  createdAt: z.string(),
});
const bookingDetailsSchema = z.object({
  booking: bookingSchema,
  trip: tripSchema,
  driver: matchedDriverSchema,
  client: userSchema.pick({ id: true, name: true }),
  pickupStop: stopSchema.pick({ id: true, name: true }),
  dropoffStop: stopSchema.pick({ id: true, name: true }),
  ratedByCurrentUser: z.boolean(),
});
const tripLocationSchema = z.object({
  tripId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().nullable(),
  heading: z.number().nullable(),
  updatedAt: z.string(),
});

function json(input: unknown): string {
  return JSON.stringify(input);
}

export const httpApi: Api = {
  requestOtp: (phone): Promise<OtpRequestResult> =>
    request(
      "/auth/otp/request",
      { method: "POST", body: json({ phone }) },
      z.object({ status: z.literal("OTP_SENT") }),
    ),
  async verifyOtp(
    phone,
    code,
    role?: Extract<Role, "CLIENT" | "DRIVER">,
  ): Promise<AuthResult> {
    const result = await request(
      "/auth/otp/verify",
      { method: "POST", body: json({ phone, code, role }) },
      z.object({ token: z.string(), user: userSchema }),
    );
    accessToken = result.token;
    return result;
  },
  async restoreSession(token): Promise<void> {
    accessToken = token;
    try {
      await request("/me", {}, profileSchema);
    } catch (error) {
      accessToken = null;
      throw error;
    }
  },
  async signOut(): Promise<void> {
    accessToken = null;
  },
  getCurrentUser: (): Promise<UserProfile | null> =>
    request("/me", {}, profileSchema),
  updateProfile: (input: UpdateProfileInput): Promise<UserProfile> =>
    request("/me", { method: "PATCH", body: json(input) }, profileSchema),
  listCorridors: async (): Promise<Corridor[]> =>
    (
      await request(
        "/corridors",
        {},
        z.object({ corridors: z.array(corridorSchema) }),
      )
    ).corridors,
  createTrip: (input: CreateTripInput): Promise<Trip> =>
    request("/trips", { method: "POST", body: json(input) }, tripSchema),
  updateTrip: (tripId, input: UpdateTripInput): Promise<Trip> =>
    request(
      `/trips/${encodeURIComponent(tripId)}`,
      { method: "PATCH", body: json(input) },
      tripSchema,
    ),
  cancelTrip: (tripId): Promise<Trip> =>
    request(
      `/trips/${encodeURIComponent(tripId)}/cancel`,
      { method: "POST" },
      tripSchema,
    ),
  listDriverTrips: async (): Promise<Trip[]> =>
    (await request("/trips", {}, z.object({ trips: z.array(tripSchema) })))
      .trips,
  getTripManifest: (tripId): Promise<TripManifest> =>
    request(
      `/trips/${encodeURIComponent(tripId)}/manifest`,
      {},
      z.object({
        trip: tripSchema,
        passengers: z.array(
          z.object({
            bookingId: z.string(),
            clientId: z.string(),
            clientName: z.string().nullable(),
            pickupStopId: z.string(),
            dropoffStopId: z.string(),
          }),
        ),
      }),
    ),
  getTripRoute: (tripId): Promise<Trip> =>
    request(
      `/trips/${encodeURIComponent(tripId)}/route`,
      {},
      tripSchema,
    ),
  closeTrip: (tripId): Promise<Trip> =>
    request(
      `/trips/${encodeURIComponent(tripId)}/close`,
      { method: "POST" },
      tripSchema,
    ),
  createTripRequest: (input: CreateTripRequestInput): Promise<TripRequest> =>
    request(
      "/trip-requests",
      { method: "POST", body: json(input) },
      tripRequestSchema,
    ),
  updateTripRequest: (
    requestId,
    input: UpdateTripRequestInput,
  ): Promise<TripRequest> =>
    request(
      `/trip-requests/${encodeURIComponent(requestId)}`,
      { method: "PATCH", body: json(input) },
      tripRequestSchema,
    ),
  listClientTripRequests: async (): Promise<TripRequest[]> =>
    (
      await request(
        "/trip-requests",
        {},
        z.object({ requests: z.array(tripRequestSchema) }),
      )
    ).requests,
  cancelTripRequest: (requestId): Promise<TripRequest> =>
    request(
      `/trip-requests/${encodeURIComponent(requestId)}/cancel`,
      { method: "POST" },
      tripRequestSchema,
    ),
  listTripsForRequest: async (requestId): Promise<MatchedTrip[]> =>
    (
      await request(
        `/matching/requests/${encodeURIComponent(requestId)}/trips`,
        {},
        z.object({ trips: z.array(matchedTripSchema) }),
      )
    ).trips,
  listRequestsForTrip: async (tripId): Promise<MatchedTripRequest[]> =>
    (
      await request(
        `/matching/trips/${encodeURIComponent(tripId)}/requests`,
        {},
        z.object({ requests: z.array(matchedRequestSchema) }),
      )
    ).requests,
  proposeBooking: (input: ProposeBookingInput): Promise<Booking> =>
    request("/bookings", { method: "POST", body: json(input) }, bookingSchema),
  acceptBooking: (bookingId): Promise<Booking> =>
    request(
      `/bookings/${encodeURIComponent(bookingId)}/accept`,
      { method: "POST" },
      bookingSchema,
    ),
  refuseBooking: (bookingId): Promise<Booking> =>
    request(
      `/bookings/${encodeURIComponent(bookingId)}/refuse`,
      { method: "POST" },
      bookingSchema,
    ),
  counterOfferBooking: (bookingId, counterPrice): Promise<Booking> =>
    request(
      `/bookings/${encodeURIComponent(bookingId)}/counter-offer`,
      { method: "POST", body: json({ counterPrice }) },
      bookingSchema,
    ),
  cancelBooking: (bookingId): Promise<Booking> =>
    request(
      `/bookings/${encodeURIComponent(bookingId)}/cancel`,
      { method: "POST" },
      bookingSchema,
    ),
  listClientBookings: async (): Promise<Booking[]> =>
    (
      await request(
        "/bookings/client",
        {},
        z.object({ bookings: z.array(bookingSchema) }),
      )
    ).bookings,
  listDriverBookings: async (): Promise<Booking[]> =>
    (
      await request(
        "/bookings/driver",
        {},
        z.object({ bookings: z.array(bookingSchema) }),
      )
    ).bookings,
  listBookingHistory: async (): Promise<Booking[]> =>
    (
      await request(
        "/bookings/history",
        {},
        z.object({ bookings: z.array(bookingSchema) }),
      )
    ).bookings,
  getBookingDetails: (bookingId): Promise<BookingDetails> =>
    request(
      `/bookings/${encodeURIComponent(bookingId)}`,
      {},
      bookingDetailsSchema,
    ),
  createRating: (input: CreateRatingInput): Promise<Rating> =>
    request("/ratings", { method: "POST", body: json(input) }, ratingSchema),
  getWallet: (): Promise<Wallet> =>
    request(
      "/wallet",
      {},
      z.object({
        balance: z.number().int(),
        earnings: z.number().int(),
        commissions: z.number().int(),
        transactions: z.array(transactionSchema),
      }),
    ),
  async registerPushDevice(input: PushDeviceInput): Promise<void> {
    await request("/push-devices", { method: "POST", body: json(input) });
  },
  async unregisterPushDevice(token: string): Promise<void> {
    await request("/push-devices", {
      method: "DELETE",
      body: json({ token }),
    });
  },
  updateTripLocation: (
    tripId,
    input: UpdateTripLocationInput,
  ): Promise<TripLocation> =>
    request(
      `/trips/${encodeURIComponent(tripId)}/location`,
      { method: "PUT", body: json(input) },
      tripLocationSchema,
    ),
  getTripLocation: async (tripId): Promise<TripLocation | null> =>
    (
      await request(
        `/trips/${encodeURIComponent(tripId)}/location`,
        {},
        z.object({ location: tripLocationSchema.nullable() }),
      )
    ).location,
};
