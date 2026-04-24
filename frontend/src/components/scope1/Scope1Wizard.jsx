// src/components/scope1/Scope1Wizard.jsx
import { useState, useEffect } from "react";
import { useEmissionStore } from "../../store/emissionStore";
import { useAuthStore } from "../../store/authStore";
import { emissionsAPI } from "../../services/api";
import { normalizeScope1MobileEntry, normalizeScope1StationaryEntry, normalizeScope1RefrigerantEntry, normalizeScope1FugitiveEntry } from "../../utils/emissionHydration";
import { FiTruck, FiBriefcase, FiWind, FiAlertCircle, FiBarChart2 } from "react-icons/fi";
import VehicleTable from "./VehicleTable";
import StationaryForm from "./StationaryForm";
import RefrigerantForm from "./RefrigerantForm";
import FugitiveForm from "./FugitiveForm";
import Scope1Summary from "./Scope1Summary";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";

export default function Scope1Wizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showSummary, setShowSummary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const vehicles     = useEmissionStore((s) => s.scope1Vehicles);
  const stationary   = useEmissionStore((s) => s.scope1Stationary);
  const refrigerants = useEmissionStore((s) => s.scope1Refrigerants);
  const fugitive     = useEmissionStore((s) => s.scope1Fugitive);

  const addScope1Vehicle = useEmissionStore((s) => s.addScope1Vehicle);
  const addScope1Stationary = useEmissionStore((s) => s.addScope1Stationary);
  const addScope1Refrigerant = useEmissionStore((s) => s.addScope1Refrigerant);
  const addScope1Fugitive = useEmissionStore((s) => s.addScope1Fugitive);
  const reset = useEmissionStore((s) => s.reset);
  const submitScope1 = useEmissionStore((s) => s.submitScope1);
  const isSubmitting = useEmissionStore((s) => s.isSubmitting);

  const selectedYear = useEmissionStore((s) => s.selectedYear);

  const { token } = useAuthStore();

  // Load existing scope 1 data on component mount
  useEffect(() => {
    const loadExistingData = async () => {
      console.log('🔍 Loading existing scope 1 data...');
      console.log('Token available:', !!token);

      if (!token) {
        console.log('❌ No token available, skipping data load');
        setLoading(false);
        return;
      }

      try {
        console.log('📡 Making API call to getScope1Data');
        const data = await emissionsAPI.getScope1Data(token, selectedYear);
        console.log('✅ Received data:', data);

          // Reset store to clear any existing data
          reset();

          // Populate the store with existing data
          if (data.mobile && data.mobile.length > 0) {
            console.log(`📝 Adding ${data.mobile.length} mobile entries`);
            data.mobile.forEach((entry, index) =>
              addScope1Vehicle(normalizeScope1MobileEntry(entry, `${Date.now()}-mobile-${index}`))
            );
          }
          if (data.stationary && data.stationary.length > 0) {
            console.log(`📝 Adding ${data.stationary.length} stationary entries`);
            data.stationary.forEach((entry, index) =>
              addScope1Stationary(normalizeScope1StationaryEntry(entry, `${Date.now()}-stationary-${index}`))
            );
          }
          if (data.refrigerants && data.refrigerants.length > 0) {
            console.log(`📝 Adding ${data.refrigerants.length} refrigerant entries`);
            data.refrigerants.forEach((entry, index) =>
              addScope1Refrigerant(normalizeScope1RefrigerantEntry(entry, `${Date.now()}-refrigerant-${index}`))
            );
          }
          if (data.fugitive && data.fugitive.length > 0) {
            console.log(`📝 Adding ${data.fugitive.length} fugitive entries`);
            data.fugitive.forEach((entry, index) =>
              addScope1Fugitive(normalizeScope1FugitiveEntry(entry, `${Date.now()}-fugitive-${index}`))
            );
          }
      } catch (error) {
        console.error('❌ Error loading existing scope 1 data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExistingData();
  }, [token, addScope1Vehicle, addScope1Stationary, addScope1Refrigerant, addScope1Fugitive, reset]);

  const goToSummary = () => setShowSummary(true);

  const submitScope1Step = async () => {
    setSubmitting(true);
    try {
      const rows = currentStep === 1 ? vehicles : currentStep === 2 ? stationary : currentStep === 3 ? refrigerants : fugitive;
      const monthString = rows[0]?.month || `${selectedYear}-01`;
      const result = await submitScope1(token, selectedYear, monthString);
      if (!result.success) {
        console.error("Scope1 submit failed:", result.error);
        return false;
      }
      return true;
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { id: 1, label: "Mobile", icon: <FiTruck size={16} />, component: <VehicleTable /> },
    { id: 2, label: "Stationary", icon: <FiBriefcase size={16} />, component: <StationaryForm /> },
    { id: 3, label: "Refrigerant", icon: <FiWind size={16} />, component: <RefrigerantForm /> },
    { id: 4, label: "Fugitive", icon: <FiAlertCircle size={16} />, component: <FugitiveForm /> },
  ];

  const hasStepData = (stepId) => {
    switch (stepId) {
      case 1: return vehicles.length > 0;
      case 2: return stationary.length > 0;
      case 3: return refrigerants.length > 0;
      case 4: return fugitive.length > 0;
      default: return false;
    }
  };

  if (loading) {
    return (
      <div className="wizard-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your existing Scope 1 data...</p>
        </div>
        <style jsx>{`
          .wizard-container { width: 100%; max-width: 1400px; margin: 0 auto; }
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
            gap: 16px;
          }
          .loading-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid #E5E7EB;
            border-top: 3px solid #2E7D64;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (showSummary) {
    return (
      <div className="wizard-container">
        <button className="back-btn" onClick={() => setShowSummary(false)}>
          ← Back to Entry
        </button>
        <Scope1Summary />
        <style jsx>{`
          .wizard-container { width: 100%; max-width: 1400px; margin: 0 auto; }
          .back-btn {
            margin-bottom: 16px;
            background: none;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 8px 16px;
            font-size: 14px;
            color: #4A5568;
            cursor: pointer;
          }
          .back-btn:hover { border-color: #2E7D64; color: #2E7D64; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="wizard-container">
      {/* Pill Tab Navigation */}
      <div className="tab-bar">
        {steps.map((step) => (
          <button
            key={step.id}
            onClick={() => setCurrentStep(step.id)}
            className={`tab-pill ${currentStep === step.id ? "active" : ""}`}
          >
            <span className="tab-icon">{step.icon}</span>
            <span className="tab-label">{step.label}</span>
            {hasStepData(step.id) && currentStep !== step.id && (
              <span className="tab-dot" />
            )}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="step-content">
        {steps[currentStep - 1].component}
      </div>

      {/* Navigation Footer */}
      <div className="nav-footer">
        <SecondaryButton
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          disabled={currentStep === 1}
          className="nav-prev"
        >
          ← Previous
        </SecondaryButton>
        <div className="nav-right">
          {currentStep < steps.length ? (
            <PrimaryButton
              onClick={async () => {
                const success = await submitScope1Step();
                if (success) setCurrentStep((s) => Math.min(steps.length, s + 1));
              }}
              disabled={submitting}
              className="nav-next"
            >
              {submitting ? "Saving..." : "Next →"}
            </PrimaryButton>
          ) : (
            <PrimaryButton
              onClick={async () => {
                const success = await submitScope1Step();
                if (success) goToSummary();
              }}
              disabled={submitting}
              className="nav-next"
            >
              {submitting ? "Saving..." : "View Summary →"}
            </PrimaryButton>
          )}
        </div>
      </div>

      <style jsx>{`
        .wizard-container {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
        }

        .tab-bar {
          display: flex;
          gap: 8px;
          background: #F3F4F6;
          border-radius: 10px;
          padding: 4px;
          margin-bottom: 20px;
          width: fit-content;
        }

        .tab-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 7px;
          border: none;
          background: transparent;
          font-size: 14px;
          font-weight: 500;
          color: #6B7280;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .tab-pill:hover {
          color: #1B4D3E;
          background: rgba(255,255,255,0.6);
        }

        .tab-pill.active {
          background: white;
          color: #1B4D3E;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        .tab-icon { font-size: 15px; display: inline-flex; align-items: center; }

        .tab-dot {
          width: 6px;
          height: 6px;
          background: #2E7D64;
          border-radius: 50%;
          margin-left: 2px;
        }

        .step-content {
          background: white;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
          padding: 24px;
          min-height: 400px;
          margin-bottom: 16px;
        }

        .nav-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          border-top: 1px solid #E5E7EB;
        }

        .nav-right { display: flex; align-items: center; gap: 12px; }

        .nav-prev {
          background: white !important;
          border: 1px solid #E5E7EB !important;
          color: #4A5568 !important;
        }
        .nav-prev:hover:not(:disabled) {
          border-color: #2E7D64 !important;
          color: #2E7D64 !important;
        }

        .nav-next { background: #2E7D64 !important; }

        @media (max-width: 640px) {
          .tab-bar { width: 100%; }
          .tab-pill { flex: 1; justify-content: center; padding: 8px 10px; }
          .tab-label { display: none; }
        }
      `}</style>
    </div>
  );
}