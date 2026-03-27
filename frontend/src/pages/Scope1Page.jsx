// src/pages/Scope1Page.jsx
import React, { useEffect } from "react";
import Scope1Container from "../components/scope1/Scope1Container";
import { useCompanyStore } from "../store/companyStore";
import { useAuthStore } from "../store/authStore";

export default function Scope1Page() {
  const { company, fetchCompany, loading, error } = useCompanyStore();
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (token && !company && !loading) {
      fetchCompany(token);
    }
  }, [token, company, loading, fetchCompany]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading company data...</p>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #E5E7EB;
            border-top-color: #2E7D64;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          p { margin-top: 16px; color: #6B7280; }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>Error loading company: {error}</p>
        <button onClick={() => fetchCompany(token)}>Retry</button>
        <style jsx>{`
          .error-container { text-align: center; padding: 40px; }
          p { color: #DC2626; margin-bottom: 16px; }
          button {
            padding: 8px 16px;
            background: #2E7D64;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="scope1-page">
      <Scope1Container />
      <style jsx>{`
        .scope1-page {
          width: 100%;
          min-height: 100vh;
          background: white;
        }
      `}</style>
    </div>
  );
}