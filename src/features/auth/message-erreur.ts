import { ApiError } from "@/api";

const messages: Partial<Record<ApiError["code"], string>> = {
  INVALID_INPUT: "Vérifiez les informations saisies.",
  OTP_NOT_REQUESTED: "Demandez d’abord un nouveau code.",
  OTP_INVALID: "Le code saisi est incorrect.",
  UNAUTHENTICATED: "Votre session n’est plus valide.",
  NOT_IMPLEMENTED: "Le serveur n’est pas encore branché.",
};

export function messageErreur(error: unknown): string {
  if (error instanceof ApiError) return messages[error.code] ?? error.message;
  return "Une erreur inattendue est survenue. Réessayez.";
}
