import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { api, type AuthResult, type UserProfile } from "@/api";

const TOKEN_KEY = "covoiturage-taxi.token";
const USER_KEY = "covoiturage-taxi.user";

type AuthState = {
  token: string | null;
  user: UserProfile | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  saveSession: (session: AuthResult) => Promise<void>;
  updateUser: (user: UserProfile) => Promise<void>;
  clearSession: () => Promise<void>;
};

function parseUser(value: string | null): UserProfile | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as UserProfile;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const [token, storedUser] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);
    const user = parseUser(storedUser);
    if (token && user) {
      try {
        await api.restoreSession(token, user);
        set({ token, user, hydrated: true });
        return;
      } catch {
        await Promise.all([
          SecureStore.deleteItemAsync(TOKEN_KEY),
          SecureStore.deleteItemAsync(USER_KEY),
        ]);
      }
    }
    set({ token: null, user: null, hydrated: true });
  },

  saveSession: async ({ token, user }) => {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
    set({ token, user: { ...user, vehicle: null }, hydrated: true });
  },

  updateUser: async (user) => {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ user });
  },

  clearSession: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    set({ token: null, user: null, hydrated: true });
  },
}));
