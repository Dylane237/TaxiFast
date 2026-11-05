import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { enregistrerGestionErreurs } from "./erreurs.js";
import { enregistrerLimiteDebit, limiteRoute } from "./rate-limit.js";

async function appDeTest() {
  const app = Fastify({ logger: false });
  enregistrerGestionErreurs(app);
  enregistrerLimiteDebit(app);
  await app.register(async (routes) => {
    routes.get("/panne", async () => {
      throw new Error("Invalid `tx.trip.update()` invocation in D:\\serveur\\src\\routes\\trips.ts:351");
    });
    routes.post("/echo", async (request) => request.body);
    routes.get("/limitee", limiteRoute({ max: 1, timeWindow: "1 minute" }), async () => ({ ok: true }));
  });
  return app;
}

describe("gestion des erreurs", () => {
  it("ne renvoie jamais le message interne d'une erreur serveur", async () => {
    const app = await appDeTest();
    const reponse = await app.inject({ method: "GET", url: "/panne" });
    expect(reponse.statusCode).toBe(500);
    expect(reponse.json()).toEqual({ error: "INTERNAL_ERROR" });
    expect(reponse.body).not.toContain("trips.ts");
    expect(reponse.body).not.toContain("invocation");
    await app.close();
  });

  it("répond INVALID_INPUT à un JSON illisible, sans détail", async () => {
    const app = await appDeTest();
    const reponse = await app.inject({ method: "POST", url: "/echo", headers: { "content-type": "application/json" }, payload: "{pas du json" });
    expect(reponse.statusCode).toBe(400);
    expect(reponse.json()).toEqual({ error: "INVALID_INPUT" });
    await app.close();
  });

  it("garde le format de la limite de débit", async () => {
    const app = await appDeTest();
    await app.inject({ method: "GET", url: "/limitee" });
    const reponse = await app.inject({ method: "GET", url: "/limitee" });
    expect(reponse.statusCode).toBe(429);
    expect(reponse.json()).toMatchObject({ error: "RATE_LIMITED" });
    expect(reponse.json().retryAfterSeconds).toBeGreaterThan(0);
    await app.close();
  });
});
