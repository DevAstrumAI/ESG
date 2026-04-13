// src/services/api.js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

// Helper to get token from localStorage or auth store
const getToken = () => {
  // Try to get from localStorage first
  const token = localStorage.getItem('token');
  if (token) return token;
  
  // Fallback: try to get from auth store if available
  try {
    const { useAuthStore } = require('../store/authStore');
    return useAuthStore.getState().token;
  } catch {
    return null;
  }
};

// Generic request handler
const request = async (endpoint, options = {}) => {
  const token = options.token || getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.detail || data.message || `Request failed: ${response.status}`);
  }
  
  return data;
};

// Auth API
export const authAPI = {
  login: async (idToken) => {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
  },
  
  register: async (email, password, name) => {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName: name }),
    });
  },
  
  getMe: async (token) => {
    return request('/api/auth/me', { token });
  },
  
  logout: async (token) => {
    return request('/api/auth/logout', {
      method: 'POST',
      token,
    });
  },
};

// Company API
export const companyAPI = {
  getMe: async (token) => {
    return request('/api/companies/me', { token });
  },
  
  create: async (token, companyData) => {
    return request('/api/companies', {
      method: 'POST',
      body: JSON.stringify(companyData),
      token,
    });
  },
  
  updateMe: async (token, companyData) => {
    return request('/api/companies/me', {
      method: 'PUT',
      body: JSON.stringify(companyData),
      token,
    });
  },
  
 // Save targets
  saveTargets: async (token, targetsData) => {
    return request('/api/companies/targets', {
      method: 'PUT',
      body: JSON.stringify(targetsData),
      token,
    });
  },
  
  // Get targets
  getTargets: async (token) => {
    return request('/api/companies/targets', { token });
  },
};

// Emissions API
export const emissionsAPI = {
  submitScope1: async (token, data) => {
    return request('/api/emissions/scope1', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },
  
  submitScope2: async (token, data) => {
    return request('/api/emissions/scope2', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  getScope1Data: async (token, year) => {
    const query = year ? `?year=${year}` : '';
    return request(`/api/emissions/scope1${query}`, { token });
  },

  getScope2Data: async (token, year) => {
    const query = year ? `?year=${year}` : '';
    return request(`/api/emissions/scope2${query}`, { token });
  },

  deleteScope1Entry: async (token, data) => {
    return request('/api/emissions/scope1', {
      method: 'DELETE',
      body: JSON.stringify(data),
      token,
    });
  },

  deleteScope2Entry: async (token, data) => {
    return request('/api/emissions/scope2', {
      method: 'DELETE',
      body: JSON.stringify(data),
      token,
    });
  },
  
  getSummary: async (token, year) => {
    return request(`/api/emissions/summary?year=${year}`, { token });
  },
  
  getFactors: async (token, country, city) => {
    return request(`/api/emissions/factors/${country}/${city}`, { token });
  },
  
  getAvailableLocations: async (token) => {
    return request('/api/emissions/available-locations', { token });
  },
};

// Reports API
export const reportsAPI = {
  generate: async (token, year, month = null, baseYear = null) => {
    const body = { year };
    if (month) body.month = month;
    if (baseYear) body.base_year = baseYear;
    
    return request('/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify(body),
      token,
    });
  },
  
  generateFormal: async (token, data) => {
    return request('/api/formal-report/generate-formal', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },
};

// Settings API
export const settingsAPI = {
  get: async (token) => {
    return request('/api/settings', { token });
  },
  
  update: async (token, settingsData) => {
    return request('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData),
      token,
    });
  },
};

// Admin API (for emission factor management)
export const adminAPI = {
  getCities: async (token) => {
    return request('/api/admin/cities', { token });
  },
  
  getFactors: async (token, params) => {
    const queryString = new URLSearchParams(params).toString();
    return request(`/api/admin/factors${queryString ? `?${queryString}` : ''}`, { token });
  },
  
  updateFactor: async (token, factorId, factorData) => {
    return request(`/api/admin/factors/${factorId}`, {
      method: 'PUT',
      body: JSON.stringify(factorData),
      token,
    });
  },
  
  createFactor: async (token, factorData) => {
    return request('/api/admin/factors', {
      method: 'POST',
      body: JSON.stringify(factorData),
      token,
    });
  },
};

// Export all APIs as default object
export default {
  authAPI,
  companyAPI,
  emissionsAPI,
  reportsAPI,
  settingsAPI,
  adminAPI,
};