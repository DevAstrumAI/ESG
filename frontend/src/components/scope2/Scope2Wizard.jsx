// src/components/scope2/Scope2Wizard.jsx
import { useState, useEffect } from "react";
import { useEmissionStore } from "../../store/emissionStore";
import { normalizeScope2ElectricityEntry, normalizeScope2HeatingEntry, normalizeScope2RenewableEntry } from "../../utils/emissionHydration";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";
import ElectricityForm from "./ElectricityForm";
import HeatingForm from "./HeatingForm";
import RenewableForm from "./RenewableForm";
import Scope2Summary from "./Scope2Summary";
import { useAuthStore } from "../../store/authStore";
import { emissionsAPI } from "../../services/api";
import { FiZap, FiThermometer, FiSun, FiBarChart2 } from "react-icons/fi";

export default function Scope2Wizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showSummary, setShowSummary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const electricity = useEmissionStore((s) => s.scope2Electricity || []);
  const heating = useEmissionStore((s) => s.scope2Heating || []);
  const renewables = useEmissionStore((s) => s.scope2Renewable || []);

  const addScope2Electricity = useEmissionStore((s) => s.addScope2Electricity);
  const addScope2Heating = useEmissionStore((s) => s.addScope2Heating);
  const addScope2Renewable = useEmissionStore((s) => s.addScope2Renewable);
  const reset = useEmissionStore((s) => s.reset);
  const submitScope2 = useEmissionStore((s) => s.submitScope2);
  const selectedYear = useEmissionStore((s) => s.selectedYear);

  const { token } = useAuthStore();

  // Load existing scope 2 data on component mount
  useEffect(() => {
    const loadExistingData = async () => {
      console.log('🔍 Loading existing scope 2 data...');
      console.log('Token available:', !!token);

      if (!token) {
        console.log('❌ No token available, skipping data load');
        setLoading(false);
        return;
      }

      try {
        console.log('📡 Making API call to getScope2Data');
        const data = await emissionsAPI.getScope2Data(token, selectedYear);
        console.log('✅ Received data:', data);

          // Reset store to clear any existing data
          reset();

          // Populate the store with existing data
          if (data.electricity && data.electricity.length > 0) {
            console.log(`📝 Adding ${data.electricity.length} electricity entries`);
            data.electricity.forEach((entry, index) =>
              addScope2Electricity(normalizeScope2ElectricityEntry(entry, `${Date.now()}-electricity-${index}`))
            );
          }
          if (data.heating && data.heating.length > 0) {
            console.log(`📝 Adding ${data.heating.length} heating entries`);
            data.heating.forEach((entry, index) =>
              addScope2Heating(normalizeScope2HeatingEntry(entry, `${Date.now()}-heating-${index}`))
            );
          }
          if (data.renewables && data.renewables.length > 0) {
            console.log(`📝 Adding ${data.renewables.length} renewable entries`);
            data.renewables.forEach((entry, index) =>
              addScope2Renewable(normalizeScope2RenewableEntry(entry, `${Date.now()}-renewable-${index}`))
            );
          }
      } catch (error) {
        console.error('❌ Error loading existing scope 2 data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExistingData();
  }, [token, addScope2Electricity, addScope2Heating, addScope2Renewable, reset]);

  const goToSummary = () => setShowSummary(true);

  const submitScope2Step = async () => {
    setSubmitting(true);
    try {
      const rows = currentStep === 1 ? electricity : currentStep === 2 ? heating : renewables;
      const rawMonth = rows[0]?.month ?? `${selectedYear}-01`;
      const monthString = typeof rawMonth === "string" ? rawMonth : String(rawMonth);
      const correctedMonth = monthString.includes("-") ? monthString : `${selectedYear}-01`;
      const result = await submitScope2(token, selectedYear, correctedMonth);
      if (!result.success) {
        console.error("Scope2 submit failed:", result.error);
        return false;
      }
      return true;
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { id: 1, label: "Electricity", icon: <FiZap size={16} />, component: <ElectricityForm /> },
    { id: 2, label: "Heating", icon: <FiThermometer size={16} />, component: <HeatingForm /> },
    { id: 3, label: "Renewables", icon: <FiSun size={16} />, component: <RenewableForm /> },
  ];

  const hasStepData = (stepId) => {
    switch (stepId) {
      case 1: return electricity.length > 0;
      case 2: return heating.length > 0;
      case 3: return renewables.length > 0;
      default: return false;
    }
  };

  if (loading) {
    return (
      <div className="wizard-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your existing Scope 2 data...</p>
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
        <Scope2Summary />
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

      <div className="step-content">
        {steps[currentStep - 1].component}
      </div>

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
                const success = await submitScope2Step();
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
                const success = await submitScope2Step();
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