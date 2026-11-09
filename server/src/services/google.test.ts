import type { PrismaClient } from "@prisma/client";
import Fastify from "fastify";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { registerAuthRoutes } from "../routes/auth.js";
import { AuthenticationError, AuthenticationService, type Authentication, type TokenService } from "./authentication.js";
import { lireVerificateurGoogle, VerificateurGoogleJose, type VerificateurGoogle } from "./google.js";

const CLIENT = "123-abc.apps.googleusercontent.com";
let clePrivee: CryptoKey;
let verificateur: VerificateurGoogleJose;

beforeAll(async () => {
  const paire = await generateKeyPair("RS256");
  clePrivee = paire.privateKey;
  const publique = { ...(await exportJWK(paire.publicKey)), kid: "cle-test", alg: "RS256" };
  verificateur = new VerificateurGoogleJose([CLIENT], createLocalJWKSet({ keys: [publique] }));
});

function jeton(revendications: Record<string, unknown>, options: { aud?: string; iss?: string; exp?: string } = {}) {
  return new SignJWT(revendications)
    .setProtectedHeader({ alg: "RS256", kid: "cle-test" })
    .setSubject("google-42")
    .setIssuer(options.iss ?? "https://accounts.google.com")
    .setAudience(options.aud ?? CLIENT)
    .setIssuedAt()
    .setExpirationTime(options.exp ?? "1h")
    .sign(clePrivee);
}

describe("vérification des jetons Google", () => {
  it("accepte un jeton valide et garde l'e-mail seulement s'il est vérifié", async () => {
    await expect(verificateur.verifier(await jeton({ email: "awa@gmail.com", email_verified: true, given_name: "Awa" }))).resolves.toEqual({
      googleId: "google-42",
      email: "awa@gmail.com",
      nom: "Awa",
    });
    const nonVerifie = await verificateur.verifier(await jeton({ email: "x@gmail.com", email_verified: false }));
    expect(nonVerifie.email).toBeNull();
  });

  it("refuse un jeton destiné à une autre application", async () => {
    await expect(verificateur.verifier(await jeton({}, { aud: "autre.apps.googleusercontent.com" }))).rejects.toThrow(/invalide/);
  });

  it("refuse un jeton qui ne vient pas de Google", async () => {
    await expect(verificateur.verifier(await jeton({}, { iss: "https://faux-google.example" }))).rejects.toThrow(/invalide/);
  });

  it("refuse un jeton expiré et un jeton signé par une autre clé", async () => {
    await expect(verificateur.verifier(await jeton({}, { exp: "-1m" }))).rejects.toThrow(/invalide/);
    const autre = await generateKeyPair("RS256");
    const faux = await new SignJWT({}).setProtectedHeader({ alg: "RS256", kid: "cle-test" }).setSubject("x")
      .setIssuer("https://accounts.google.com").setAudience(CLIENT).setExpirationTime("1h").sign(autre.privateKey);
    await expect(verificateur.verifier(faux)).rejects.toThrow(/invalide/);
  });

  it("lit GOOGLE_CLIENT_IDS et refuse un identifiant mal formé", () => {
    expect(lireVerificateurGoogle({})).toBeNull();
    expect(lireVerificateurGoogle({ GOOGLE_CLIENT_IDS: CLIENT })).not.toBeNull();
    expect(() => lireVerificateurGoogle({ GOOGLE_CLIENT_IDS: "pas-un-id" })).toThrow(/googleusercontent/);
  });
});

