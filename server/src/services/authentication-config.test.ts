import type { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { afterEach, describe, expect, it } from "vitest";
import {
  AuthenticationError,
  createDefaultAuthentication,
  DevelopmentOtpSender,
  isDevelopmentEnvironment,
} from "./authentication.js";

const prisma = {} as PrismaClient;
const vraiSecret = "un-vrai-secret-de-production-tres-long-0001";

async function jetonSigne(secret: string) {
  return new SignJWT({ role: "DRIVER", phone: "+237600000000" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject("utilisateur-invente")
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));
}

describe("configuration de l'authentification", () => {
  it("refuse de démarrer sans JWT_SECRET, quel que soit NODE_ENV", () => {
    for (const NODE_ENV of [undefined, "development", "production"]) {
      expect(() => createDefaultAuthentication(prisma, { NODE_ENV })).toThrow(/JWT_SECRET est obligatoire/);
    }
  });

  it("refuse les secrets déjà publiés", () => {
    for (const JWT_SECRET of [
      "development-only-jwt-secret-change-before-production",
      "replace-with-at-least-32-random-characters",
    ]) {
      expect(() => createDefaultAuthentication(prisma, { JWT_SECRET })).toThrow(/valeur d'exemple publique/);
    }
  });

  it("rejette un jeton signé avec l'ancien secret de repli", async () => {
    const auth = createDefaultAuthentication(prisma, { JWT_SECRET: vraiSecret, NODE_ENV: "test" });
    const forge = await jetonSigne("development-only-jwt-secret-change-before-production");
    await expect(auth.authenticate(forge)).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("accepte un jeton signé avec le bon secret", async () => {
    const auth = createDefaultAuthentication(prisma, { JWT_SECRET: vraiSecret, NODE_ENV: "test" });
    await expect(auth.authenticate(await jetonSigne(vraiSecret))).resolves.toMatchObject({ role: "DRIVER" });
  });

  it("refuse un code OTP fixe hors développement explicite", () => {
    for (const NODE_ENV of [undefined, "production", "staging"]) {
      expect(() =>
        createDefaultAuthentication(prisma, { JWT_SECRET: vraiSecret, DEV_OTP_CODE: "123456", NODE_ENV }),
      ).toThrow(/DEV_OTP_CODE n'est accepté que/);
    }
  });

  it("accepte un code OTP fixe en développement", () => {
    expect(() =>
      createDefaultAuthentication(prisma, { JWT_SECRET: vraiSecret, DEV_OTP_CODE: "123456", NODE_ENV: "development" }),
    ).not.toThrow();
  });
});

describe("environnement de développement", () => {
  const nodeEnvInitial = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = nodeEnvInitial;
  });

  it("ne considère comme développement que development et test", () => {
    expect(isDevelopmentEnvironment("development")).toBe(true);
    expect(isDevelopmentEnvironment("test")).toBe(true);
    expect(isDevelopmentEnvironment(undefined)).toBe(false);
    expect(isDevelopmentEnvironment("prod")).toBe(false);
  });

  it("n'affiche pas les codes OTP quand NODE_ENV est absent", async () => {
    delete process.env.NODE_ENV;
    await expect(new DevelopmentOtpSender().send("+237600000000", "123456")).rejects.toThrow(
      /Aucun fournisseur OTP/,
    );
  });
});
