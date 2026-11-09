import { router } from "expo-router";
import { useCallback } from "react";
import { api, type AuthResult } from "@/api";
import { useAuthFlowStore } from "@/stores/auth-flow-store";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Après une connexion réussie (Google) : on garde la session, on charge le profil,
 * puis on va à l'accueil, ou au profil s'il manque le nom (ou le véhicule d'un chauffeur).
 */
export function useFinConnexion() {
  const saveSession = useAuthStore((state) => state.saveSession);
  const updateUser = useAuthStore((state) => state.updateUser);
  const resetFlow = useAuthFlowStore((state) => state.reset);

  return useCallback(
    async (session: AuthResult) => {
      await saveSession(session);
      const profil = await api.getCurrentUser();
      if (profil) await updateUser(profil);
      const complet = Boolean(profil?.name && (profil.role !== "DRIVER" || profil.vehicle));
      resetFlow();
      router.replace(complet ? "/accueil" : "/profil");
    },
    [resetFlow, saveSession, updateUser],
  );
}
