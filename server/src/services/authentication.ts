import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import type { PrismaClient, Role } from "@prisma/client";
import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";
import { lireConfigTwilio, TwilioSmsSender } from "./sms.js";
import { estCompteTest, lireComptesTest, type ComptesTest } from "./comptes-test.js";
import { lireVerificateurGoogle, type VerificateurGoogle } from "./google.js";

type SignupRole = Extract<Role, "CLIENT" | "DRIVER">;

type AuthenticatedUser = {
  id: string;
  phone: string;
  name: string | null;
  role: Role;
};

export type AuthenticatedPrincipal = {
  userId: string;
  phone: string;
  role: Role;
};

type OtpRecord = {
  digest: Buffer;
  expiresAt: number;
  attemptsRemaining: number;
  sentAt: number;
};

type OtpVerification = "VALID" | "INVALID" | "EXPIRED";

export type AuthenticationErrorCode =
  | "OTP_INVALID"
  | "OTP_EXPIRED"
  | "OTP_RATE_LIMITED"
  | "OTP_DELIVERY_FAILED"
  | "ROLE_REQUIRED"
  | "TOKEN_INVALID"
  | "GOOGLE_NOT_CONFIGURED"
  | "GOOGLE_TOKEN_INVALID"
  | "SIGNUP_REQUIRED"
  | "PHONE_ALREADY_USED";

export class AuthenticationError extends Error {
  constructor(
    public readonly code: AuthenticationErrorCode,
    options?: { cause?: unknown },
  ) {
    super(code, options);
    this.name = "AuthenticationError";
  }
}

function otpDigest(phone: string, code: string): Buffer {
  return createHash("sha256").update(`${phone}:${code}`).digest();
}

export interface OtpStore {
  issue(phone: string, code: string): Promise<void> | void;
  verify(phone: string, code: string): Promise<OtpVerification> | OtpVerification;
  revoke(phone: string): Promise<void> | void;
}

const OTP_TTL_MS = 5 * 60_000;
const OTP_RESEND_DELAY_MS = 60_000;
const OTP_MAX_ATTEMPTS = 5;

function sameDigest(stored: Uint8Array, candidate: Buffer): boolean {
  return stored.length === candidate.length && timingSafeEqual(Buffer.from(stored), candidate);
}

/** Stockage en mémoire, pour les tests : il ne survit pas à un redémarrage. */
export class MemoryOtpStore implements OtpStore {
  private readonly records = new Map<string, OtpRecord>();

  constructor(
    private readonly ttlMs = OTP_TTL_MS,
    private readonly resendDelayMs = OTP_RESEND_DELAY_MS,
    private readonly maxAttempts = OTP_MAX_ATTEMPTS,
  ) {}

  issue(phone: string, code: string, now = Date.now()): void {
    const current = this.records.get(phone);
    if (current && current.sentAt + this.resendDelayMs > now) {
      throw new AuthenticationError("OTP_RATE_LIMITED");
    }

    this.records.set(phone, {
      digest: otpDigest(phone, code),
      expiresAt: now + this.ttlMs,
      attemptsRemaining: this.maxAttempts,
      sentAt: now,
    });
  }

  verify(phone: string, code: string, now = Date.now()): OtpVerification {
    const record = this.records.get(phone);
    if (!record) return "INVALID";
    if (record.expiresAt <= now) {
      this.records.delete(phone);
      return "EXPIRED";
    }

    const candidate = otpDigest(phone, code);
    const valid = sameDigest(record.digest, candidate);
    if (valid) {
      this.records.delete(phone);
      return "VALID";
    }

    record.attemptsRemaining -= 1;
    if (record.attemptsRemaining <= 0) this.records.delete(phone);
    return "INVALID";
  }

  revoke(phone: string): void {
    this.records.delete(phone);
  }
}

/**
 * Stockage en base (table OtpChallenge) : partagé entre instances et durable.
 * Chaque vérification consomme d'abord une tentative en une seule requête conditionnelle,
 * pour qu'une rafale d'essais en parallèle ne puisse pas dépasser le nombre d'essais permis.
 */
