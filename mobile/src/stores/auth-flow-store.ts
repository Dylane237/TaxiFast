import { create } from "zustand";

type AuthFlowState = {
  phone: string;
  code: string;
  /** Jeton Google gardé en mémoire seulement, le temps de compléter l'inscription. */
  googleToken: string;
  googlePrenom: string;
  setPhone: (phone: string) => void;
  setCode: (code: string) => void;
  setGoogle: (token: string, prenom: string | null) => void;
  reset: () => void;
};

export const useAuthFlowStore = create<AuthFlowState>((set) => ({
  phone: "",
  code: "",
  googleToken: "",
  googlePrenom: "",
  setPhone: (phone) => set({ phone, code: "" }),
  setCode: (code) => set({ code }),
  setGoogle: (googleToken, prenom) => set({ googleToken, googlePrenom: prenom ?? "" }),
  reset: () => set({ phone: "", code: "", googleToken: "", googlePrenom: "" }),
}));
