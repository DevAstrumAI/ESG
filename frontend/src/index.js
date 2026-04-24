// src/index.js
import React from "react";
import './index.css';
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./app/routes";
import { warmupBackend } from "./services/api";

// ─── Clear stale auth data on app startup ───────────────────────────────────
warmupBackend();

const clearStaleAuthOnStartup = () => {
  // Clear auth storage
  const storedAuth = localStorage.getItem("auth-storage");
  if (storedAuth) {
    try {
      const parsed = JSON.parse(storedAuth);
      if (!parsed.state?.token || !parsed.state?.user) {
        console.log("Clearing stale auth data on startup");
        localStorage.removeItem("auth-storage");
      }
    } catch (error) {
      console.error("Error parsing auth-storage, clearing it:", error);
      localStorage.removeItem("auth-storage");
    }
  }
  
  // ✅ FIX: Clear company storage if auth is cleared
  if (!localStorage.getItem("auth-storage")) {
    localStorage.removeItem("company-storage");
  }
  
  // ✅ FIX: Clear emission storage if auth is cleared
  if (!localStorage.getItem("auth-storage")) {
    localStorage.removeItem("emission-storage");
  }
};

// Run cleanup before rendering
clearStaleAuthOnStartup();

// ✅ FIX: Add version check to force cache clear on new deploy
const APP_VERSION = "1.0.1"; // Increment this on each deploy
const savedVersion = localStorage.getItem("app-version");
if (savedVersion !== APP_VERSION) {
  console.log("New version detected, clearing cache");
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem("app-version", APP_VERSION);
}

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);