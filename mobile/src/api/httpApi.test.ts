import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, messageLimiteDebit } from "./errors";
import { httpApi } from "./httpApi";

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(async () => {
  vi.unstubAllGlobals();
  await httpApi.signOut();
});

describe("httpApi", () => {
  it("conserve le jeton vérifié et l'envoie dans Authorization", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          token: "jwt-test",
          user: {
            id: "client-1",
            phone: "+237690000001",
            name: null,
            role: "CLIENT",
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ corridors: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await httpApi.verifyOtp("+237690000001", "123456", "CLIENT");
    await expect(httpApi.listCorridors()).resolves.toEqual([]);

    const secondRequest = fetchMock.mock.calls[1]![1] as RequestInit;
    expect(new Headers(secondRequest.headers).get("Authorization")).toBe(
      "Bearer jwt-test",
    );
  });

  it("convertit une panne fetch en erreur réseau explicite", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    await expect(httpApi.listCorridors()).rejects.toMatchObject({
      name: "ApiError",
      code: "NETWORK_ERROR",
    });
  });

  it("traduit une panne du serveur en SERVER_ERROR, pas en erreur de saisie", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "INTERNAL_ERROR" }, 500)),
    );

    await expect(httpApi.listCorridors()).rejects.toMatchObject({
      name: "ApiError",
      code: "SERVER_ERROR",
    });
  });

  it("refuse une réponse serveur qui ne respecte pas le contrat", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ corridors: [{ id: 4 }] })),
    );

    await expect(httpApi.listCorridors()).rejects.toMatchObject({
      name: "ApiError",
      code: "INVALID_RESPONSE",
    } satisfies Partial<ApiError>);
  });

  it("annonce le temps d'attente quand le serveur freine les requêtes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "RATE_LIMITED", retryAfterSeconds: 540 }, 429)),
    );

    await expect(httpApi.listCorridors()).rejects.toMatchObject({
      code: "RATE_LIMITED",
      message: "Doucement ! Réessayez dans 9 min.",
    });
  });

  it.each([
    ["OTP_RATE_LIMITED", 429],
    ["OTP_DELIVERY_FAILED", 503],
    ["TRIP_NOT_STARTED", 409],
    ["TOO_MANY_OPEN_REQUESTS", 409],
    ["BOOKING_ALREADY_PENDING", 409],
  ])("garde le code serveur %s au lieu d'une erreur générique", async (erreur, statut) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: erreur }, statut)));

    await expect(httpApi.listCorridors()).rejects.toMatchObject({ code: erreur });
  });
});

describe("message de limite de débit", () => {
  it("s'adapte au temps d'attente", () => {
    expect(messageLimiteDebit(undefined)).toMatch(/quelques minutes/);
    expect(messageLimiteDebit(20)).toBe("Doucement ! Réessayez dans moins d’une minute.");
    expect(messageLimiteDebit(61)).toBe("Doucement ! Réessayez dans 2 min.");
  });
});
