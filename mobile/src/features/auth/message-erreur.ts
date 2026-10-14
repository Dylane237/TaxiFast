import { ApiError } from "@/api";

const messages: Partial<Record<ApiError["code"], string>> = {
  INVALID_INPUT: "Vérifiez les informations saisies.",
  OTP_NOT_REQUESTED: "Demandez d’abord un nouveau code.",
  OTP_INVALID: "Le code saisi est incorrect.",
  UNAUTHENTICATED: "Votre session n’est plus valide.",
  SESSION_EXPIRED: "Votre session a expiré. Reconnectez-vous.",
  NETWORK_ERROR: "Le serveur est inaccessible. Vérifiez votre connexion.",
  INVALID_RESPONSE: "Le serveur a renvoyé une réponse inattendue.",
  NOT_IMPLEMENTED: "Le serveur n’est pas encore branché.",
  CAPACITY_EXCEEDED: "Le trajet est devenu complet sur ce tronçon.",
  BOOKING_EXPIRED: "Cette proposition a expiré.",
  BOOKING_NOT_CONFIRMABLE: "Cette demande a déjà reçu une réponse.",
  COUNTER_OFFER_ALREADY_USED: "La contre-proposition a déjà été utilisée.",
  TRIP_NOT_OPEN: "Ce trajet n’est plus ouvert.",
};

export function messageErreur(error: unknown): string {
  if (error instanceof ApiError) return messages[error.code] ?? error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Une erreur inattendue est survenue. Réessayez.";
}
