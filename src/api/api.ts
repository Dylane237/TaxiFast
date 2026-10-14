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

export interface Api {
  requestOtp(phone: string): Promise<OtpRequestResult>;
  verifyOtp(
    phone: string,
    code: string,
    role?: Extract<Role, "CLIENT" | "DRIVER">,
  ): Promise<AuthResult>;
  restoreSession(token: string, user: UserProfile): Promise<void>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<UserProfile | null>;
  updateProfile(input: UpdateProfileInput): Promise<UserProfile>;

  listCorridors(): Promise<Corridor[]>;
  createTrip(input: CreateTripInput): Promise<Trip>;
  updateTrip(tripId: string, input: UpdateTripInput): Promise<Trip>;
  cancelTrip(tripId: string): Promise<Trip>;
  listDriverTrips(): Promise<Trip[]>;
  getTripManifest(tripId: string): Promise<TripManifest>;
  closeTrip(tripId: string): Promise<Trip>;

  createTripRequest(input: CreateTripRequestInput): Promise<TripRequest>;
  updateTripRequest(
    requestId: string,
    input: UpdateTripRequestInput,
  ): Promise<TripRequest>;
  listClientTripRequests(): Promise<TripRequest[]>;
  cancelTripRequest(requestId: string): Promise<TripRequest>;
  listTripsForRequest(requestId: string): Promise<MatchedTrip[]>;
  listRequestsForTrip(tripId: string): Promise<MatchedTripRequest[]>;

  proposeBooking(input: ProposeBookingInput): Promise<Booking>;
  acceptBooking(bookingId: string): Promise<Booking>;
  refuseBooking(bookingId: string): Promise<Booking>;
  counterOfferBooking(
    bookingId: string,
    counterPrice: number,
  ): Promise<Booking>;
  cancelBooking(bookingId: string): Promise<Booking>;
  listClientBookings(): Promise<Booking[]>;
  listDriverBookings(): Promise<Booking[]>;
  listBookingHistory(): Promise<Booking[]>;
  getBookingDetails(bookingId: string): Promise<BookingDetails>;

  createRating(input: CreateRatingInput): Promise<Rating>;
  getWallet(): Promise<Wallet>;

  registerPushDevice(input: PushDeviceInput): Promise<void>;
  unregisterPushDevice(token: string): Promise<void>;
  updateTripLocation(
    tripId: string,
    input: UpdateTripLocationInput,
  ): Promise<TripLocation>;
  getTripLocation(tripId: string): Promise<TripLocation | null>;
}
