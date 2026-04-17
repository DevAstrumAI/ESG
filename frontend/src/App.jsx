import { useEffect, useRef } from "react";
import AppRoutes from "./app/routes";
import { useAuthStore } from "./store/authStore";
const API = process.env.REACT_APP_API_URL || "http://localhost:8001";

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

function decodeJwtExpMs(token) {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized));
    if (!decoded?.exp) return null;
    return Number(decoded.exp) * 1000;
  } catch {
    return null;
  }
}

export default function App() {
  const token = useAuthStore((s) => s.token);
  const loggedIn = useAuthStore((s) => s.loggedIn);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const refreshingRef = useRef(false);
  const lastRefreshAtRef = useRef(0);

  fetch(`${API}/health`, { method: "GET" }).catch(() => {});

  useEffect(() => {
    if (!loggedIn || !token) return undefined;

    const timer = window.setInterval(async () => {
      const state = useAuthStore.getState();
      if (!state.loggedIn || !state.token) return;

      const expMs = decodeJwtExpMs(state.token);
      if (!expMs) return;

      const now = Date.now();
      const nearExpiry = expMs - now <= REFRESH_THRESHOLD_MS;

      if (
        nearExpiry &&
        !refreshingRef.current &&
        now - lastRefreshAtRef.current > 60_000
      ) {
        refreshingRef.current = true;
        try {
          const refreshed = await refreshToken();
          if (refreshed) lastRefreshAtRef.current = Date.now();
        } finally {
          refreshingRef.current = false;
        }
      }
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [loggedIn, token, refreshToken]);

  return <AppRoutes />;
}