// src/store/companyStore.js
import { create } from 'zustand';
import { companyAPI } from '../services/api';

export const useCompanyStore = create((set, get) => ({
  company: null,
  loading: false,
  error: null,

  fetchCompany: async (token) => {
    // Don't fetch if already loading or already have company
    if (get().loading || get().company) return;

    console.log("fetchCompany called with token:", token ? "Token exists" : "No token");

    set({ loading: true, error: null });

    try {
      const data = await companyAPI.getMe(token);
      console.log("Company data received:", data);
      set({ company: data.company, loading: false, error: null });
      return { success: true, company: data.company };
    } catch (error) {
      console.error("Fetch company error:", error);

      // If backend says "No company found", treat as normal for new users
      if (error.message && error.message.toLowerCase().includes("no company found")) {
        console.log("No company found for this user");
        set({ company: null, loading: false, error: null });
        return { success: false, company: null };
      }

      set({ company: null, loading: false, error: error.message });
      return { success: false, error: error.message };
    }
  },

  createCompany: async (token, companyData) => {
    set({ loading: true, error: null });

    try {
      await companyAPI.create(token, companyData);

      // After creating, fetch the full company payload
      const data = await companyAPI.getMe(token);
      set({ company: data.company, loading: false });
      return { success: true, company: data.company };
    } catch (error) {
      console.error("Create company error:", error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  updateCompany: async (token, companyData) => {
    set({ loading: true, error: null });

    try {
      await companyAPI.updateMe(token, companyData);

      // After updating, fetch the latest company payload
      const data = await companyAPI.getMe(token);
      set({ company: data.company, loading: false });
      return { success: true, company: data.company };
    } catch (error) {
      console.error("Update company error:", error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
}));
