import { z } from "zod";

/**
 * Comptes de test : une courte liste de numéros qui se connectent avec un code fixe et secret,
 * sans SMS. Sert tant qu'aucun fournisseur SMS n'est branché (Twilio n'a pas d'essai au Cameroun),
 * et plus tard pour les comptes de relecture des stores.
 * Tous les autres numéros restent soumis au SMS : sans fournisseur, ils sont refusés.
 */
export type ComptesTest = {
  numeros: ReadonlySet<string>;
  code: string;
};

const MAX_NUMEROS = 5;
const telephoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/);

/** Codes trop faciles à deviner : refusés même pour des comptes de test. */
function codeTropFacile(code: string): boolean {
  if (/^(\d)\1{5}$/.test(code)) return true;
  return ["123456", "654321", "012345", "123123", "121212"].includes(code);
}

/** Lit TEST_OTP_PHONES et TEST_OTP_CODE. Absents tous les deux : pas de comptes de test. */
export function lireComptesTest(env: NodeJS.ProcessEnv): ComptesTest | null {
  const brut = env.TEST_OTP_PHONES?.trim();
  const code = env.TEST_OTP_CODE?.trim();
  if (!brut && !code) return null;
  if (!brut || !code) throw new Error("TEST_OTP_PHONES et TEST_OTP_CODE vont ensemble : renseignez les deux ou aucun");

  if (!/^\d{6}$/.test(code)) throw new Error("TEST_OTP_CODE doit contenir exactement 6 chiffres");
  if (codeTropFacile(code)) throw new Error("TEST_OTP_CODE est trop facile à deviner : choisissez 6 chiffres sans suite évidente");

  const numeros = brut.split(",").map((numero) => numero.replace(/\s/g, "")).filter(Boolean);
  if (numeros.length === 0) throw new Error("TEST_OTP_PHONES ne contient aucun numéro");
  if (numeros.length > MAX_NUMEROS) throw new Error(`TEST_OTP_PHONES : ${MAX_NUMEROS} numéros au maximum`);
  for (const numero of numeros) {
    if (!telephoneSchema.safeParse(numero).success) {
      throw new Error("TEST_OTP_PHONES : chaque numéro doit être au format international, par exemple +237670000000");
    }
  }
  return { numeros: new Set(numeros), code };
}

export function estCompteTest(comptes: ComptesTest | null, telephone: string): comptes is ComptesTest {
  return comptes !== null && comptes.numeros.has(telephone);
}
