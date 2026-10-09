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
  | "NOT_IMPLEMENTED";

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
