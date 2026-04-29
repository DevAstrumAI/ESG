// src/store/authStore.js
import { create } from "zustand";
import { auth } from "../firebase/firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onIdTokenChanged,
} from "firebase/auth";
import { authAPI } from "../services/api";
import { persist } from "zustand/middleware";
import { useCompanyStore } from "./companyStore";
import { useEmissionStore } from "./emissionStore";
import { useSettingsStore } from "./settingsStore";

let idTokenUnsubscribe = null;

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loggedIn: false,
      loading: false,
      error: null,

      register: async (email, password, displayName) => {
        set({ loading: true, error: null });
        try {
          await authAPI.register(email, password, displayName);
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const token = await userCredential.user.getIdToken();
          const { user } = await authAPI.getMe(token);
          
          set({ user, token, loggedIn: true, loading: false });
          
          // ✅ FIX: Fetch company data after successful registration
          await useCompanyStore.getState().fetchCompany(token);
          
          return { success: true };
        } catch (error) {
          console.error("Registration error:", error);
          set({ error: error.message, loading: false });
          return { success: false, error: error.message };
        }
      },

      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const token = await userCredential.user.getIdToken();
          const { user } = await authAPI.login(token);
          
          set({ user, token, loggedIn: true, loading: false });
          
          // ✅ FIX: Fetch company data after successful login
          await useCompanyStore.getState().fetchCompany(token);
          
          return { success: true, user };
        } catch (error) {
          console.error("Login error:", error);
          set({ error: error.message, loading: false });
          return { success: false, error: error.message };
        }
      },

      logout: async () => {
        set({ loading: true });
        try {
          const { token } = get();
          if (token) await authAPI.logout(token);
          await signOut(auth);
          
          useCompanyStore.getState().reset();
          useEmissionStore.getState().reset();
          useSettingsStore.getState().resetSettings();
          
          localStorage.removeItem("auth-storage");
          localStorage.removeItem("company-storage");
          
          set({ user: null, token: null, loggedIn: false, loading: false, error: null });
        } catch (error) {
          console.error("Logout error:", error);
          await signOut(auth);
          
          try {
            useCompanyStore.getState().reset();
            useEmissionStore.getState().reset();
            useSettingsStore.getState().resetSettings();
            localStorage.removeItem("auth-storage");
            localStorage.removeItem("company-storage");
          } catch (e) {
            console.error('Error clearing stores on logout:', e);
          }
          
          set({ user: null, token: null, loggedIn: false, loading: false });
        }
      },

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

      startAuthSync: () => {
        if (idTokenUnsubscribe) return;
        idTokenUnsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
          try {
            if (!firebaseUser) {
              const state = get();
              if (state.loggedIn || state.token) {
                set({ user: null, token: null, loggedIn: false, loading: false, error: null });
              }
              return;
            }
            const freshToken = await firebaseUser.getIdToken();
            const currentToken = get().token;
            if (freshToken !== currentToken) {
              set({ token: freshToken, loggedIn: true });
            } else if (!get().loggedIn) {
              set({ loggedIn: true });
            }

            // Refresh backend user session shape after long idle/token rollover.
            try {
              const { user } = await authAPI.getMe(freshToken);
              set({ user, token: freshToken, loggedIn: true, error: null });
            } catch {
              // Keep Firebase-authenticated state even if /me transiently fails.
              set({ token: freshToken, loggedIn: true });
            }
          } catch {
            // Do not hard-fail UI on transient token sync issues.
          }
        });
      },

      stopAuthSync: () => {
        if (idTokenUnsubscribe) {
          idTokenUnsubscribe();
          idTokenUnsubscribe = null;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        loggedIn: state.loggedIn,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.loading = false;
          state.error = null;
        }
      },
    }
  )
);