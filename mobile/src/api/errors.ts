export type ApiErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "ROLE_REQUIRED"
  | "OTP_NOT_REQUESTED"
  | "OTP_INVALID"
  | "NOT_FOUND"
  | "TRIP_NOT_OPEN"
  | "INVALID_TRIP_STOPS"
  | "INVALID_BOOKING_STOPS"
  | "BOOKING_NOT_CONFIRMABLE"
  | "BOOKING_EXPIRED"
  | "CAPACITY_EXCEEDED"
  | "COUNTER_OFFER_ALREADY_USED"
  | "RATING_NOT_ALLOWED"
  | "NETWORK_ERROR"
  | "SESSION_EXPIRED"
  | "INVALID_RESPONSE"
  | "NOT_IMPLEMENTED"
  | "RATE_LIMITED"
  | "OTP_RATE_LIMITED"
  | "TOO_MANY_OPEN_REQUESTS"
  | "BOOKING_ALREADY_PENDING"
  | "OTP_DELIVERY_FAILED";

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Message à afficher quand le serveur freine un appareil qui envoie trop de requêtes. */
export function messageLimiteDebit(secondesAvantNouvelEssai?: number): string {
  if (!secondesAvantNouvelEssai || secondesAvantNouvelEssai <= 0) {
    return "Doucement ! Trop de tentatives d’un coup. Patientez quelques minutes avant de réessayer.";
  }
  if (secondesAvantNouvelEssai < 60) return "Doucement ! Réessayez dans moins d’une minute.";
  return `Doucement ! Réessayez dans ${Math.ceil(secondesAvantNouvelEssai / 60)} min.`;
}