export class PrismaOtpStore implements OtpStore {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ttlMs = OTP_TTL_MS,
    private readonly resendDelayMs = OTP_RESEND_DELAY_MS,
    private readonly maxAttempts = OTP_MAX_ATTEMPTS,
  ) {}

  async issue(phone: string, code: string, now = new Date()): Promise<void> {
    const current = await this.prisma.otpChallenge.findUnique({
      where: { phone },
      select: { sentAt: true },
    });
    if (current && current.sentAt.getTime() + this.resendDelayMs > now.getTime()) {
      throw new AuthenticationError("OTP_RATE_LIMITED");
    }

    const data = {
      // Prisma attend un Uint8Array adossé à un ArrayBuffer simple.
      codeDigest: new Uint8Array(otpDigest(phone, code)),
      expiresAt: new Date(now.getTime() + this.ttlMs),
      attemptsRemaining: this.maxAttempts,
      sentAt: now,
    };
    await this.prisma.otpChallenge.upsert({
      where: { phone },
      create: { phone, ...data },
      update: data,
    });
  }

  async verify(phone: string, code: string, now = new Date()): Promise<OtpVerification> {
    const consumed = await this.prisma.otpChallenge.updateMany({
      where: { phone, attemptsRemaining: { gt: 0 }, expiresAt: { gt: now } },
      data: { attemptsRemaining: { decrement: 1 } },
    });
    if (consumed.count === 0) {
      const record = await this.prisma.otpChallenge.findUnique({
        where: { phone },
        select: { expiresAt: true },
      });
      if (!record) return "INVALID";
      await this.prisma.otpChallenge.deleteMany({ where: { phone } });
      return record.expiresAt <= now ? "EXPIRED" : "INVALID";
    }

    const record = await this.prisma.otpChallenge.findUnique({ where: { phone } });
    if (!record) return "INVALID";
    if (sameDigest(record.codeDigest, otpDigest(phone, code))) {
      await this.prisma.otpChallenge.deleteMany({ where: { phone } });
      return "VALID";
    }
    if (record.attemptsRemaining <= 0) {
      await this.prisma.otpChallenge.deleteMany({ where: { phone, attemptsRemaining: { lte: 0 } } });
    }
    return "INVALID";
  }

  async revoke(phone: string): Promise<void> {
    await this.prisma.otpChallenge.deleteMany({ where: { phone } });
  }
}

export interface OtpSender {
  send(phone: string, code: string): Promise<void>;
}

/**
 * Vrai seulement si l'environnement se déclare explicitement de développement ou de test.
 * Un NODE_ENV absent ou mal orthographié compte comme de la production : on ferme par défaut.
 */
export function isDevelopmentEnvironment(nodeEnv: string | undefined): boolean {
  return nodeEnv === "development" || nodeEnv === "test";
}

export class DevelopmentOtpSender implements OtpSender {
  async send(phone: string, code: string): Promise<void> {
    if (!isDevelopmentEnvironment(process.env.NODE_ENV)) {
      throw new Error("Aucun fournisseur OTP n'est configuré en production");
    }
    console.info(`[auth] Code OTP pour ${phone}: ${code}`);
  }
}

/** Production sans fournisseur SMS : aucun code ne peut partir. */
export class AucunSmsSender implements OtpSender {
  async send(): Promise<void> {
    throw new Error("Aucun fournisseur SMS n'est configuré");
  }
}

export interface TokenService {
  issue(user: AuthenticatedUser): Promise<string>;
  verify(token: string): Promise<AuthenticatedPrincipal>;
}

const tokenPayloadSchema = z.object({
  sub: z.string().min(1),
  phone: z.string().min(1),
  role: z.enum(["CLIENT", "DRIVER", "ADMIN"]),
});

export class JwtTokenService implements TokenService {
  private readonly secret: Uint8Array;

  constructor(secret: string) {
    if (secret.length < 32)
      throw new Error("JWT_SECRET doit contenir au moins 32 caractères");
    this.secret = new TextEncoder().encode(secret);
  }

