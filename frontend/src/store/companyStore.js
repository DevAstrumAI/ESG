// src/store/companyStore.js
import { create } from 'zustand';
import { companyAPI } from '../services/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const useCompanyStore = create((set, get) => ({
  company: null,
  targets: null,  // ← ADDED: Store SBTi targets separately
  loading: false,
  error: null,

  fetchCompany: async (token) => {
    // Don't fetch if already loading
    if (get().loading) return;

    console.log("fetchCompany called with token:", token ? "Token exists" : "No token");

    set({ loading: true, error: null });

    try {
      const data = await companyAPI.getMe(token);
      console.log("Company data received:", data);
      set({ 
        company: data.company, 
        targets: data.company?.targets || null,  // ← ADDED: Extract targets from company
        loading: false, 
        error: null 
      });
      return { success: true, company: data.company };
    } catch (error) {
      console.error("Fetch company error:", error);

      // If backend says "No company found", treat as normal for new users
      if (error.message && error.message.toLowerCase().includes("no company found")) {
        console.log("No company found for this user");
        set({ company: null, targets: null, loading: false, error: null });
        return { success: false, company: null };
      }

      set({ company: null, targets: null, loading: false, error: error.message });
      return { success: false, error: error.message };
    }
  },

  createCompany: async (token, companyData) => {
    set({ loading: true, error: null });

    try {
      await companyAPI.create(token, companyData);

      // After creating, fetch the full company payload
      const data = await companyAPI.getMe(token);
      set({ 
        company: data.company, 
        targets: data.company?.targets || null,  // ← ADDED
        loading: false 
      });
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
      set({ 
        company: data.company, 
        targets: data.company?.targets || null,  // ← ADDED
        loading: false 
      });
      return { success: true, company: data.company };
    } catch (error) {
      console.error("Update company error:", error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  // ─── Reset Company Data ────────────────────────────────────────────────
  reset: () =>
    set({
      company: null,
      targets: null,
      loading: false,
      error: null,
    }),

  // ─── NEW: Save SBTi Targets ─────────────────────────────────────────────
  saveTargets: async (token, payload) => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch(`${API_URL}/api/companies/targets`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || "Failed to save targets.");
      }
      
      // Merge targets into the existing company object in the store
      set((state) => ({
        company: state.company
          ? { ...state.company, targets: payload }
          : { targets: payload },
        targets: payload,  // ← Store targets separately for easy access
        loading: false,
        error: null,
      }));
      
      return { success: true, data };
    } catch (error) {
      console.error("Save targets error:", error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
}));