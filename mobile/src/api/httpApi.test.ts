import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./errors";
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
});
