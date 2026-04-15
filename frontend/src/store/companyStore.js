// src/store/companyStore.js
import { create } from 'zustand';
import { companyAPI } from '../services/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const sendDebugLog = (location, message, data, runId, hypothesisId) => {
  // #region agent log
  fetch("http://127.0.0.1:7288/ingest/74551448-bb44-4f1e-95fd-b4ebb21dced5", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "bbca55",
    },
    body: JSON.stringify({
      sessionId: "bbca55",
      location,
      message,
      data,
      runId,
      hypothesisId,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
};

export const useCompanyStore = create((set, get) => ({
  company: null,
  targets: null,
  loading: false,
  error: null,
  isInitialized: false,
  lastFetchedAt: null,

  fetchCompany: async (token, { force = false } = {}) => {
    const { company, lastFetchedAt } = get();
    const STALE_MS = 5 * 60 * 1000; // 5 minutes
    const fetchStart = Date.now();

    // Return cached data unless forced or stale
    if (!force && company && lastFetchedAt && Date.now() - lastFetchedAt < STALE_MS) {
      sendDebugLog(
        "companyStore.js:fetchCompany:cacheHit",
        "Using cached company data",
        { ageMs: Date.now() - lastFetchedAt },
        "pre-fix",
        "H2"
      );
      return { success: true, company: company };
    }

    set({ loading: true, error: null });

    try {
      const res = await fetch(`${API_URL}/api/companies/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch company");
      const data = await res.json();
      sendDebugLog(
        "companyStore.js:fetchCompany:success",
        "Fetched company data",
        {
          durationMs: Date.now() - fetchStart,
          hasBasicName: Boolean(data.company?.basicInfo?.name),
          locationsCount: Array.isArray(data.company?.locations) ? data.company.locations.length : 0,
        },
        "pre-fix",
        "H3"
      );
      set({ 
        company: data.company, 
        targets: data.company?.targets || null,
        lastFetchedAt: Date.now(),
        loading: false,
        error: null,
        isInitialized: true
      });
      return { success: true, company: data.company };
    } catch (e) {
      sendDebugLog(
        "companyStore.js:fetchCompany:error",
        "Fetch company failed and initialized fallback applied",
        { durationMs: Date.now() - fetchStart, errorMessage: e.message || "unknown" },
        "pre-fix",
        "H1"
      );
      set({ loading: false, error: e.message, isInitialized: true });
      return { success: false, error: e.message };
    }
  },

  updateCompany: async (token, payload) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/companies/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Update failed");
      
      set({
        company: data.company || data,
        targets: (data.company || data)?.targets || null,
        lastFetchedAt: Date.now(),
        loading: false,
        error: null,
      });
      return { success: true, company: data.company || data };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  createCompany: async (token, companyData) => {
    set({ loading: true, error: null });

    try {
      await companyAPI.create(token, companyData);

      let data = null;
      let lastFetchError = null;
      // Firestore writes can be briefly eventual; retry hydration before failing UX.
      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          data = await companyAPI.getMe(token);
          break;
        } catch (error) {
          lastFetchError = error;
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }

      if (!data?.company) {
        // Keep flow working even if immediate read lags.
        set({
          company: {
            basicInfo: {
              name: companyData.name,
              industry: companyData.industry,
              employees: companyData.employees,
              revenue: companyData.revenue,
              region: companyData.region,
              fiscalYear: companyData.fiscalYear,
            },
            locations: companyData.locations || [],
          },
          targets: null,
          loading: false,
          error: null,
          isInitialized: true,
        });
        return { success: true, warning: lastFetchError?.message };
      }
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

  reset: () =>
    set({
      company: null,
      targets: null,
      loading: false,
      error: null,
      isInitialized: false,
      lastFetchedAt: null,
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
        lastFetchedAt: Date.now(),
      }));
      
      return { success: true, data };
    } catch (error) {
      console.error("Save targets error:", error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
}));