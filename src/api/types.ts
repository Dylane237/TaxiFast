export type IsoDateString = string;

export type Role = "CLIENT" | "DRIVER" | "ADMIN";
export type TripStatus = "OPEN" | "FULL" | "CLOSED" | "COMPLETED" | "CANCELLED";
export type RequestStatus = "OPEN" | "MATCHED" | "EXPIRED" | "CANCELLED";
export type BookingInitiator = "CLIENT" | "DRIVER";
export type BookingStatus =
  | "PROPOSED_BY_CLIENT"
  | "PROPOSED_BY_DRIVER"
  | "CONFIRMED"
  | "REFUSED"
  | "EXPIRED"
  | "CANCELLED"
  | "COMPLETED";

// Forme exacte de `user` renvoyée par POST /auth/otp/verify.
export type User = {
  id: string;
  phone: string;
  name: string | null;
  role: Role;
};

export type Vehicle = {
  id: string;
  driverId: string;
  plate: string;
  model: string | null;
  seats: number;
};

// Contrat proposé : aucune route de profil n'existe encore côté serveur.
export type UserProfile = User & {
  vehicle: Vehicle | null;
};

export type Stop = {
  id: string;
  corridorId: string;
  name: string;
  position: number;
};

// Contrat proposé : aucune route ne liste encore les axes.
export type Corridor = {
  id: string;
  name: string;
  stops: Stop[];
};

export type TripStop = {
  id: string;
  tripId: string;
  stopId: string;
  sequence: number;
  stop: Stop;
};

// Forme renvoyée par POST /trips.
export type Trip = {
  id: string;
  driverId: string;
  corridorId: string;
  capacity: number;
  departureAt: IsoDateString;
  status: TripStatus;
  createdAt: IsoDateString;
  tripStops: TripStop[];
};

// Forme d'un élément de GET /matching/requests/:requestId/trips.
export type MatchedTrip = {
  id: string;
  corridorId: string;
  capacity: number;
  departureAt: IsoDateString;
  status: TripStatus;
  driver: Pick<User, "id" | "name">;
  tripStops: {
    sequence: number;
    stopId: string;
    stop: Pick<Stop, "id" | "name">;
  }[];
};

// Forme renvoyée par POST /trip-requests.
export type TripRequest = {
  id: string;
  clientId: string;
  corridorId: string;
  fromStopId: string;
  toStopId: string;
  windowStart: IsoDateString;
  windowEnd: IsoDateString;
  proposedPrice: number;
  status: RequestStatus;
  createdAt: IsoDateString;
};

// Forme d'un élément de GET /matching/trips/:tripId/requests.
export type MatchedTripRequest = {
  id: string;
  clientId: string;
  fromStopId: string;
  toStopId: string;
  windowStart: IsoDateString;
  windowEnd: IsoDateString;
  proposedPrice: number;
  client: Pick<User, "id" | "name">;
  fromStop: Pick<Stop, "id" | "name">;
  toStop: Pick<Stop, "id" | "name">;
};

// Forme renvoyée par les routes /bookings existantes.
export type Booking = {
  id: string;
  tripId: string;
  clientId: string;
  requestId: string | null;
  pickupStopId: string;
  dropoffStopId: string;
  initiatedBy: BookingInitiator;
  status: BookingStatus;
  proposedPrice: number;
  counterPrice: number | null;
  agreedPrice: number | null;
  commission: number | null;
  expiresAt: IsoDateString | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

// Contrat proposé pour l'écran chauffeur « Trajet en cours ».
// Le serveur ne possède pas encore la route correspondante.
export type TripManifestPassenger = {
  bookingId: string;
  clientId: string;
  clientName: string | null;
  pickupStopId: string;
  dropoffStopId: string;
};

export type TripManifest = {
  trip: Trip;
  passengers: TripManifestPassenger[];
};

export type AuthResult = { token: string; user: User };
export type OtpRequestResult = { status: "OTP_SENT" };

export type CreateTripInput = {
  corridorId: string;
  capacity: number;
  departureAt: IsoDateString;
  stopIds: string[];
};

export type CreateTripRequestInput = {
  corridorId: string;
  fromStopId: string;
  toStopId: string;
  windowStart: IsoDateString;
  windowEnd: IsoDateString;
  proposedPrice: number;
};

export type ProposeBookingInput = {
  tripId: string;
  pickupStopId: string;
  dropoffStopId: string;
  proposedPrice: number;
  requestId?: string;
};

export type UpdateProfileInput = {
  name: string;
  plate?: string;
  model?: string;
  seats?: number;
};

export type Rating = {
  id: string;
  bookingId: string;
  authorId: string;
  targetId: string;
  score: number;
  comment: string | null;
  createdAt: IsoDateString;
};

export type CreateRatingInput = Pick<Rating, "bookingId" | "targetId" | "score"> & {
  comment?: string;
};

export type WalletTransaction = {
  id: string;
  userId: string;
  bookingId: string | null;
  type: "TOPUP" | "COMMISSION" | "PAYOUT";
  amount: number;
  createdAt: IsoDateString;
};

export type Wallet = {
  balance: number;
  earnings: number;
  commissions: number;
  transactions: WalletTransaction[];
};
