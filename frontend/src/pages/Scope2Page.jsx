// src/pages/Scope2Page.jsx
import React, { useEffect } from "react";
import Scope2Container from "../components/scope2/Scope2Container";
import { useCompanyStore } from "../store/companyStore";
import { useAuthStore } from "../store/authStore";

export default function Scope2Page() {
  const { company, fetchCompany, loading, error } = useCompanyStore();
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (token && !company && !loading) {
      console.log("🔄 Fetching company data for Scope2 page...");
      fetchCompany(token);
    }
  }, [token, company, loading, fetchCompany]);

  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "400px" 
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "3px solid #E5E7EB",
          borderTopColor: "#2E7D32",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }} />
        <p style={{ marginTop: "16px", color: "#6B7280" }}>Loading company data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#DC2626" }}>
        <p>Error loading company: {error}</p>
        <button 
          onClick={() => fetchCompany(token)} 
          style={{
            marginTop: "16px",
            padding: "8px 16px",
            background: "#2E7D32",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer"
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  console.log("🏢 Company loaded in Scope2Page:", company);
  console.log("📍 Primary location:", company?.locations?.[0]);

  return (
    <div>
      <Scope2Container />
    </div>
  );
}