  issue(user: AuthenticatedUser): Promise<string> {
    return new SignJWT({ role: user.role, phone: user.phone })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(this.secret);
  }

  async verify(token: string): Promise<AuthenticatedPrincipal> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        algorithms: ["HS256"],
      });
      const parsed = tokenPayloadSchema.parse(payload);
      return { userId: parsed.sub, phone: parsed.phone, role: parsed.role };
    } catch {
      throw new AuthenticationError("TOKEN_INVALID");
    }
  }
}

export interface Authentication {
  requestOtp(input: { phone: string }): Promise<void>;
  verifyOtp(input: {
    phone: string;
    code: string;
    role?: SignupRole;
  }): Promise<{ token: string; user: AuthenticatedUser }>;
  /**
   * Connexion avec Google. Compte connu : connecté. Nouveau compte : il faut le rôle et le numéro
   * (sinon SIGNUP_REQUIRED, et l'app les demande avant de rappeler avec le même jeton).
   */
  signInWithGoogle(input: {
    idToken: string;
    role?: SignupRole;
    phone?: string;
    name?: string;
  }): Promise<{ token: string; user: AuthenticatedUser }>;
  authenticate(token: string): Promise<AuthenticatedPrincipal>;
}

export class AuthenticationService implements Authentication {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly otpStore: OtpStore,
    private readonly otpSender: OtpSender,
    private readonly tokenService: TokenService,
    private readonly generateCode = () =>
      randomInt(0, 1_000_000).toString().padStart(6, "0"),
    private readonly comptesTest: ComptesTest | null = null,
    private readonly google: VerificateurGoogle | null = null,
  ) {}

  async signInWithGoogle({
    idToken,
    role,
    phone,
    name,
  }: {
    idToken: string;
    role?: SignupRole;
    phone?: string;
    name?: string;
  }): Promise<{ token: string; user: AuthenticatedUser }> {
    if (!this.google) throw new AuthenticationError("GOOGLE_NOT_CONFIGURED");
    let identite;
    try {
      identite = await this.google.verifier(idToken);
    } catch (error) {
      throw new AuthenticationError("GOOGLE_TOKEN_INVALID", { cause: error });
    }

    const selection = { id: true, phone: true, name: true, role: true } as const;
    const connu = await this.prisma.user.findUnique({ where: { googleId: identite.googleId }, select: selection });
    if (connu) return { token: await this.tokenService.issue(connu), user: connu };

    if (!role || !phone) throw new AuthenticationError("SIGNUP_REQUIRED");
    // Un numéro déjà lié à un compte (créé par SMS) n'est jamais rattaché sans preuve :
    // sinon n'importe qui pourrait prendre le compte d'un autre en tapant son numéro.
    const numeroPris = await this.prisma.user.findUnique({ where: { phone }, select: { id: true } });
    if (numeroPris) throw new AuthenticationError("PHONE_ALREADY_USED");

    try {
      const user = await this.prisma.user.create({
        data: {
          phone,
          role,
          name: name ?? identite.nom,
          googleId: identite.googleId,
          email: identite.email,
          telephoneVerifie: false,
        },
        select: selection,
      });
      return { token: await this.tokenService.issue(user), user };
    } catch (error) {
      // Deux inscriptions simultanées avec le même numéro ou le même compte Google.
      if ((error as { code?: string }).code === "P2002") throw new AuthenticationError("PHONE_ALREADY_USED", { cause: error });
      throw error;
    }
  }

  async requestOtp({ phone }: { phone: string }): Promise<void> {
    // Compte de test : le code fixe et secret est enregistré comme un vrai code (même expiration,
    // mêmes essais limités), mais aucun SMS ne part.
    if (estCompteTest(this.comptesTest, phone)) {
      await this.otpStore.issue(phone, this.comptesTest.code);
      return;
    }
    const code = this.generateCode();
    await this.otpStore.issue(phone, code);
    try {
      await this.otpSender.send(phone, code);
    } catch (error) {
      // Sans SMS parti, on efface le code pour que le client puisse en redemander un tout de suite.
      await this.otpStore.revoke(phone);
      throw new AuthenticationError("OTP_DELIVERY_FAILED", { cause: error });
    }
  }

  async verifyOtp({
    phone,
    code,
    role,
  }: {
    phone: string;
    code: string;
    role?: SignupRole;
  }): Promise<{ token: string; user: AuthenticatedUser }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { phone },
      select: { id: true, phone: true, name: true, role: true },
    });
    if (!existingUser && !role) throw new AuthenticationError("ROLE_REQUIRED");

    const verification = await this.otpStore.verify(phone, code);
    if (verification === "EXPIRED")
      throw new AuthenticationError("OTP_EXPIRED");
    if (verification !== "VALID") throw new AuthenticationError("OTP_INVALID");

    const user =
      existingUser ??
      (await this.prisma.user.upsert({
        where: { phone },
        update: {},
        create: { phone, role: role! },
        select: { id: true, phone: true, name: true, role: true },
      }));
    const token = await this.tokenService.issue(user);

    return { token, user };
  }

  async authenticate(token: string): Promise<AuthenticatedPrincipal> {
    const claims = await this.tokenService.verify(token);
    // Le jeton vaut 30 jours : à chaque appel, on vérifie que le compte existe encore
    // et on prend son rôle actuel en base plutôt que celui figé dans le jeton.
    const user = await this.prisma.user.findUnique({
      where: { id: claims.userId },
      select: { id: true, phone: true, role: true },
    });
    if (!user) throw new AuthenticationError("TOKEN_INVALID");
    return { userId: user.id, phone: user.phone, role: user.role };
  }
}