describe("connexion avec Google", () => {
  const identite = { googleId: "google-42", email: "awa@gmail.com", nom: "Awa" };
  const google: VerificateurGoogle = { verifier: vi.fn(async (t: string) => { if (t === "mauvais") throw new Error("non"); return identite; }) };
  const jetons = { issue: vi.fn(async () => "jwt-taxifast") } as unknown as TokenService;

  function service(utilisateurs: { parGoogle?: unknown; parTelephone?: unknown } = {}, avecGoogle = true) {
    const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "u1", phone: data.phone, name: data.name, role: data.role }));
    const prisma = {
      user: {
        findUnique: vi.fn(async ({ where }: { where: { googleId?: string; phone?: string } }) =>
          where.googleId ? utilisateurs.parGoogle ?? null : utilisateurs.parTelephone ?? null),
        create,
      },
    } as unknown as PrismaClient;
    return { create, auth: new AuthenticationService(prisma, {} as never, {} as never, jetons, undefined, null, avecGoogle ? google : null) };
  }

  it("connecte directement un compte Google déjà connu", async () => {
    const connu = { id: "u9", phone: "+237670000000", name: "Awa", role: "CLIENT" };
    const { auth, create } = service({ parGoogle: connu });
    await expect(auth.signInWithGoogle({ idToken: "bon" })).resolves.toEqual({ token: "jwt-taxifast", user: connu });
    expect(create).not.toHaveBeenCalled();
  });

  it("demande le rôle et le numéro à la première connexion", async () => {
    const { auth } = service();
    await expect(auth.signInWithGoogle({ idToken: "bon", role: "CLIENT" })).rejects.toEqual(new AuthenticationError("SIGNUP_REQUIRED"));
  });

  it("crée le compte avec un numéro marqué non vérifié", async () => {
    const { auth, create } = service();
    await auth.signInWithGoogle({ idToken: "bon", role: "DRIVER", phone: "+237690000000" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: { phone: "+237690000000", role: "DRIVER", name: "Awa", googleId: "google-42", email: "awa@gmail.com", telephoneVerifie: false },
    }));
  });

  it("ne rattache jamais un numéro déjà utilisé par un autre compte", async () => {
    const { auth, create } = service({ parTelephone: { id: "autre" } });
    await expect(auth.signInWithGoogle({ idToken: "bon", role: "CLIENT", phone: "+237670000000" })).rejects.toEqual(
      new AuthenticationError("PHONE_ALREADY_USED"),
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("refuse un jeton invalide, et répond clairement quand Google n'est pas configuré", async () => {
    await expect(service().auth.signInWithGoogle({ idToken: "mauvais" })).rejects.toEqual(new AuthenticationError("GOOGLE_TOKEN_INVALID"));
    await expect(service({}, false).auth.signInWithGoogle({ idToken: "bon" })).rejects.toEqual(new AuthenticationError("GOOGLE_NOT_CONFIGURED"));
  });
});

describe("route /auth/google", () => {
  async function app(erreur?: AuthenticationError) {
    const authentication = {
      signInWithGoogle: vi.fn(async () => {
        if (erreur) throw erreur;
        return { token: "jwt", user: { id: "u1", phone: "+237670000000", name: "Awa", role: "CLIENT" } };
      }),
    } as unknown as Authentication;
    const serveur = Fastify({ logger: false });
    registerAuthRoutes(serveur, authentication);
    return serveur;
  }
  const corps = { idToken: "x".repeat(40) };

  it("renvoie la session, 409 pour une inscription à compléter, 503 sans configuration", async () => {
    expect((await (await app()).inject({ method: "POST", url: "/auth/google", payload: corps })).statusCode).toBe(200);
    const aCompleter = await (await app(new AuthenticationError("SIGNUP_REQUIRED"))).inject({ method: "POST", url: "/auth/google", payload: corps });
    expect(aCompleter.statusCode).toBe(409);
    expect(aCompleter.json()).toEqual({ error: "SIGNUP_REQUIRED" });
    const sansConfig = await (await app(new AuthenticationError("GOOGLE_NOT_CONFIGURED"))).inject({ method: "POST", url: "/auth/google", payload: corps });
    expect(sansConfig.statusCode).toBe(503);
  });

  it("refuse un numéro mal formé", async () => {
    const reponse = await (await app()).inject({ method: "POST", url: "/auth/google", payload: { ...corps, phone: "670000000" } });
    expect(reponse.statusCode).toBe(400);
  });
});
