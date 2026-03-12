// src/services/api.js
const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ─── Helper ────────────────────────────────────────────────────────────────

async function request(endpoint, options = {}) {
  const { token, ...rest } = options;

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...rest.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...rest,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Something went wrong");
  }

  return data;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export const authAPI = {
  register: (email, password, displayName) =>
    request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName }),
    }),

  login: (token) =>
    request("/api/auth/login", {
      method: "POST",
      token,
      body: JSON.stringify({ idToken:token }),
    }),

  me: (token) =>
    request("/api/auth/me", { token }),

  logout: (token) =>
    request("/api/auth/logout", {
      method: "POST",
      token,
    }),
};

// ─── Company ─────────────────────────────────────────────────────────────────

export const companyAPI = {
  create: (token, companyData) =>
    request("/api/companies", {
      method: "POST",
      token,
      body: JSON.stringify(companyData),
    }),

  getMe: (token) =>
    request("/api/companies/me", { token }),

  updateMe: (token, companyData) =>
    request("/api/companies/me", {
      method: "PUT",
      token,
      body: JSON.stringify(companyData),
    }),
};

// ─── Emissions ───────────────────────────────────────────────────────────────

export const emissionsAPI = {
  submitScope1: (token, data) =>
    request("/api/emissions/scope1", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  submitScope2: (token, data) =>
    request("/api/emissions/scope2", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  getSummary: (token, year) =>
  request(`/api/emissions/summary?year=${year}`, { token }),
};

// ─── Settings ────────────────────────────────────────────────────────────────

export const settingsAPI = {
  get: (token) =>
    request("/api/settings", { token }),

  update: (token, settings) =>
    request("/api/settings", {
      method: "PUT",
      token,
      body: JSON.stringify(settings),
    }),
};

// ─── Admin ───────────────────────────────────────────────────────────────────

export const adminAPI = {
  getCities: (token, region = "middle-east", country = "uae") =>
    request(`/api/admin/cities?region=${region}&country=${country}`, { token }),

  getFactors: (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/admin/factors?${query}`, { token });
  },

  createFactor: (token, factor) =>
    request("/api/admin/factors", {
      method: "POST",
      token,
      body: JSON.stringify(factor),
    }),

  deleteFactor: (token, factorId) =>
    request(`/api/admin/factors/${factorId}`, {
      method: "DELETE",
      token,
    }),
};