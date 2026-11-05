import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { AuthenticationError, PrismaOtpStore } from "./authentication.js";

type Ligne = { phone: string; codeDigest: Uint8Array; expiresAt: Date; attemptsRemaining: number; sentAt: Date };
type Filtre = {
  phone: string;
  attemptsRemaining?: { gt?: number; lte?: number };
  expiresAt?: { gt?: Date };
};

/** Imite les seules requêtes OtpChallenge utilisées par le stockage, avec la même sémantique. */
function fauxPrisma() {
  const lignes = new Map<string, Ligne>();
  const correspond = (ligne: Ligne, filtre: Filtre) =>
    ligne.phone === filtre.phone &&
    (filtre.attemptsRemaining?.gt === undefined || ligne.attemptsRemaining > filtre.attemptsRemaining.gt) &&
    (filtre.attemptsRemaining?.lte === undefined || ligne.attemptsRemaining <= filtre.attemptsRemaining.lte) &&
    (filtre.expiresAt?.gt === undefined || ligne.expiresAt > filtre.expiresAt.gt);
  const otpChallenge = {
    async findUnique({ where }: { where: { phone: string } }) {
      const ligne = lignes.get(where.phone);
      return ligne ? { ...ligne } : null;
    },
    async upsert({ where, create, update }: { where: { phone: string }; create: Ligne; update: Omit<Ligne, "phone"> }) {
      lignes.set(where.phone, lignes.has(where.phone) ? { phone: where.phone, ...update } : create);
    },
    async updateMany({ where }: { where: Filtre }) {
      const ligne = lignes.get(where.phone);
      if (!ligne || !correspond(ligne, where)) return { count: 0 };
      ligne.attemptsRemaining -= 1;
      return { count: 1 };
    },
    async deleteMany({ where }: { where: Filtre }) {
      const ligne = lignes.get(where.phone);
      if (!ligne || !correspond(ligne, where)) return { count: 0 };
      lignes.delete(where.phone);
      return { count: 1 };
    },
  };
  return { prisma: { otpChallenge } as unknown as PrismaClient, lignes };
}

const numero = "+237690000001";

describe("stockage des codes OTP en base", () => {
  it("valide le bon code une seule fois", async () => {
    const { prisma } = fauxPrisma();
    const store = new PrismaOtpStore(prisma);
    await store.issue(numero, "123456");

    expect(await store.verify(numero, "123456")).toBe("VALID");
    expect(await store.verify(numero, "123456")).toBe("INVALID");
  });

  it("ne garde que l'empreinte du code, jamais le code lui-même", async () => {
    const { prisma, lignes } = fauxPrisma();
    await new PrismaOtpStore(prisma).issue(numero, "123456");
    expect(Buffer.from(lignes.get(numero)!.codeDigest).toString("utf8")).not.toContain("123456");
  });

  it("bloque le code après 5 mauvais essais", async () => {
    const { prisma } = fauxPrisma();
    const store = new PrismaOtpStore(prisma);
    await store.issue(numero, "123456");
    for (let i = 0; i < 5; i += 1) expect(await store.verify(numero, "000000")).toBe("INVALID");

    expect(await store.verify(numero, "123456")).toBe("INVALID");
  });

  it("ne laisse pas une rafale d'essais en parallèle dépasser 5 tentatives", async () => {
    const { prisma } = fauxPrisma();
    const store = new PrismaOtpStore(prisma);
    await store.issue(numero, "123456");

    const essais = Array.from({ length: 10 }, (_, i) => store.verify(numero, String(i).padStart(6, "9")));
    expect(await Promise.all(essais)).toEqual(Array(10).fill("INVALID"));
    expect(await store.verify(numero, "123456")).toBe("INVALID");
  });

  it("signale un code expiré", async () => {
    const { prisma } = fauxPrisma();
    const store = new PrismaOtpStore(prisma, 1_000);
    const envoi = new Date("2026-11-05T10:00:00Z");
    await store.issue(numero, "123456", envoi);

    expect(await store.verify(numero, "123456", new Date("2026-11-05T10:00:02Z"))).toBe("EXPIRED");
  });

  it("refuse un nouveau code moins d'une minute après le précédent", async () => {
    const { prisma } = fauxPrisma();
    const store = new PrismaOtpStore(prisma);
    const envoi = new Date("2026-11-05T10:00:00Z");
    await store.issue(numero, "123456", envoi);

    await expect(store.issue(numero, "654321", new Date("2026-11-05T10:00:30Z"))).rejects.toEqual(
      new AuthenticationError("OTP_RATE_LIMITED"),
    );
    await expect(store.issue(numero, "654321", new Date("2026-11-05T10:01:01Z"))).resolves.toBeUndefined();
  });

  it("efface le code quand l'envoi du SMS échoue", async () => {
    const { prisma, lignes } = fauxPrisma();
    const store = new PrismaOtpStore(prisma);
    await store.issue(numero, "123456");
    await store.revoke(numero);
    expect(lignes.has(numero)).toBe(false);
  });
});