// Valeurs déjà publiées (ancien repli, fichier d'exemple) : elles ne doivent jamais signer de jetons.
const PUBLIC_SECRETS = new Set([
  "development-only-jwt-secret-change-before-production",
  "replace-with-at-least-32-random-characters",
]);

export function createDefaultAuthentication(
  prisma: PrismaClient,
  env: NodeJS.ProcessEnv = process.env,
): Authentication {
  // Pas de secret de repli : un jeton signé avec un secret connu de tous serait falsifiable.
  const secret = env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET est obligatoire, y compris en développement");
  if (PUBLIC_SECRETS.has(secret)) {
    throw new Error("JWT_SECRET reprend une valeur d'exemple publique : générez-en un vrai");
  }

  const configuredDevelopmentCode = env.DEV_OTP_CODE;
  if (configuredDevelopmentCode && !isDevelopmentEnvironment(env.NODE_ENV)) {
    throw new Error(
      "DEV_OTP_CODE n'est accepté que si NODE_ENV vaut development ou test",
    );
  }
  if (configuredDevelopmentCode && !/^\d{6}$/.test(configuredDevelopmentCode)) {
    throw new Error("DEV_OTP_CODE doit contenir exactement 6 chiffres");
  }

  const configTwilio = lireConfigTwilio(env);
  const comptesTest = lireComptesTest(env);
  const google = lireVerificateurGoogle(env);
  // Sans SMS, la production reste possible si l'on peut se connecter autrement (Google, comptes de test).
  if (!configTwilio && !comptesTest && !google && !isDevelopmentEnvironment(env.NODE_ENV)) {
    throw new Error(
      "Aucun fournisseur SMS configuré : renseignez TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN et TWILIO_FROM",
    );
  }
  // En production sans SMS, seuls les comptes de test peuvent se connecter : les autres numéros
  // reçoivent OTP_DELIVERY_FAILED (l'app explique que le SMS n'a pas pu partir).
  const expediteur: OtpSender = configTwilio
    ? new TwilioSmsSender(configTwilio)
    : isDevelopmentEnvironment(env.NODE_ENV) ? new DevelopmentOtpSender() : new AucunSmsSender();

  return new AuthenticationService(
    prisma,
    new PrismaOtpStore(prisma),
    expediteur,
    new JwtTokenService(secret),
    configuredDevelopmentCode ? () => configuredDevelopmentCode : undefined,
    comptesTest,
    google,
  );
}
