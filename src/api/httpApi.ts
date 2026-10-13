import type { Api } from "./api";
import { ApiError } from "./errors";

function notConnected<T>(): Promise<T> {
  return Promise.reject(
    new ApiError("NOT_IMPLEMENTED", "Le serveur n’est pas encore branché."),
  );
}

export const httpApi: Api = {
  requestOtp: () => notConnected(),
  verifyOtp: () => notConnected(),
  restoreSession: () => notConnected(),
  signOut: () => notConnected(),
  getCurrentUser: () => notConnected(),
  updateProfile: () => notConnected(),
  listCorridors: () => notConnected(),
  createTrip: () => notConnected(),
  listDriverTrips: () => notConnected(),
  getTripManifest: () => notConnected(),
  closeTrip: () => notConnected(),
  createTripRequest: () => notConnected(),
  listClientTripRequests: () => notConnected(),
  cancelTripRequest: () => notConnected(),
  listTripsForRequest: () => notConnected(),
  listRequestsForTrip: () => notConnected(),
  proposeBooking: () => notConnected(),
  acceptBooking: () => notConnected(),
  refuseBooking: () => notConnected(),
  counterOfferBooking: () => notConnected(),
  cancelBooking: () => notConnected(),
  listClientBookings: () => notConnected(),
  listDriverBookings: () => notConnected(),
  listBookingHistory: () => notConnected(),
  createRating: () => notConnected(),
  getWallet: () => notConnected(),
};
