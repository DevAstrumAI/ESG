import AppRoutes from "./app/routes";
const API = process.env.REACT_APP_API_URL || "http://localhost:8001";

export default function App() {
  fetch(`${API}/health`, { method: "GET" }).catch(() => {});

  return <AppRoutes />;
}