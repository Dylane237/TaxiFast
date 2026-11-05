export type ConfigApi = {
  /** L'app tourne sur les fausses données de mockApi. */
  modeDemo: boolean;
  /** Adresse du serveur, sans barre finale. */
  urlServeur: string;
};

type Variables = { useMock?: string; apiUrl?: string };

const URL_LOCALE = "http://localhost:3000";

/**
 * Décide entre le mode démo et le vrai serveur.
 * - En développement, le mode démo reste le défaut, pour lancer l'app sans serveur.
 * - Dans un build release, le mode démo doit être demandé explicitement (EXPO_PUBLIC_USE_MOCK=true),
 *   sinon l'app exige une adresse de serveur en https et refuse de démarrer sans elle.
 */
export function resoudreConfigApi({ useMock, apiUrl }: Variables, release: boolean): ConfigApi {
  const modeDemo = useMock === "true" || (useMock === undefined && !release);
  const brute = apiUrl?.trim().replace(/\/$/, "");

  if (release && !modeDemo) {
    if (!brute) throw new Error("EXPO_PUBLIC_API_URL est obligatoire pour un build de production");
    if (!brute.startsWith("https://")) {
      throw new Error("En production, EXPO_PUBLIC_API_URL doit commencer par https://");
    }
  }

  return { modeDemo, urlServeur: brute || URL_LOCALE };
}

// Expo n'injecte les variables EXPO_PUBLIC_* que si elles sont lues telles quelles, d'où cet appel unique.
export const configApi = resoudreConfigApi(
  { useMock: process.env.EXPO_PUBLIC_USE_MOCK, apiUrl: process.env.EXPO_PUBLIC_API_URL },
  typeof __DEV__ !== "undefined" && !__DEV__,
);
