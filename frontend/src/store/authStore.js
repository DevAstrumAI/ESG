// src/store/authStore.js
import { create } from "zustand";
import { auth } from "../firebase/firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { authAPI } from "../services/api";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // ─── State ───────────────────────────────────────────────────────────────
      user: null,
      token: null,
      loggedIn: false,
      loading: false,
      error: null,

      // ─── Register ────────────────────────────────────────────────────────────
      register: async (email, password, displayName) => {
        set({ loading: true, error: null });
        try {
          await authAPI.register(email, password, displayName);
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const token = await userCredential.user.getIdToken();
          const { user } = await authAPI.me(token);
          set({ user, token, loggedIn: true, loading: false });
          return { success: true };
        } catch (error) {
          set({ error: error.message, loading: false });
          return { success: false, error: error.message };
        }
      },

      // ─── Login ───────────────────────────────────────────────────────────────
      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const token = await userCredential.user.getIdToken();
          const { user } = await authAPI.login(token);
          set({ user, token, loggedIn: true, loading: false });
          return { success: true, user };
        } catch (error) {
          set({ error: error.message, loading: false });
          return { success: false, error: error.message };
        }
      },

      // ─── Logout ──────────────────────────────────────────────────────────────
      logout: async () => {
        set({ loading: true });
        try {
          const { token } = get();
          if (token) await authAPI.logout(token);
          await signOut(auth);
          set({ user: null, token: null, loggedIn: false, loading: false, error: null });
        } catch (error) {
          await signOut(auth);
          set({ user: null, token: null, loggedIn: false, loading: false });
        }
      },

      // ─── Refresh Token ───────────────────────────────────────────────────────
      refreshToken: async () => {
        try {
          const currentUser = auth.currentUser;
          if (!currentUser) return null;
          const token = await currentUser.getIdToken(true);
          set({ token });
          return token;
        } catch {
          return null;
        }
      },

      // ─── Clear Error ─────────────────────────────────────────────────────────
      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      // Only persist these fields (exclude loading and error)
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        loggedIn: state.loggedIn,
      }),
      // Reset loading and error when rehydrating from storage
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.loading = false;
          state.error = null;
        }
      },
    }
  )
);