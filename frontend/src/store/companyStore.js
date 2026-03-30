// src/store/companyStore.js
import { create } from 'zustand';

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
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/company`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log("Company API response status:", response.status);
      
      if (response.status === 404) {
        // No company found - this is normal for new users
        console.log("No company found for this user");
        set({ company: null, loading: false, error: null });
        return { success: false, company: null };
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch company: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Company data received:", data);
      set({ company: data, loading: false, error: null });
      return { success: true, company: data };
      
    } catch (error) {
      console.error("Fetch company error:", error);
      set({ company: null, loading: false, error: error.message });
      return { success: false, error: error.message };
    }
  },

  createCompany: async (token, companyData) => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/company`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create company: ${response.status}`);
      }
      
      const data = await response.json();
      set({ company: data, loading: false });
      return { success: true, company: data };
      
    } catch (error) {
      console.error("Create company error:", error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  updateCompany: async (token, companyData) => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/company`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update company: ${response.status}`);
      }
      
      const data = await response.json();
      set({ company: data, loading: false });
      return { success: true, company: data };
      
    } catch (error) {
      console.error("Update company error:", error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
}));