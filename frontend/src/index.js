import React from "react";
import './index.css';  // ← Make sure this line exists
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import AppRoutes from "./app/routes";

// ─── Clear stale auth data on app startup ───────────────────────────────────
const clearStaleAuthOnStartup = () => {
  const storedAuth = localStorage.getItem("auth-storage");
  if (storedAuth) {
    try {
      const parsed = JSON.parse(storedAuth);
      // If token is missing or user is null, clear it
      if (!parsed.state?.token || !parsed.state?.user) {
        console.log("Clearing stale auth data on startup");
        localStorage.removeItem("auth-storage");
      }
      // Optional: Check if token is expired (if you store expiration)
      // You can add an `expiresAt` field in your auth store for this
    } catch (error) {
      console.error("Error parsing auth-storage, clearing it:", error);
      localStorage.removeItem("auth-storage");
    }
  }
};

// Run cleanup before rendering
clearStaleAuthOnStartup();

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);