// src/store/companyStore.js
import { create } from "zustand";
import { companyAPI } from "../services/api";
import { persist } from "zustand/middleware";

export const useCompanyStore = create((set, get) => ({
  // ─── State ───────────────────────────────────────────────────────────────
  company: null,
  companyId: null,
  loading: false,
  error: null,

  // ─── Fetch Company ───────────────────────────────────────────────────────
  fetchCompany: async (token) => {
    set({ loading: true, error: null });
    try {
      const { company, companyId } = await companyAPI.getMe(token);
      set({ company, companyId, loading: false });
      return { success: true, company };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  // ─── Create Company ──────────────────────────────────────────────────────
  createCompany: async (token, companyData) => {
    set({ loading: true, error: null });
    try {
      const { companyId } = await companyAPI.create(token, companyData);

      // Fetch full company data after creation
      const { company } = await companyAPI.getMe(token);
      set({ company, companyId, loading: false });
      return { success: true, companyId };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  // ─── Update Company ──────────────────────────────────────────────────────
  updateCompany: async (token, companyData) => {
    set({ loading: true, error: null });
    try {
      await companyAPI.updateMe(token, companyData);

      // Refresh company data
      const { company } = await companyAPI.getMe(token);
      set({ company, loading: false });
      return { success: true };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  // ─── Clear ───────────────────────────────────────────────────────────────
  clearCompany: () => set({ company: null, companyId: null, error: null }),
  clearError: () => set({ error: null }),
}));