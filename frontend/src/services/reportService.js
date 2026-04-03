// frontend/src/services/reportService.js
import { useAuthStore } from "../store/authStore";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const reportService = {
  /**
   * Generate AI-powered ESG report
   * @param {number} year - Reporting year (e.g., 2026)
   * @param {string|null} month - Optional month for monthly reports (e.g., "2026-03")
   * @param {number|null} baseYear - Optional baseline year (defaults to year - 1)
   */
  generateAIReport: async (year, month = null, baseYear = null) => {
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
  }
};