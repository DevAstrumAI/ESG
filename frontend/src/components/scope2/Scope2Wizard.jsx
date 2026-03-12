import { useState } from "react";
import { useEmissionStore } from "../../store/emissionStore";
import { useAuthStore } from "../../store/authStore";
import Card from "../ui/Card";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";
import ElectricityForm from "./ElectricityForm";
import HeatingForm from "./HeatingForm";
import RenewableForm from "./RenewableForm";
import Scope2Summary from "./Scope2Summary";

function SubmitScope2Button({ onSubmitted }) {
  const { submitScope2, loading } = useEmissionStore();
  const token = useAuthStore((state) => state.token);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const handleSubmit = async () => {
    const result = await submitScope2(token, year, month);
    if (result.success) {
      setSubmitted(true);
      onSubmitted?.();
      setError(null);
    } else {
      setError(result.error || "Submission failed");
    }
  };

  if (submitted) return (
    <PrimaryButton disabled className="nav-btn finish-btn">
      ✅ Submitted!
    </PrimaryButton>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <select 
          value={year} 
          onChange={(e) => setYear(Number(e.target.value))}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "14px" }}
        >
          {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select 
          value={month} 
          onChange={(e) => setMonth(Number(e.target.value))}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "14px" }}
        >
          {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
            .map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
      </div>
      {error && <span style={{ color: "red", fontSize: "13px" }}>{error}</span>}
      <PrimaryButton onClick={handleSubmit} disabled={loading} className="nav-btn finish-btn">
        {loading ? "Submitting..." : "Submit Scope 2 →"}
      </PrimaryButton>
    </div>
  );
}

