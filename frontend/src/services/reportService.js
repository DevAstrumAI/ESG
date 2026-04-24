// frontend/src/services/reportService.js
import { useAuthStore } from "../store/authStore";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

export const reportService = {
  /**
   * Generate AI-powered ESG report
   * @param {number} year - Reporting year (e.g., 2026)
   * @param {string|null} month - Optional month for monthly reports (e.g., "2026-03")
   * @param {number|null} baseYear - Optional baseline year (defaults to year - 1)
   */
  generateAIReport: async (year, month = null, baseYear = null, location = null, periodMeta = null) => {
    const token = useAuthStore.getState().token;
    
    const body = {
      year: year
    };
    
    if (month) {
      body.month = month;
    }
    
    if (baseYear) {
      body.base_year = baseYear;  // ← MAKE SURE THIS LINE EXISTS
    }
    if (location?.city && location.city !== "all") {
      body.city = location.city;
    }
    if (location?.country && location.country !== "all") {
      body.country = location.country;
    }
    if (periodMeta?.period) {
      body.period = periodMeta.period;
    }
    if (periodMeta?.quarter) {
      body.quarter = periodMeta.quarter;
    }
    
    console.log("Generating report with body:", body);
    
    const response = await fetch(`${API_URL}/api/reports/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to generate AI report: ${response.status}`);
    }
    
    return await response.json();
  },
  
  /**
   * Test endpoint to check if API is reachable
   */
  testAPI: async () => {
    const response = await fetch(`${API_URL}/api/reports/test`);
    if (!response.ok) {
      throw new Error(`Test API failed: ${response.status}`);
    }
    return await response.json();
  },

  exportCSV: async ({ year, period = "yearly", month = null, quarter = null, location = null }) => {
    const token = useAuthStore.getState().token;
    const params = new URLSearchParams({
      year: String(year),
      period: String(period || "yearly"),
    });
    if (month) params.set("month", month);
    if (quarter) params.set("quarter", quarter);
    if (location?.country) params.set("country", location.country);
    if (location?.city) params.set("city", location.city);

    const response = await fetch(`${API_URL}/api/reports/export-csv?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      let detail = `CSV export failed: ${response.status}`;
      try {
        const payload = await response.json();
        detail = payload?.detail || detail;
      } catch (_err) {
        // no-op
      }
      throw new Error(detail);
    }
    const blob = await response.blob();
    const contentDisposition = response.headers.get("content-disposition") || "";
    const matched = contentDisposition.match(/filename="([^"]+)"/i);
    const filename = matched?.[1] || `esg_raw_data_${year}.csv`;
    return { blob, filename };
  },
};