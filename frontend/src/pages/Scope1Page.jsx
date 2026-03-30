// src/pages/Scope1Page.jsx
import React, { useEffect, useState } from "react";
import Scope1Container from "../components/scope1/Scope1Container";
import { useCompanyStore } from "../store/companyStore";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import PrimaryButton from "../components/ui/PrimaryButton";
import { FiBriefcase } from "react-icons/fi";

export default function Scope1Page() {
  const navigate = useNavigate();
  const { company, fetchCompany, loading, error } = useCompanyStore();
  const token = useAuthStore((state) => state.token);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkCompany = async () => {
      if (token && !hasChecked) {
        console.log("Checking company...");
        await fetchCompany(token);
        setHasChecked(true);
      }
    };
    checkCompany();
  }, [token, fetchCompany, hasChecked]);

  // Show setup message if no company after check is complete
  if (hasChecked && !company && !loading) {
    return (
      <div className="setup-message-container">
        <div className="setup-card">
          <div className="setup-icon">
            <FiBriefcase size={48} />
          </div>
          <h2>Complete Company Setup First</h2>
          <p>
            Before you can start tracking emissions, please set up your company profile.
            This includes your company name, location, industry, and other details needed for accurate calculations.
          </p>
          <PrimaryButton onClick={() => navigate("/setup")} className="setup-btn">
            Go to Company Setup
          </PrimaryButton>
        </div>
        <style jsx>{`
          .setup-message-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 70vh;
            padding: 24px;
          }
          .setup-card {
            background: white;
            border-radius: 16px;
            padding: 48px;
            text-align: center;
            max-width: 500px;
            border: 1px solid #E5E7EB;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          }
          .setup-icon {
            width: 80px;
            height: 80px;
            background: #F8FAF8;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            color: #2E7D64;
            border: 1px solid #E5E7EB;
          }
          .setup-card h2 {
            font-size: 24px;
            font-weight: 600;
            color: #1B4D3E;
            margin-bottom: 16px;
          }
          .setup-card p {
            color: #4A5568;
            line-height: 1.6;
            margin-bottom: 32px;
            font-size: 15px;
          }
          .setup-btn {
            background: #2E7D64 !important;
            padding: 12px 28px !important;
            font-size: 16px !important;
          }
        `}</style>
      </div>
    );
  }

  // Show loading state
  if (loading || (!hasChecked && !company)) {
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
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          p { margin-top: 16px; color: #6B7280; }
        `}</style>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="error-container">
        <p>Error loading company: {error}</p>
        <button onClick={() => {
          setHasChecked(false);
          fetchCompany(token);
        }}>Retry</button>
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

  // Show Scope 1 page if company exists
  if (company) {
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

  return null;
}