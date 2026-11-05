import type { OtpSender } from "./authentication.js";

export type ConfigTwilio = {
  accountSid: string;
  authToken: string;
  /** Numéro Twilio (+1…) ou nom d'expéditeur autorisé (ex. TaxiFast). */
  expediteur: string;
};

/**
 * Lit la configuration Twilio. Rien de défini : pas de Twilio (null).
 * Une configuration à moitié remplie est une erreur, pour ne pas découvrir le problème
 * au premier client qui essaie de se connecter.
 */
export function lireConfigTwilio(env: NodeJS.ProcessEnv): ConfigTwilio | null {
  const accountSid = env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = env.TWILIO_AUTH_TOKEN?.trim();
  const expediteur = env.TWILIO_FROM?.trim();
  const valeurs = [accountSid, authToken, expediteur];
  if (valeurs.every((valeur) => !valeur)) return null;
  if (valeurs.some((valeur) => !valeur)) {
    throw new Error("Twilio : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN et TWILIO_FROM doivent être définis ensemble");
  }
  if (!/^AC[0-9a-fA-F]{32}$/.test(accountSid!)) {
    throw new Error("Twilio : TWILIO_ACCOUNT_SID doit commencer par AC suivi de 32 caractères hexadécimaux");
  }
  return { accountSid: accountSid!, authToken: authToken!, expediteur: expediteur! };
}

export function texteCodeConnexion(code: string): string {
  return `Taxi Fast : votre code est ${code}. Il expire dans 5 minutes. Ne le partagez avec personne.`;
}

export class TwilioSmsSender implements OtpSender {
  constructor(
    private readonly config: ConfigTwilio,
    private readonly envoyer: typeof fetch = fetch,
  ) {}

  async send(phone: string, code: string): Promise<void> {
    const { accountSid, authToken, expediteur } = this.config;
    const response = await this.envoyer(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: phone, From: expediteur, Body: texteCodeConnexion(code) }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) {
      // Le code d'erreur Twilio suffit pour enquêter ; on n'y met ni le code OTP ni le jeton.
      const detail = (await response.json().catch(() => null)) as { code?: number } | null;
      throw new Error(`Twilio a refusé l'envoi (HTTP ${response.status}, erreur ${detail?.code ?? "inconnue"})`);
    }
  }
}
