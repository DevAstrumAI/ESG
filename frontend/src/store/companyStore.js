// src/store/companyStore.js
import { create } from 'zustand';
import { companyAPI } from '../services/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const useCompanyStore = create((set, get) => ({
  company: null,
  targets: null,
  loading: false,
  error: null,
  isInitialized: false, // ✅ ADDED: Track if initial load completed

  fetchCompany: async (token, forceRefresh = false) => {
    // ✅ FIX: Skip if already loading OR already have company and not forcing refresh
    if (get().loading) return;
    if (get().company && !forceRefresh && get().isInitialized) {
      console.log("Using cached company data");
      return { success: true, company: get().company };
    }

    console.log("fetchCompany called, forceRefresh:", forceRefresh);

    set({ loading: true, error: null });

    try {
      const data = await companyAPI.getMe(token);
      console.log("Company data received:", data);
      set({ 
        company: data.company, 
        targets: data.company?.targets || null,
        loading: false, 
        error: null,
        isInitialized: true
      });
      return { success: true, company: data.company };
    } catch (error) {
      console.error("Fetch company error:", error);

      if (error.message && error.message.toLowerCase().includes("no company found")) {
        console.log("No company found for this user");
        set({ company: null, targets: null, loading: false, error: null, isInitialized: true });
        return { success: false, company: null };
      }

      set({ company: null, targets: null, loading: false, error: error.message, isInitialized: true });
      return { success: false, error: error.message };
    }
  },

  createCompany: async (token, companyData) => {
    set({ loading: true, error: null });

    try {
      await companyAPI.create(token, companyData);
      const data = await companyAPI.getMe(token);
      set({ 
        company: data.company, 
        targets: data.company?.targets || null,
        loading: false,
        isInitialized: true
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
      const data = await companyAPI.getMe(token);
      set({ 
        company: data.company, 
        targets: data.company?.targets || null,
        loading: false 
      });
      return { success: true, company: data.company };
    } catch (error) {
      console.error("Update company error:", error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  reset: () =>
    set({
      company: null,
      targets: null,
      loading: false,
      error: null,
      isInitialized: false,
    }),

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
      
      set((state) => ({
        company: state.company
          ? { ...state.company, targets: payload }
          : { targets: payload },
        targets: payload,
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