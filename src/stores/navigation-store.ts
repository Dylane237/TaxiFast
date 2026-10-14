import { create } from "zustand";

type NavigationState = {
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
};

export const useNavigationStore = create<NavigationState>((set) => ({
  menuOpen: false,
  openMenu: () => set({ menuOpen: true }),
  closeMenu: () => set({ menuOpen: false }),
}));
