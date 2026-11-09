import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { ApiError, configApi } from "@/api";

/**
 * Connexion avec Google : gratuite, sans SMS, et tous les Android ont déjà un compte Google.
 * L'identifiant client « Web » sert à obtenir un jeton que notre serveur sait vérifier.
 */
// Expo n'injecte les variables EXPO_PUBLIC_* que si elles sont lues telles quelles.
const IDENTIFIANT_WEB = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || null;

/** Le bouton s'affiche en mode démo (simulé) ou quand l'identifiant Google est configuré. */
export const googleDisponible = configApi.modeDemo || IDENTIFIANT_WEB !== null;

export type JetonGoogle = { idToken: string; prenom: string | null };

let configure = false;

/** Ouvre le choix du compte Google. Renvoie null si la personne a annulé. */
export async function connexionGoogle(): Promise<JetonGoogle | null> {
  // En démo, pas de vrai compte Google : un jeton fictif suffit au faux serveur.
  if (configApi.modeDemo) return { idToken: "demo-google-compte", prenom: "Awa" };
  if (!IDENTIFIANT_WEB) throw new ApiError("GOOGLE_NOT_CONFIGURED");

  if (!configure) {
    GoogleSignin.configure({ webClientId: IDENTIFIANT_WEB });
    configure = true;
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const reponse = await GoogleSignin.signIn();
    if (!isSuccessResponse(reponse)) return null;
    const { idToken, user } = reponse.data;
    if (!idToken) throw new ApiError("GOOGLE_TOKEN_INVALID");
    return { idToken, prenom: user.givenName ?? user.name ?? null };
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.IN_PROGRESS) return null;
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error("Les services Google ne sont pas disponibles sur ce téléphone. Connectez-vous avec votre numéro.");
      }
    }
    throw error;
  }
}
