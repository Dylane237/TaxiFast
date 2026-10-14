import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import type { PrismaClient, Role } from "@prisma/client";
import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";

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
  | "ROLE_REQUIRED"
  | "TOKEN_INVALID";

export class AuthenticationError extends Error {
  constructor(public readonly code: AuthenticationErrorCode) {
    super(code);
    this.name = "AuthenticationError";
  }
}

function otpDigest(phone: string, code: string): Buffer {
  return createHash("sha256").update(`${phone}:${code}`).digest();
}

export class MemoryOtpStore {
  private readonly records = new Map<string, OtpRecord>();

  constructor(
    private readonly ttlMs = 5 * 60_000,
    private readonly resendDelayMs = 60_000,
    private readonly maxAttempts = 5,
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
    const valid = timingSafeEqual(record.digest, candidate);
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

export interface OtpSender {
  send(phone: string, code: string): Promise<void>;
}

export class DevelopmentOtpSender implements OtpSender {
  async send(phone: string, code: string): Promise<void> {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Aucun fournisseur OTP n'est configuré en production");
    }
    console.info(`[auth] Code OTP pour ${phone}: ${code}`);
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
  authenticate(token: string): Promise<AuthenticatedPrincipal>;
}

export class AuthenticationService implements Authentication {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly otpStore: MemoryOtpStore,
    private readonly otpSender: OtpSender,
    private readonly tokenService: TokenService,
    private readonly generateCode = () =>
      randomInt(0, 1_000_000).toString().padStart(6, "0"),
  ) {}

  async requestOtp({ phone }: { phone: string }): Promise<void> {
    const code = this.generateCode();
    this.otpStore.issue(phone, code);
    try {
      await this.otpSender.send(phone, code);
    } catch (error) {
      this.otpStore.revoke(phone);
      throw error;
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

    const verification = this.otpStore.verify(phone, code);
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

  authenticate(token: string): Promise<AuthenticatedPrincipal> {
    return this.tokenService.verify(token);
  }
}

export function createDefaultAuthentication(
  prisma: PrismaClient,
): Authentication {
  const secret =
    process.env.JWT_SECRET ??
    (process.env.NODE_ENV === "production"
      ? ""
      : "development-only-jwt-secret-change-before-production");

  const configuredDevelopmentCode =
    process.env.NODE_ENV === "production"
      ? undefined
      : process.env.DEV_OTP_CODE;
  if (configuredDevelopmentCode && !/^\d{6}$/.test(configuredDevelopmentCode)) {
    throw new Error("DEV_OTP_CODE doit contenir exactement 6 chiffres");
  }

  return new AuthenticationService(
    prisma,
    new MemoryOtpStore(),
    new DevelopmentOtpSender(),
    new JwtTokenService(secret),
    configuredDevelopmentCode ? () => configuredDevelopmentCode : undefined,
  );
}
