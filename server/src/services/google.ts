import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { z } from "zod";

/**
 * Vérification des jetons « Se connecter avec Google » envoyés par l'app.
 * Le jeton est signé par Google : on vérifie sa signature avec les clés publiques de Google,
 * son émetteur, son destinataire (notre identifiant client Web) et sa date d'expiration.
 * Aucune bibliothèque Google, aucun coût.
 */
const CLES_GOOGLE = "https://www.googleapis.com/oauth2/v3/certs";
const EMETTEURS = ["accounts.google.com", "https://accounts.google.com"];

export type IdentiteGoogle = {
  /** Identifiant stable du compte Google (ne change jamais, contrairement à l'e-mail). */
  googleId: string;
  email: string | null;
  nom: string | null;
};

export interface VerificateurGoogle {
  verifier(jeton: string): Promise<IdentiteGoogle>;
}

const revendicationsSchema = z.object({
  sub: z.string().min(1).max(255),
  email: z.string().email().optional(),
  email_verified: z.boolean().optional(),
  name: z.string().max(120).optional(),
  given_name: z.string().max(80).optional(),
});

export class JetonGoogleInvalide extends Error {
  constructor(options?: { cause?: unknown }) {
    super("Jeton Google invalide", options);
    this.name = "JetonGoogleInvalide";
  }
}

export class VerificateurGoogleJose implements VerificateurGoogle {
  constructor(
    private readonly clientIds: string[],
    private readonly cles: JWTVerifyGetKey = createRemoteJWKSet(new URL(CLES_GOOGLE)),
  ) {
    if (clientIds.length === 0) throw new Error("Au moins un identifiant client Google est nécessaire");
  }

  async verifier(jeton: string): Promise<IdentiteGoogle> {
    try {
      const { payload } = await jwtVerify(jeton, this.cles, {
        issuer: EMETTEURS,
        audience: this.clientIds,
        algorithms: ["RS256"],
      });
      const donnees = revendicationsSchema.parse(payload);
      return {
        googleId: donnees.sub,
        // Une adresse non vérifiée par Google ne vaut rien : on ne la garde pas.
        email: donnees.email && donnees.email_verified ? donnees.email : null,
        nom: donnees.given_name ?? donnees.name ?? null,
      };
    } catch (error) {
      throw new JetonGoogleInvalide({ cause: error });
    }
  }
}

/** Lit GOOGLE_CLIENT_IDS (identifiants client Web, séparés par des virgules). Absent : connexion Google désactivée. */
export function lireVerificateurGoogle(env: NodeJS.ProcessEnv): VerificateurGoogle | null {
  const ids = (env.GOOGLE_CLIENT_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) return null;
  for (const id of ids) {
    if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(id)) {
      throw new Error("GOOGLE_CLIENT_IDS : chaque identifiant se termine par .apps.googleusercontent.com");
    }
  }
  return new VerificateurGoogleJose(ids);
}
