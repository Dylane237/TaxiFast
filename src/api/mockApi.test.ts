import { describe, expect, it } from "vitest";
import { ApiError } from "./errors";
import { createMockApi } from "./mockApi";
import { mockIds } from "./mockData";

const instantApi = (initialUserId?: string | null) =>
  createMockApi({ minDelayMs: 0, maxDelayMs: 0, initialUserId });

describe("MockApi", () => {
  it("accepte le code OTP fictif 1234", async () => {
    const api = instantApi(null);
    await api.requestOtp("+237699000001");

    const result = await api.verifyOtp("+237699000001", "1234", "CLIENT");

    expect(result.token).toMatch(/^mock-token-/);
    expect(result.user.phone).toBe("+237699000001");
  });

  it("restaure une session fictive à partir du jeton et du profil sécurisés", async () => {
    const firstApi = instantApi(null);
    await firstApi.requestOtp("+237699000001");
    const session = await firstApi.verifyOtp("+237699000001", "1234", "DRIVER");
    const profile = await firstApi.updateProfile({
      name: "Marcel",
      plate: "LT 999 ZZ",
      seats: 4,
    });
    const restartedApi = instantApi(null);

    await restartedApi.restoreSession(session.token, profile);

    await expect(restartedApi.getCurrentUser()).resolves.toEqual(profile);
  });

  it("permet au chauffeur de publier puis retrouver un trajet ordonné", async () => {
    const api = instantApi(mockIds.driver);
    const departureAt = new Date(Date.now() + 30 * 60_000).toISOString();

    const trip = await api.createTrip({
      corridorId: "corridor-1",
      capacity: 2,
      departureAt,
      stopIds: ["c1-stop-1", "c1-stop-3", "c1-stop-5"],
    });

    expect(trip.tripStops.map((stop) => stop.stopId)).toEqual([
      "c1-stop-1",
      "c1-stop-3",
      "c1-stop-5",
    ]);
    await expect(api.listDriverTrips()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: trip.id, status: "OPEN" }),
      ]),
    );
  });

  it("permet de modifier puis d'annuler un trajet fictif", async () => {
    const api = instantApi(mockIds.driver);
    const trip = await api.createTrip({
      corridorId: "corridor-1",
      capacity: 3,
      departureAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      stopIds: ["c1-stop-1", "c1-stop-3"],
    });

    await expect(api.updateTrip(trip.id, {
      corridorId: "corridor-2",
      stopIds: ["c2-stop-1", "c2-stop-3", "c2-stop-5"],
      capacity: 2,
    })).resolves.toMatchObject({ corridorId: "corridor-2", capacity: 2 });
    await expect(api.cancelTrip(trip.id)).resolves.toMatchObject({ status: "CANCELLED" });
  });

  it("modifie une demande ouverte et annule ses offres en attente", async () => {
    const api = instantApi(mockIds.client);

    await expect(api.updateTripRequest("request-1", {
      corridorId: "corridor-2",
      fromStopId: "c2-stop-1",
      toStopId: "c2-stop-4",
      proposedPrice: 1900,
    })).resolves.toMatchObject({ corridorId: "corridor-2", proposedPrice: 1900 });
    await expect(api.cancelTripRequest("request-1")).resolves.toMatchObject({ status: "CANCELLED" });
  });

  it("protège les arrêts d'une réservation confirmée pendant une modification", async () => {
    const api = instantApi(mockIds.driver);

    await expect(api.updateTrip(mockIds.tripWithOneSeatLeft, {
      stopIds: ["c1-stop-4", "c1-stop-5"],
    })).rejects.toMatchObject({ code: "INVALID_BOOKING_STOPS" });
  });

  it("publie la position fictive du chauffeur", async () => {
    const api = instantApi(mockIds.driver);
    const location = await api.updateTripLocation(mockIds.tripWithOneSeatLeft, {
      latitude: 4.0511,
      longitude: 9.7679,
      accuracy: 10,
      heading: 90,
    });

    expect(location).toMatchObject({ latitude: 4.0511, longitude: 9.7679 });
    await expect(api.getTripLocation(mockIds.tripWithOneSeatLeft)).resolves.toMatchObject({ heading: 90 });
  });

  it("ne confirme qu’une réservation sur la dernière place disponible", async () => {
    const api = instantApi(mockIds.driver);

    const results = await Promise.allSettled([
      api.acceptBooking("booking-pending-a"),
      api.acceptBooking("booking-pending-b"),
    ]);

    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.status).toBe("rejected");
    if (rejected?.status === "rejected") {
      expect(rejected.reason).toBeInstanceOf(ApiError);
      expect((rejected.reason as ApiError).code).toBe("CAPACITY_EXCEEDED");
    }
  });

  it("empêche une deuxième contre-proposition", async () => {
    const api = instantApi(mockIds.client);

    await expect(
      api.counterOfferBooking("booking-countered", 1800),
    ).rejects.toMatchObject({
      code: "COUNTER_OFFER_ALREADY_USED",
    });
  });

  it("permet au client d’accepter une offre chauffeur détaillée", async () => {
    const api = instantApi(mockIds.client);

    const details = await api.getBookingDetails("booking-driver-offer");
    expect(details).toMatchObject({
      driver: {
        name: "Brigitte",
        rating: 5,
        vehicle: { model: "Toyota Yaris" },
      },
    });

    await expect(
      api.acceptBooking("booking-driver-offer"),
    ).resolves.toMatchObject({
      status: "CONFIRMED",
      agreedPrice: 1700,
    });
  });

  it("expose une réservation refusée dans l’historique du client concerné", async () => {
    const api = instantApi(mockIds.secondClient);

    const history = await api.listBookingHistory();

    expect(history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "booking-refused", status: "REFUSED" }),
      ]),
    );
  });

  it("ne propose pas un trajet plein à une demande compatible", async () => {
    const api = instantApi(mockIds.secondClient);

    const matches = await api.listTripsForRequest("request-2");

    expect(matches).toHaveLength(0);
  });

  it("fournit le manifeste puis clôt le trajet et ses réservations confirmées", async () => {
    const api = instantApi(mockIds.driver);

    const manifest = await api.getTripManifest(mockIds.tripWithOneSeatLeft);
    expect(manifest.passengers).toEqual([
      expect.objectContaining({
        clientName: "Patrick",
        pickupStopId: "c1-stop-1",
        dropoffStopId: "c1-stop-3",
      }),
    ]);

    const trip = await api.closeTrip(mockIds.tripWithOneSeatLeft);
    expect(trip.status).toBe("COMPLETED");
    await expect(api.listBookingHistory()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "booking-confirmed",
          status: "COMPLETED",
        }),
      ]),
    );
  });

  it("expose les détails d’une course et empêche une double notation", async () => {
    const api = instantApi(mockIds.client);

    const details = await api.getBookingDetails("booking-history");
    expect(details).toMatchObject({
      pickupStop: { name: "Carrefour Central" },
      dropoffStop: { name: "Gare Routière" },
      driver: { name: "Alain" },
      ratedByCurrentUser: false,
    });

    await expect(
      api.createRating({
        bookingId: "booking-history",
        targetId: mockIds.secondClient,
        score: 5,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await api.createRating({
      bookingId: "booking-history",
      targetId: details.driver.id,
      score: 5,
      comment: "Très bien",
    });
    await expect(
      api.createRating({
        bookingId: "booking-history",
        targetId: details.driver.id,
        score: 4,
      }),
    ).rejects.toMatchObject({ code: "RATING_NOT_ALLOWED" });
  });

  it("calcule le portefeuille du chauffeur à partir de ses transactions", async () => {
    const api = instantApi(mockIds.driver);

    await expect(api.getWallet()).resolves.toMatchObject({
      balance: 2480,
      earnings: 2790,
      commissions: 310,
    });
  });
});
