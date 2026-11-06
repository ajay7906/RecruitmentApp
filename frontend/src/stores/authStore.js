import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// In-memory/persisted convenience state only. Do not treat this as trusted authorization.
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      setUser: (user) => set({ user }),
      setSession: (user) => set({ user }),
      clearAuth: () => set({ user: null, accessToken: null }),
      clearSession: () => set({ user: null, accessToken: null }),
    }),
    {
      name: "recruitro-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
    }
  )
);
