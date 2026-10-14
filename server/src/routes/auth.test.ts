import type { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import {
  AuthenticationService,
  JwtTokenService,
  MemoryOtpStore,
  type OtpSender,
} from "../services/authentication.js";

const jwtSecret = "test-jwt-secret-with-at-least-32-characters";

function createFixture() {
  const sentCodes: Array<{ phone: string; code: string }> = [];
  const sender: OtpSender = {
    send: vi.fn(async (phone, code) => {
      sentCodes.push({ phone, code });
    }),
  };
  const user = {
    id: "user-1",
    phone: "+237690000001",
    name: null,
    role: "CLIENT" as const,
  };
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue(user),
    },
  } as unknown as PrismaClient;
  const authentication = new AuthenticationService(
    prisma,
    new MemoryOtpStore(),
    sender,
    new JwtTokenService(jwtSecret),
    () => "123456",
  );
  const app = buildApp({ prisma, authentication });

  return { app, prisma, sentCodes };
}

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("authentification par OTP", () => {
  it("envoie un OTP puis crée le client et retourne un JWT valide", async () => {
    const { app, prisma, sentCodes } = createFixture();
    apps.push(app);

    const request = await app.inject({
      method: "POST",
      url: "/auth/otp/request",
      payload: { phone: "+237690000001" },
    });
    expect(request.statusCode).toBe(202);
    expect(request.json()).toEqual({ status: "OTP_SENT" });
    expect(sentCodes).toEqual([{ phone: "+237690000001", code: "123456" }]);

    const verification = await app.inject({
      method: "POST",
      url: "/auth/otp/verify",
      payload: { phone: "+237690000001", code: "123456", role: "CLIENT" },
    });

    expect(verification.statusCode).toBe(200);
    expect(verification.json().user).toEqual({
      id: "user-1",
      phone: "+237690000001",
      name: null,
      role: "CLIENT",
    });
    expect(prisma.user.upsert).toHaveBeenCalledOnce();
    const verifiedToken = await jwtVerify(
      verification.json().token,
      new TextEncoder().encode(jwtSecret),
    );
    expect(verifiedToken.payload).toMatchObject({
      sub: "user-1",
      phone: "+237690000001",
      role: "CLIENT",
    });
  });

  it("refuse un code incorrect", async () => {
    const { app } = createFixture();
    apps.push(app);
    await app.inject({
      method: "POST",
      url: "/auth/otp/request",
      payload: { phone: "+237690000001" },
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/otp/verify",
      payload: { phone: "+237690000001", code: "000000", role: "CLIENT" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "OTP_INVALID" });
  });

  it("limite les demandes répétées de code", async () => {
    const { app } = createFixture();
    apps.push(app);

    const first = await app.inject({
      method: "POST",
      url: "/auth/otp/request",
      payload: { phone: "+237690000001" },
    });
    const second = await app.inject({
      method: "POST",
      url: "/auth/otp/request",
      payload: { phone: "+237690000001" },
    });

    expect(first.statusCode).toBe(202);
    expect(second.statusCode).toBe(429);
    expect(second.json()).toEqual({ error: "OTP_RATE_LIMITED" });
  });

  it("valide le téléphone, le code et le rôle avec Zod", async () => {
    const { app, sentCodes } = createFixture();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/auth/otp/verify",
      payload: { phone: "690000001", code: "123", role: "ADMIN" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("INVALID_INPUT");
    expect(sentCodes).toHaveLength(0);
  });
});
