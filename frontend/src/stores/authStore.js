import { create } from "zustand";
import { createJSONStorage, persist } from 'zustand/middleware';

// In-memory convenience state only. Do not treat this as trusted authorization.
// Restore the session through your backend when using cookie-based sessions.
export const useAuthStore = create(
  //   (set) => ({
  //   user: null,
  //   setSession: (user) => set({ user }),
  //   clearSession: () => set({ user: null }),
  // })
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      clearAuth: () => set({ user: null, accessToken: null }),
    }),
    {
      name: "recruitro-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
    }
  )
);
