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

  it("ne confirme qu’une réservation sur la dernière place disponible", async () => {
    const api = instantApi(mockIds.driver);

    const results = await Promise.allSettled([
      api.acceptBooking("booking-pending-a"),
      api.acceptBooking("booking-pending-b"),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.status).toBe("rejected");
    if (rejected?.status === "rejected") {
      expect(rejected.reason).toBeInstanceOf(ApiError);
      expect((rejected.reason as ApiError).code).toBe("CAPACITY_EXCEEDED");
    }
  });

  it("empêche une deuxième contre-proposition", async () => {
    const api = instantApi(mockIds.client);

    await expect(api.counterOfferBooking("booking-countered", 1800)).rejects.toMatchObject({
      code: "COUNTER_OFFER_ALREADY_USED",
    });
  });

  it("expose une réservation refusée dans l’historique du client concerné", async () => {
    const api = instantApi(mockIds.secondClient);

    const history = await api.listBookingHistory();

    expect(history).toEqual(expect.arrayContaining([expect.objectContaining({ id: "booking-refused", status: "REFUSED" })]));
  });

  it("ne propose pas un trajet plein à une demande compatible", async () => {
    const api = instantApi(mockIds.secondClient);

    const matches = await api.listTripsForRequest("request-2");

    expect(matches).toHaveLength(0);
  });
});
