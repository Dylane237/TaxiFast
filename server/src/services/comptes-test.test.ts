import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  AucunSmsSender,
  AuthenticationError,
  AuthenticationService,
  createDefaultAuthentication,
  type OtpSender,
  type OtpStore,
  type TokenService,
} from "./authentication.js";
import { lireComptesTest } from "./comptes-test.js";

const vraiSecret = "un-vrai-secret-de-production-tres-long-0001";
const prisma = {} as PrismaClient;

describe("lecture des comptes de test", () => {
  it("ne crée rien quand les deux variables sont absentes", () => {
    expect(lireComptesTest({})).toBeNull();
  });

  it("lit les numéros, espaces compris, et le code", () => {
    const comptes = lireComptesTest({ TEST_OTP_PHONES: "+237 670000000, +237690000000", TEST_OTP_CODE: "482917" });
    expect([...comptes!.numeros]).toEqual(["+237670000000", "+237690000000"]);
    expect(comptes!.code).toBe("482917");
  });

  it("exige les deux variables ensemble", () => {
    expect(() => lireComptesTest({ TEST_OTP_PHONES: "+237670000000" })).toThrow(/vont ensemble/);
    expect(() => lireComptesTest({ TEST_OTP_CODE: "482917" })).toThrow(/vont ensemble/);
  });

  it("refuse un code mal formé ou trop facile", () => {
    const TEST_OTP_PHONES = "+237670000000";
    expect(() => lireComptesTest({ TEST_OTP_PHONES, TEST_OTP_CODE: "12345" })).toThrow(/6 chiffres/);
    for (const TEST_OTP_CODE of ["123456", "000000", "777777"]) {
      expect(() => lireComptesTest({ TEST_OTP_PHONES, TEST_OTP_CODE })).toThrow(/trop facile/);
    }
  });

  it("refuse un numéro qui n'est pas au format international, et les listes trop longues", () => {
    expect(() => lireComptesTest({ TEST_OTP_PHONES: "670000000", TEST_OTP_CODE: "482917" })).toThrow(/format international/);
    const six = Array.from({ length: 6 }, (_, i) => `+23767000000${i}`).join(",");
    expect(() => lireComptesTest({ TEST_OTP_PHONES: six, TEST_OTP_CODE: "482917" })).toThrow(/5 numéros au maximum/);
  });
});

describe("démarrage en production", () => {
  it("refuse toujours de démarrer sans SMS ni comptes de test", () => {
    expect(() => createDefaultAuthentication(prisma, { JWT_SECRET: vraiSecret, NODE_ENV: "production" })).toThrow(
      /Aucun fournisseur SMS/,
    );
  });

  it("démarre sans SMS quand des comptes de test sont définis", () => {
    expect(() =>
      createDefaultAuthentication(prisma, {
        JWT_SECRET: vraiSecret,
        NODE_ENV: "production",
        TEST_OTP_PHONES: "+237670000000",
        TEST_OTP_CODE: "482917",
      }),
    ).not.toThrow();
  });
});

describe("connexion avec des comptes de test", () => {
  function service(expediteur: OtpSender) {
    const store: OtpStore = { issue: vi.fn(async () => {}), verify: vi.fn(), revoke: vi.fn(async () => {}) } as unknown as OtpStore;
    const jetons = {} as TokenService;
    const comptes = lireComptesTest({ TEST_OTP_PHONES: "+237670000000,+237690000000", TEST_OTP_CODE: "482917" });
    return { store, auth: new AuthenticationService(prisma, store, expediteur, jetons, undefined, comptes) };
  }

  it("enregistre le code fixe pour un numéro de test, sans envoyer de SMS", async () => {
    const envoi = vi.fn(async () => {});
    const { store, auth } = service({ send: envoi });
    await auth.requestOtp({ phone: "+237670000000" });
    expect(store.issue).toHaveBeenCalledWith("+237670000000", "482917");
    expect(envoi).not.toHaveBeenCalled();
  });

  it("refuse les autres numéros quand aucun SMS ne peut partir", async () => {
    const { store, auth } = service(new AucunSmsSender());
    await expect(auth.requestOtp({ phone: "+237655555555" })).rejects.toEqual(new AuthenticationError("OTP_DELIVERY_FAILED"));
    expect(store.revoke).toHaveBeenCalledWith("+237655555555");
  });

  it("ne donne jamais le code de test à un autre numéro", async () => {
    const envoi = vi.fn(async () => {});
    const { store, auth } = service({ send: envoi });
    await auth.requestOtp({ phone: "+237655555555" });
    expect(store.issue).not.toHaveBeenCalledWith("+237655555555", "482917");
    expect(envoi).toHaveBeenCalledOnce();
  });
});
