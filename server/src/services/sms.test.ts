import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import {
  AuthenticationService,
  createDefaultAuthentication,
  JwtTokenService,
  MemoryOtpStore,
} from "./authentication.js";
import { lireConfigTwilio, texteCodeConnexion, TwilioSmsSender } from "./sms.js";

const config = {
  accountSid: `AC${"a".repeat(32)}`,
  authToken: "jeton-twilio-de-test",
  expediteur: "+15005550006",
};

function reponse(statut: number, corps: unknown = {}) {
  return new Response(JSON.stringify(corps), { status: statut, headers: { "Content-Type": "application/json" } });
}

describe("lecture de la configuration Twilio", () => {
  it("renvoie null quand rien n'est défini", () => {
    expect(lireConfigTwilio({})).toBeNull();
  });

  it("refuse une configuration à moitié remplie", () => {
    expect(() => lireConfigTwilio({ TWILIO_ACCOUNT_SID: config.accountSid })).toThrow(/doivent être définis ensemble/);
  });

  it("refuse un Account SID mal formé", () => {
    expect(() =>
      lireConfigTwilio({ TWILIO_ACCOUNT_SID: "SK123", TWILIO_AUTH_TOKEN: "x", TWILIO_FROM: "TaxiFast" }),
    ).toThrow(/AC suivi de 32/);
  });

  it("lit une configuration complète", () => {
    expect(
      lireConfigTwilio({
        TWILIO_ACCOUNT_SID: config.accountSid,
        TWILIO_AUTH_TOKEN: config.authToken,
        TWILIO_FROM: " TaxiFast ",
      }),
    ).toEqual({ ...config, expediteur: "TaxiFast" });
  });
});

describe("envoi par Twilio", () => {
  it("appelle l'API Messages avec l'authentification et le texte en français", async () => {
    const envoyer = vi.fn().mockResolvedValue(reponse(201, { sid: "SM1" }));
    await new TwilioSmsSender(config, envoyer).send("+237690000001", "482913");

    const [url, init] = envoyer.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`);
    expect(new Headers(init.headers).get("Authorization")).toBe(
      `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`,
    );
    const corps = init.body as URLSearchParams;
    expect(corps.get("To")).toBe("+237690000001");
    expect(corps.get("From")).toBe(config.expediteur);
    expect(corps.get("Body")).toBe(texteCodeConnexion("482913"));
  });

  it("signale un refus sans révéler le code ni le jeton", async () => {
    const envoyer = vi.fn().mockResolvedValue(reponse(400, { code: 21211, message: "Invalid 'To' Phone Number" }));
    const erreur = await new TwilioSmsSender(config, envoyer).send("+237690000001", "482913").catch((e: Error) => e);

    expect(erreur).toBeInstanceOf(Error);
    expect((erreur as Error).message).toContain("21211");
    expect((erreur as Error).message).not.toContain("482913");
    expect((erreur as Error).message).not.toContain(config.authToken);
  });
});

describe("choix de l'envoi au démarrage", () => {
  const secret = "un-vrai-secret-de-production-tres-long-0001";

  it("refuse de démarrer en production sans fournisseur SMS", () => {
    expect(() => createDefaultAuthentication({} as PrismaClient, { JWT_SECRET: secret, NODE_ENV: "production" })).toThrow(
      /Aucun fournisseur SMS/,
    );
  });

  it("démarre en production quand Twilio est configuré", () => {
    expect(() =>
      createDefaultAuthentication({} as PrismaClient, {
        JWT_SECRET: secret,
        NODE_ENV: "production",
        TWILIO_ACCOUNT_SID: config.accountSid,
        TWILIO_AUTH_TOKEN: config.authToken,
        TWILIO_FROM: config.expediteur,
      }),
    ).not.toThrow();
  });
});

describe("échec d'envoi du SMS", () => {
  const apps: ReturnType<typeof buildApp>[] = [];
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it("répond 503 et laisse redemander un code tout de suite", async () => {
    const store = new MemoryOtpStore();
    const send = vi.fn().mockRejectedValueOnce(new Error("Twilio en panne")).mockResolvedValueOnce(undefined);
    const authentication = new AuthenticationService(
      {} as PrismaClient,
      store,
      { send },
      new JwtTokenService("secret-de-test-uniquement-0123456789abcdef"),
      () => "123456",
    );
    const app = buildApp({ prisma: {} as PrismaClient, authentication });
    apps.push(app);
    const demande = () => app.inject({ method: "POST", url: "/auth/otp/request", payload: { phone: "+237690000001" } });

    const echec = await demande();
    expect(echec.statusCode).toBe(503);
    expect(echec.json()).toEqual({ error: "OTP_DELIVERY_FAILED" });
    expect((await demande()).statusCode).toBe(202);
  });
});
