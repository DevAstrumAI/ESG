// src/services/formalReportService.js
import { useAuthStore } from "../store/authStore";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

export const generateFormalReport = async (token, year = null) => {
  const body = year ? { year } : {};
  const response = await fetch(`${API_URL}/api/reports/generate-formal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to generate formal report");
  }

  return response.json();
};