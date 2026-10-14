import { create } from "zustand";

type AuthFlowState = {
  phone: string;
  code: string;
  setPhone: (phone: string) => void;
  setCode: (code: string) => void;
  reset: () => void;
};

export const useAuthFlowStore = create<AuthFlowState>((set) => ({
  phone: "",
  code: "",
  setPhone: (phone) => set({ phone, code: "" }),
  setCode: (code) => set({ code }),
  reset: () => set({ phone: "", code: "" }),
}));
