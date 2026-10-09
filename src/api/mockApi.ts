import { z } from "zod";
import type { Api } from "./api";
import { canBook, isValidSegment, type Segment } from "./capacity";
import { ApiError } from "./errors";
import { createMockData, mockIds, type MockData } from "./mockData";
import type {
  AuthResult,
  Booking,
  BookingStatus,
  Corridor,
  CreateRatingInput,
  CreateTripInput,
  CreateTripRequestInput,
  MatchedTrip,
  MatchedTripRequest,
  ProposeBookingInput,
  Rating,
  Role,
  Trip,
  TripRequest,
  UpdateProfileInput,
  UserProfile,
  Wallet,
} from "./types";

const phoneSchema = z.string().trim().regex(/^\+2376\d{8}$/);
const idSchema = z.string().trim().min(1);
const positivePriceSchema = z.number().int().positive();
const isoDateSchema = z.iso.datetime({ offset: true });
const roleSchema = z.enum(["CLIENT", "DRIVER"]);

const createTripSchema = z.object({
  corridorId: idSchema,
  capacity: z.number().int().positive(),
  departureAt: isoDateSchema,
  stopIds: z.array(idSchema).min(2).refine((ids) => new Set(ids).size === ids.length),
});

const createRequestSchema = z
  .object({
    corridorId: idSchema,
    fromStopId: idSchema,
    toStopId: idSchema,
    windowStart: isoDateSchema,
    windowEnd: isoDateSchema,
    proposedPrice: positivePriceSchema,
  })
  .refine((input) => input.fromStopId !== input.toStopId)
  .refine((input) => new Date(input.windowStart) < new Date(input.windowEnd));

const proposalSchema = z.object({
  tripId: idSchema,
  pickupStopId: idSchema,
  dropoffStopId: idSchema,
  proposedPrice: positivePriceSchema,
  requestId: idSchema.optional(),
});

const profileSchema = z.object({
  name: z.string().trim().min(2),
  plate: z.string().trim().min(2).optional(),
  model: z.string().trim().min(2).optional(),
  seats: z.number().int().positive().max(8).optional(),
});

