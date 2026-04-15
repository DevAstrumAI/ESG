const DEFAULT_API_URL = "http://localhost:8001";

export function getApiBaseUrl(fallback = DEFAULT_API_URL) {
  const configured = (process.env.REACT_APP_API_URL || "").trim();
  const base = configured || fallback;

  // Prevent mixed-content failures when frontend is served over HTTPS.
  if (
    typeof window !== "undefined" &&
    window.location?.protocol === "https:" &&
    base.startsWith("http://")
  ) {
    return `https://${base.slice("http://".length)}`;
  }

  return base;
}
