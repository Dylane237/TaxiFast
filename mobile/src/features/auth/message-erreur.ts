import { ApiError } from "@/api";

const messages: Partial<Record<ApiError["code"], string>> = {
  INVALID_INPUT: "Quelque chose cloche dans ce que vous avez saisi. Relisez puis recommencez.",
  OTP_NOT_REQUESTED: "Demandez d’abord un code, puis entrez-le ici.",
  OTP_INVALID: "Ce n’est pas le bon code. Vérifiez le SMS.",
  UNAUTHENTICATED: "Vous avez été déconnecté. Reconnectez-vous pour continuer.",
  SESSION_EXPIRED: "Ça fait un moment ! Reconnectez-vous pour reprendre.",
  NETWORK_ERROR: "Pas de connexion pour l’instant. Vérifiez vos données mobiles ou le Wi-Fi.",
  INVALID_RESPONSE: "Le serveur a renvoyé une réponse bizarre. Patientez un peu puis recommencez.",
  NOT_IMPLEMENTED: "Cette fonction arrive bientôt.",
  CAPACITY_EXCEEDED: "Trop tard, le taxi vient de se remplir sur cette portion du trajet.",
  BOOKING_EXPIRED: "Cette proposition a expiré, personne n’a répondu à temps.",
  BOOKING_NOT_CONFIRMABLE: "Cette demande a déjà eu sa réponse.",
  COUNTER_OFFER_ALREADY_USED: "Un autre prix a déjà été proposé une fois. C’est le maximum.",
  TRIP_NOT_OPEN: "Ce taxi ne prend plus de clients sur ce trajet.",
};

export function messageErreur(error: unknown): string {
  if (error instanceof ApiError) return messages[error.code] ?? error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Ça n’a pas marché. Réessayez dans un instant.";
}