export default function Scope2Wizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4; // 3 categories + summary

  // Get data from store to check completion
  const electricity = useEmissionStore((s) => s.scope2Electricity);
  const heating = useEmissionStore((s) => s.scope2Heating);
  const renewable = useEmissionStore((s) => s.scope2Renewable);

  const steps = [
    { id: 1, name: "Purchased Electricity", icon: "⚡", component: <ElectricityForm /> },
    { id: 2, name: "Heating & Cooling", icon: "🔥", component: <HeatingForm /> },
    { id: 3, name: "Renewables", icon: "🌱", component: <RenewableForm /> },
    { id: 4, name: "Summary", icon: "📊", component: <Scope2Summary /> },
  ];

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step) => {
    setCurrentStep(step);
  };

  // Check if current step has data (for visual indicator)
  const hasStepData = (stepId) => {
    switch(stepId) {
      case 1: return electricity.length > 0;
      case 2: return heating.length > 0;
      case 3: return renewable.length > 0;
      default: return false;
    }
  };

  return (
    <div className="wizard-container">
      {/* Step Progress Indicator */}
      <div className="progress-container">
        <div className="steps">
          {steps.map((step) => (
            <div key={step.id} className="step-wrapper">
              <button
                onClick={() => goToStep(step.id)}
                className={`step-indicator ${currentStep === step.id ? 'active' : ''} ${hasStepData(step.id) && currentStep !== step.id ? 'completed' : ''}`}
                disabled={step.id === 4} // Can't jump to summary directly
              >
                <span className="step-icon">{step.icon}</span>
                {hasStepData(step.id) && currentStep !== step.id && (
                  <span className="check-mark">✓</span>
                )}
              </button>
              <span className={`step-name ${currentStep === step.id ? 'active' : ''}`}>
                {step.name}
              </span>
            </div>
          ))}
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Step Content */}
      <Card className="step-content-card">
        <div className="step-header">
          <h2>
            <span className="step-icon-large">{steps[currentStep-1].icon}</span>
            {steps[currentStep-1].name}
          </h2>
          <div className="step-counter">
            Step {currentStep} of {totalSteps}
          </div>
        </div>

        <div className="step-component">
          {steps[currentStep-1].component}
        </div>

        {/* Navigation Buttons */}
        <div className="navigation-buttons">
          <SecondaryButton 
            onClick={prevStep} 
            disabled={currentStep === 1}
            className="nav-btn prev-btn"
          >
            ← Previous
          </SecondaryButton>
          
          {currentStep < totalSteps ? (
            <PrimaryButton 
              onClick={nextStep} 
              className="nav-btn next-btn"
            >
              Next →
            </PrimaryButton>
          ) : (
            <SubmitScope2Button />
          )}
        </div>
      </Card>

      <style jsx>{`
        .wizard-container {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* Progress Indicator */
        .progress-container {
          margin-bottom: 32px;
          background: white;
          border-radius: 20px;
          padding: 24px 24px 16px 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(46, 125, 50, 0.15);
        }

        .steps {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          position: relative;
        }

        .step-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          text-align: center;
          position: relative;
        }

        .step-indicator {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: white;
          border: 2px solid #E5E7EB;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: #9CA3AF;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          padding: 0;
        }

        .step-indicator:hover:not(:disabled) {
          border-color: #2E7D32;
          transform: scale(1.05);
        }

        .step-indicator.active {
          border-color: #2E7D32;
          color: #2E7D32;
          transform: scale(1.1);
          box-shadow: 0 0 0 4px rgba(46, 125, 50, 0.15);
        }

        .step-indicator.completed {
          background: #2E7D32;
          border-color: #2E7D32;
          color: white;
        }

        .check-mark {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #10B981;
          color: white;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
        }

        .step-name {
          font-size: 12px;
          font-weight: 500;
          color: #6B7280;
          transition: all 0.3s ease;
          max-width: 100px;
          text-align: center;
        }

        .step-name.active {
          color: #2E7D32;
          font-weight: 600;
        }

        .progress-bar {
          height: 6px;
          background: #E5E7EB;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #2E7D32, #4CAF50);
          border-radius: 3px;
          transition: width 0.4s ease;
        }

        /* Content Card */
        .step-content-card {
          padding: 0 !important;
          overflow: hidden !important;
          border: 1px solid rgba(46, 125, 50, 0.2) !important;
        }

        .step-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          background: linear-gradient(135deg, #f0f9f0 0%, #e6f3e6 100%);
          border-bottom: 2px solid rgba(46, 125, 50, 0.2);
        }

        .step-header h2 {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #1B5E20;
        }

        .step-icon-large {
          font-size: 28px;
        }

        .step-counter {
          padding: 6px 14px;
          background: white;
          border-radius: 30px;
          font-size: 13px;
          font-weight: 600;
          color: #2E7D32;
          border: 1px solid rgba(46, 125, 50, 0.2);
        }

        .step-component {
          padding: 0;
          min-height: 500px;
        }

        /* Navigation Buttons */
        .navigation-buttons {
          display: flex;
          justify-content: space-between;
          padding: 20px 24px;
          border-top: 2px solid rgba(46, 125, 50, 0.1);
          background: white;
        }

        .nav-btn {
          min-width: 140px;
          padding: 12px 24px !important;
          font-size: 15px !important;
        }

        .prev-btn {
          background: white !important;
          color: #374151 !important;
          border: 2px solid #E5E7EB !important;
        }

        .prev-btn:hover:not(:disabled) {
          border-color: #2E7D32 !important;
          background: #f0f9f0 !important;
        }

        .next-btn {
          background: linear-gradient(135deg, #2E7D32, #1B5E20) !important;
        }

        .finish-btn {
          background: linear-gradient(135deg, #2E7D32, #1B5E20) !important;
        }

        .nav-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .steps {
            flex-wrap: wrap;
            gap: 12px;
          }

          .step-wrapper {
            flex: 0 0 calc(50% - 6px);
          }

          .step-indicator {
            width: 40px;
            height: 40px;
            font-size: 18px;
          }

          .step-name {
            font-size: 10px;
            max-width: 80px;
          }

          .navigation-buttons {
            flex-direction: column-reverse;
            gap: 12px;
          }

          .nav-btn {
            width: 100%;
          }

          .step-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
        }

        @media (max-width: 480px) {
          .step-wrapper {
            flex: 0 0 100%;
          }
        }
      `}</style>
    </div>
  );
}