const ratingSchema = z.object({
  bookingId: idSchema,
  targetId: idSchema,
  score: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

export type MockApiOptions = {
  minDelayMs?: number;
  maxDelayMs?: number;
  initialUserId?: string | null;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new ApiError("INVALID_INPUT", "Les données saisies sont invalides.");
  return parsed.data;
}

export class MockApi implements Api {
  private readonly data: MockData = createMockData();
  private readonly requestedPhones = new Set<string>();
  private activeUserId: string | null;
  private sequence = 100;
  private readonly minDelayMs: number;
  private readonly maxDelayMs: number;

  constructor(options: MockApiOptions = {}) {
    this.minDelayMs = Math.max(0, options.minDelayMs ?? 300);
    this.maxDelayMs = Math.max(this.minDelayMs, options.maxDelayMs ?? 800);
    this.activeUserId = options.initialUserId === undefined ? mockIds.client : options.initialUserId;
  }

  private async wait(): Promise<void> {
    if (this.maxDelayMs === 0) return;
    const duration =
      this.minDelayMs + Math.floor(Math.random() * (this.maxDelayMs - this.minDelayMs + 1));
    await new Promise((resolve) => setTimeout(resolve, duration));
  }

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }

  private currentUser(roles?: Role[]): UserProfile {
    const user = this.data.users.find((candidate) => candidate.id === this.activeUserId);
    if (!user) throw new ApiError("UNAUTHENTICATED", "Vous devez vous connecter.");
    if (roles && !roles.includes(user.role)) {
      throw new ApiError("FORBIDDEN", "Cette action n’est pas autorisée pour ce profil.");
    }
    return user;
  }

  private tripById(tripId: string): Trip {
    const trip = this.data.trips.find((candidate) => candidate.id === tripId);
    if (!trip) throw new ApiError("NOT_FOUND", "Trajet introuvable.");
    return trip;
  }

  private bookingById(bookingId: string): Booking {
    const booking = this.data.bookings.find((candidate) => candidate.id === bookingId);
    if (!booking) throw new ApiError("NOT_FOUND", "Réservation introuvable.");
    return booking;
  }

  private segmentFor(trip: Trip, pickupStopId: string, dropoffStopId: string): Segment | null {
    const sequenceByStopId = new Map(
      trip.tripStops.map((tripStop) => [tripStop.stopId, tripStop.sequence]),
    );
    const segment = {
      pickup: sequenceByStopId.get(pickupStopId) ?? -1,
      dropoff: sequenceByStopId.get(dropoffStopId) ?? -1,
    };
    return isValidSegment(segment) ? segment : null;
  }

  private confirmedSegments(trip: Trip, ignoredBookingId?: string): Segment[] {
    return this.data.bookings
      .filter(
        (booking) =>
          booking.tripId === trip.id &&
          booking.status === "CONFIRMED" &&
          booking.id !== ignoredBookingId,
      )
      .map((booking) => this.segmentFor(trip, booking.pickupStopId, booking.dropoffStopId))
      .filter((segment): segment is Segment => segment !== null);
  }

  private recalculateTripStatus(trip: Trip): void {
    if (["CLOSED", "COMPLETED", "CANCELLED"].includes(trip.status)) return;
    const existing = this.confirmedSegments(trip);
    const everyLegIsFull = trip.tripStops.slice(0, -1).every((_, leg) =>
      !canBook(trip.capacity, existing, { pickup: leg, dropoff: leg + 1 }),
    );
    trip.status = everyLegIsFull ? "FULL" : "OPEN";
  }

  async requestOtp(phone: string) {
    await this.wait();
    const validPhone = parse(phoneSchema, phone);
    this.requestedPhones.add(validPhone);
    return { status: "OTP_SENT" as const };
  }

  async verifyOtp(
    phone: string,
    code: string,
    role?: Extract<Role, "CLIENT" | "DRIVER">,
  ): Promise<AuthResult> {
    await this.wait();
    const validPhone = parse(phoneSchema, phone);
    if (!this.requestedPhones.has(validPhone)) throw new ApiError("OTP_NOT_REQUESTED");
    if (code !== "1234") throw new ApiError("OTP_INVALID", "Le code fictif attendu est 1234.");

    let user = this.data.users.find((candidate) => candidate.phone === validPhone);
    if (!user) {
      if (!role) throw new ApiError("ROLE_REQUIRED");
      const validRole = parse(roleSchema, role);
      user = {
        id: this.nextId("user"),
        phone: validPhone,
        name: null,
        role: validRole,
        vehicle: null,
      };
      this.data.users.push(user);
    }

    this.requestedPhones.delete(validPhone);
    this.activeUserId = user.id;
    const { vehicle: _vehicle, ...publicUser } = user;
    return clone({ token: `mock-token-${user.id}`, user: publicUser });
  }

  async signOut(): Promise<void> {
    await this.wait();
    this.activeUserId = null;
  }

  async restoreSession(token: string, user: UserProfile): Promise<void> {
    await this.wait();
    if (token !== `mock-token-${user.id}`) throw new ApiError("UNAUTHENTICATED");
    const existingIndex = this.data.users.findIndex((candidate) => candidate.id === user.id);
    if (existingIndex === -1) this.data.users.push(clone(user));
    else this.data.users[existingIndex] = clone(user);
    this.activeUserId = user.id;
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    await this.wait();
    const user = this.data.users.find((candidate) => candidate.id === this.activeUserId) ?? null;
    return clone(user);
  }

  async updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
    await this.wait();
    const values = parse(profileSchema, input);
    const user = this.currentUser();
    user.name = values.name;
    if (user.role === "DRIVER") {
      if (!values.plate || !values.seats) throw new ApiError("INVALID_INPUT");
      user.vehicle = {
        id: user.vehicle?.id ?? this.nextId("vehicle"),
        driverId: user.id,
        plate: values.plate,
        model: values.model ?? null,
        seats: values.seats,
      };
    }
    return clone(user);
  }

  async listCorridors(): Promise<Corridor[]> {
    await this.wait();
    return clone(this.data.corridors);
  }

  async createTrip(input: CreateTripInput): Promise<Trip> {
    await this.wait();
    const values = parse(createTripSchema, input);
    const driver = this.currentUser(["DRIVER"]);
    const corridor = this.data.corridors.find((candidate) => candidate.id === values.corridorId);
    if (!corridor) throw new ApiError("NOT_FOUND", "Axe introuvable.");
    if (driver.vehicle && values.capacity > driver.vehicle.seats) {
      throw new ApiError("INVALID_INPUT", "La capacité dépasse le nombre de places du véhicule.");
    }

    const positions = values.stopIds.map(
      (stopId) => corridor.stops.find((stop) => stop.id === stopId)?.position,
    );
    if (positions.some((position) => position === undefined)) {
      throw new ApiError("INVALID_TRIP_STOPS");
    }
    const ordered = positions.every(
      (position, index) => index === 0 || Math.abs(position! - positions[index - 1]!) > 0,
    ) &&
      (positions.every((position, index) => index === 0 || position! > positions[index - 1]!) ||
        positions.every((position, index) => index === 0 || position! < positions[index - 1]!));
    if (!ordered) throw new ApiError("INVALID_TRIP_STOPS");

    const id = this.nextId("trip");
    const trip: Trip = {
      id,
      driverId: driver.id,
      corridorId: corridor.id,
      capacity: values.capacity,
      departureAt: values.departureAt,
      status: "OPEN",
      createdAt: new Date().toISOString(),
      tripStops: values.stopIds.map((stopId, sequence) => ({
        id: this.nextId("trip-stop"),
        tripId: id,
        stopId,
        sequence,
        stop: corridor.stops.find((stop) => stop.id === stopId)!,
      })),
    };
    this.data.trips.push(trip);
    return clone(trip);
  }

  async listDriverTrips(): Promise<Trip[]> {
    await this.wait();
    const driver = this.currentUser(["DRIVER"]);
    return clone(this.data.trips.filter((trip) => trip.driverId === driver.id));
  }

  async closeTrip(tripId: string): Promise<Trip> {
    await this.wait();
    const driver = this.currentUser(["DRIVER"]);
    const trip = this.tripById(parse(idSchema, tripId));
    if (trip.driverId !== driver.id) throw new ApiError("FORBIDDEN");
    trip.status = "CLOSED";
    return clone(trip);
  }

  async createTripRequest(input: CreateTripRequestInput): Promise<TripRequest> {
    await this.wait();
    const values = parse(createRequestSchema, input);
    const client = this.currentUser(["CLIENT"]);
    const corridor = this.data.corridors.find((candidate) => candidate.id === values.corridorId);
    const from = corridor?.stops.find((stop) => stop.id === values.fromStopId);
    const to = corridor?.stops.find((stop) => stop.id === values.toStopId);
    if (!corridor || !from || !to || from.position >= to.position) {
      throw new ApiError("INVALID_INPUT", "L’arrêt d’arrivée doit suivre l’arrêt de départ.");
    }
    const request: TripRequest = {
      id: this.nextId("request"),
      clientId: client.id,
      ...values,
      status: "OPEN",
      createdAt: new Date().toISOString(),
    };
    this.data.requests.push(request);
    return clone(request);
  }

  async listClientTripRequests(): Promise<TripRequest[]> {
    await this.wait();
    const client = this.currentUser(["CLIENT"]);
    return clone(this.data.requests.filter((request) => request.clientId === client.id));
  }

  async cancelTripRequest(requestId: string): Promise<TripRequest> {
    await this.wait();
    const client = this.currentUser(["CLIENT"]);
    const request = this.data.requests.find((candidate) => candidate.id === parse(idSchema, requestId));
    if (!request) throw new ApiError("NOT_FOUND");
    if (request.clientId !== client.id) throw new ApiError("FORBIDDEN");
    request.status = "CANCELLED";
    return clone(request);
  }

  async listTripsForRequest(requestId: string): Promise<MatchedTrip[]> {
    await this.wait();
    const client = this.currentUser(["CLIENT"]);
    const request = this.data.requests.find((candidate) => candidate.id === parse(idSchema, requestId));
    if (!request) throw new ApiError("NOT_FOUND");
    if (request.clientId !== client.id) throw new ApiError("FORBIDDEN");
    if (request.status !== "OPEN") return [];

    return clone(
      this.data.trips
        .filter((trip) => {
          const segment = this.segmentFor(trip, request.fromStopId, request.toStopId);
          const alreadyProposed = this.data.bookings.some(
            (booking) =>
              booking.tripId === trip.id &&
              booking.requestId === request.id &&
              ["PROPOSED_BY_CLIENT", "PROPOSED_BY_DRIVER", "CONFIRMED"].includes(booking.status),
          );
          return (
            trip.corridorId === request.corridorId &&
            trip.status === "OPEN" &&
            trip.departureAt >= request.windowStart &&
            trip.departureAt <= request.windowEnd &&
            !alreadyProposed &&
            segment !== null &&
            canBook(trip.capacity, this.confirmedSegments(trip), segment)
          );
        })
        .map((trip) => {
          const driver = this.data.users.find((user) => user.id === trip.driverId)!;
          return {
            id: trip.id,
            corridorId: trip.corridorId,
            capacity: trip.capacity,
            departureAt: trip.departureAt,
            status: trip.status,
            driver: { id: driver.id, name: driver.name },
            tripStops: trip.tripStops.map(({ sequence, stopId, stop }) => ({
              sequence,
              stopId,
              stop: { id: stop.id, name: stop.name },
            })),
          };
        }),
    );
  }

  async listRequestsForTrip(tripId: string): Promise<MatchedTripRequest[]> {
    await this.wait();
    const driver = this.currentUser(["DRIVER"]);
    const trip = this.tripById(parse(idSchema, tripId));
    if (trip.driverId !== driver.id) throw new ApiError("FORBIDDEN");
    if (trip.status !== "OPEN") return [];

    return clone(
      this.data.requests
        .filter((request) => {
          const segment = this.segmentFor(trip, request.fromStopId, request.toStopId);
          const alreadyProposed = this.data.bookings.some(
            (booking) =>
              booking.tripId === trip.id &&
              booking.requestId === request.id &&
              ["PROPOSED_BY_CLIENT", "PROPOSED_BY_DRIVER", "CONFIRMED"].includes(booking.status),
          );
          return (
            request.corridorId === trip.corridorId &&
            request.status === "OPEN" &&
            request.windowStart <= trip.departureAt &&
            request.windowEnd >= trip.departureAt &&
            !alreadyProposed &&
            segment !== null &&
            canBook(trip.capacity, this.confirmedSegments(trip), segment)
          );
        })
        .sort((a, b) => b.proposedPrice - a.proposedPrice)
        .map((request) => {
          const client = this.data.users.find((user) => user.id === request.clientId)!;
          const corridor = this.data.corridors.find((item) => item.id === trip.corridorId)!;
          const fromStop = corridor.stops.find((stop) => stop.id === request.fromStopId)!;
          const toStop = corridor.stops.find((stop) => stop.id === request.toStopId)!;
          return {
            id: request.id,
            clientId: request.clientId,
            fromStopId: request.fromStopId,
            toStopId: request.toStopId,
            windowStart: request.windowStart,
            windowEnd: request.windowEnd,
            proposedPrice: request.proposedPrice,
            client: { id: client.id, name: client.name },
            fromStop: { id: fromStop.id, name: fromStop.name },
            toStop: { id: toStop.id, name: toStop.name },
          };
        }),
    );
  }

  async proposeBooking(input: ProposeBookingInput): Promise<Booking> {
    await this.wait();
    const values = parse(proposalSchema, input);
    const user = this.currentUser(["CLIENT", "DRIVER"]);
    const trip = this.tripById(values.tripId);
    if (trip.status !== "OPEN") throw new ApiError("TRIP_NOT_OPEN");
    if (!this.segmentFor(trip, values.pickupStopId, values.dropoffStopId)) {
      throw new ApiError("INVALID_BOOKING_STOPS");
    }

    let clientId = user.id;
    let status: BookingStatus = "PROPOSED_BY_CLIENT";
    if (user.role === "DRIVER") {
      if (trip.driverId !== user.id || !values.requestId) throw new ApiError("FORBIDDEN");
      const request = this.data.requests.find((candidate) => candidate.id === values.requestId);
      if (!request) throw new ApiError("NOT_FOUND");
      clientId = request.clientId;
      status = "PROPOSED_BY_DRIVER";
    }

    const now = new Date().toISOString();
    const booking: Booking = {
      id: this.nextId("booking"),
      tripId: trip.id,
      clientId,
      requestId: values.requestId ?? null,
      pickupStopId: values.pickupStopId,
      dropoffStopId: values.dropoffStopId,
      initiatedBy: user.role === "DRIVER" ? "DRIVER" : "CLIENT",
      status,
      proposedPrice: values.proposedPrice,
      counterPrice: null,
      agreedPrice: null,
      commission: null,
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      createdAt: now,
      updatedAt: now,
    };
    this.data.bookings.push(booking);
    return clone(booking);
  }

  async acceptBooking(bookingId: string): Promise<Booking> {
    await this.wait();
    const user = this.currentUser(["CLIENT", "DRIVER"]);
    const booking = this.bookingById(parse(idSchema, bookingId));
    const trip = this.tripById(booking.tripId);
    const responderId =
      booking.status === "PROPOSED_BY_CLIENT" ? trip.driverId :
        booking.status === "PROPOSED_BY_DRIVER" ? booking.clientId : null;
    if (!responderId) throw new ApiError("BOOKING_NOT_CONFIRMABLE");
    if (responderId !== user.id) throw new ApiError("FORBIDDEN");
    if (booking.expiresAt && booking.expiresAt <= new Date().toISOString()) {
      booking.status = "EXPIRED";
      throw new ApiError("BOOKING_EXPIRED");
    }
    const candidate = this.segmentFor(trip, booking.pickupStopId, booking.dropoffStopId);
    if (!candidate) throw new ApiError("INVALID_BOOKING_STOPS");
    if (!canBook(trip.capacity, this.confirmedSegments(trip, booking.id), candidate)) {
      throw new ApiError("CAPACITY_EXCEEDED", "Le trajet est devenu complet sur ce tronçon.");
    }

    booking.status = "CONFIRMED";
    booking.agreedPrice = booking.counterPrice ?? booking.proposedPrice;
    booking.updatedAt = new Date().toISOString();
    this.recalculateTripStatus(trip);
    return clone(booking);
  }

  async refuseBooking(bookingId: string): Promise<Booking> {
    await this.wait();
    const user = this.currentUser(["CLIENT", "DRIVER"]);
    const booking = this.bookingById(parse(idSchema, bookingId));
    const trip = this.tripById(booking.tripId);
    const responderId =
      booking.status === "PROPOSED_BY_CLIENT" ? trip.driverId :
        booking.status === "PROPOSED_BY_DRIVER" ? booking.clientId : null;
    if (!responderId) throw new ApiError("BOOKING_NOT_CONFIRMABLE");
    if (responderId !== user.id) throw new ApiError("FORBIDDEN");
    booking.status = "REFUSED";
    booking.updatedAt = new Date().toISOString();
    return clone(booking);
  }

  async counterOfferBooking(bookingId: string, counterPrice: number): Promise<Booking> {
    await this.wait();
    const user = this.currentUser(["CLIENT", "DRIVER"]);
    const booking = this.bookingById(parse(idSchema, bookingId));
    const price = parse(positivePriceSchema, counterPrice);
    if (booking.counterPrice !== null) throw new ApiError("COUNTER_OFFER_ALREADY_USED");
    const trip = this.tripById(booking.tripId);
    const responderId =
      booking.status === "PROPOSED_BY_CLIENT" ? trip.driverId :
        booking.status === "PROPOSED_BY_DRIVER" ? booking.clientId : null;
    if (!responderId) throw new ApiError("BOOKING_NOT_CONFIRMABLE");
    if (responderId !== user.id) throw new ApiError("FORBIDDEN");
    booking.counterPrice = price;
    booking.status = user.role === "DRIVER" ? "PROPOSED_BY_DRIVER" : "PROPOSED_BY_CLIENT";
    booking.updatedAt = new Date().toISOString();
    return clone(booking);
  }

  async cancelBooking(bookingId: string): Promise<Booking> {
    await this.wait();
    const user = this.currentUser(["CLIENT", "DRIVER"]);
    const booking = this.bookingById(parse(idSchema, bookingId));
    const trip = this.tripById(booking.tripId);
    if (booking.clientId !== user.id && trip.driverId !== user.id) throw new ApiError("FORBIDDEN");
    if (["COMPLETED", "REFUSED", "EXPIRED"].includes(booking.status)) {
      throw new ApiError("BOOKING_NOT_CONFIRMABLE");
    }
    booking.status = "CANCELLED";
    booking.updatedAt = new Date().toISOString();
    this.recalculateTripStatus(trip);
    return clone(booking);
  }

  async listClientBookings(): Promise<Booking[]> {
    await this.wait();
    const client = this.currentUser(["CLIENT"]);
    return clone(this.data.bookings.filter((booking) => booking.clientId === client.id));
  }

  async listDriverBookings(): Promise<Booking[]> {
    await this.wait();
    const driver = this.currentUser(["DRIVER"]);
    const tripIds = new Set(this.data.trips.filter((trip) => trip.driverId === driver.id).map((trip) => trip.id));
    return clone(this.data.bookings.filter((booking) => tripIds.has(booking.tripId)));
  }

  async listBookingHistory(): Promise<Booking[]> {
    await this.wait();
    const user = this.currentUser(["CLIENT", "DRIVER"]);
    const driverTripIds = new Set(this.data.trips.filter((trip) => trip.driverId === user.id).map((trip) => trip.id));
    return clone(
      this.data.bookings.filter(
        (booking) =>
          ["COMPLETED", "CANCELLED", "REFUSED", "EXPIRED"].includes(booking.status) &&
          (booking.clientId === user.id || driverTripIds.has(booking.tripId)),
      ),
    );
  }

  async createRating(input: CreateRatingInput): Promise<Rating> {
    await this.wait();
    const values = parse(ratingSchema, input);
    const user = this.currentUser(["CLIENT", "DRIVER"]);
    const booking = this.bookingById(values.bookingId);
    if (booking.status !== "COMPLETED") throw new ApiError("RATING_NOT_ALLOWED");
    if (this.data.ratings.some((rating) => rating.bookingId === booking.id && rating.authorId === user.id)) {
      throw new ApiError("RATING_NOT_ALLOWED");
    }
    const rating: Rating = {
      id: this.nextId("rating"),
      bookingId: booking.id,
      authorId: user.id,
      targetId: values.targetId,
      score: values.score,
      comment: values.comment ?? null,
      createdAt: new Date().toISOString(),
    };
    this.data.ratings.push(rating);
    return clone(rating);
  }

  async getWallet(): Promise<Wallet> {
    await this.wait();
    const driver = this.currentUser(["DRIVER"]);
    const transactions = this.data.transactions.filter((transaction) => transaction.userId === driver.id);
    return clone({
      balance: transactions.reduce((sum, transaction) => sum + transaction.amount, 0),
      earnings: transactions.filter((transaction) => transaction.type === "PAYOUT").reduce((sum, transaction) => sum + transaction.amount, 0),
      commissions: Math.abs(transactions.filter((transaction) => transaction.type === "COMMISSION").reduce((sum, transaction) => sum + transaction.amount, 0)),
      transactions,
    });
  }
}

export function createMockApi(options: MockApiOptions = {}): Api {
  return new MockApi(options);
}

export const mockApi: Api = createMockApi();
