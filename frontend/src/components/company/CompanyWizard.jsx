// src/components/company/CompanyWizard.jsx
import { useState, useEffect } from "react";
import CompanyInfoForm from "./CompanyInfoForm";
import RegionSelector from "./RegionSelector";
import IndustrySelector from "./IndustrySelector";
import EmployeeForm from "./EmployeeForm";
import RevenueForm from "./RevenueForm";
import FacilitiesList from "./FacilitiesList";
import SetupSummary from "./SetupSummary";
import LocationManager from "./LocationManager";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";
import Card from "../ui/Card";
import { FiCheck, FiArrowRight, FiArrowLeft } from "react-icons/fi";
import { BiLeaf } from "react-icons/bi";
import { useAuthStore } from "../../store/authStore";
import { useCompanyStore } from "../../store/companyStore";
import { useNavigate } from "react-router-dom";

export default function CompanyWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [companyData, setCompanyData] = useState({
    name: "",
    description: "",
    region: "",
    country: "",
    industry: "",
    employees: "",
    revenue: "",
    locations: [],
  });
  
  const { company, fetchCompany, updateCompany, createCompany, loading } = useCompanyStore();
  const token = useAuthStore((state) => state.token);
  const { user } = useAuthStore();

  // Fetch company data when component mounts
  useEffect(() => {
    const loadCompany = async () => {
      if (token) {
        await fetchCompany(token);
      }
    };
    loadCompany();
  }, [token, fetchCompany]);

  // If company exists, populate the wizard data
  useEffect(() => {
    if (company) {
      setCompanyData({
        name: company.basicInfo?.name || "",
        description: company.basicInfo?.description || "",
        region: company.basicInfo?.region || "",
        country: company.locations?.[0]?.country || "",
        industry: company.basicInfo?.industry || "",
        employees: company.basicInfo?.employees || "",
        revenue: company.basicInfo?.revenue || "",
        locations: company.locations || [],
      });
    }
  }, [company]);

  const steps = [
    { id: 1, label: "Company Info", icon: "🏢" },
    { id: 2, label: "Region", icon: "🌍" },
    { id: 3, label: "Location", icon: "🗺️" },
    { id: 4, label: "Industry", icon: "🏭" },
    { id: 5, label: "Employees", icon: "👥" },
    { id: 6, label: "Revenue", icon: "💰" },
    { id: 7, label: "Facilities", icon: "🏛️" },
    { id: 8, label: "Summary", icon: "📋" },
  ];

  function updateField(field, value) {
    setCompanyData((prev) => ({ ...prev, [field]: value }));
  }

  const handleUpdateCompany = async () => {
    setLoadingSubmit(true);
    setSubmitError(null);
    
    // In CompanyWizard.jsx, in the nextStep function when creating company:
    const payload = {
      name: companyData.name,
      description: companyData.description,
      industry: companyData.industry,
      employees: Number(companyData.employees),
      revenue: Number(companyData.revenue),
      region: companyData.region,  // ← Make sure this is included
      fiscalYear: new Date().getFullYear(),
      locations: companyData.locations.map((loc) => ({
        city: loc.city || loc.name,
        country: loc.country,
        isPrimary: loc.isPrimary || false,
      })),
    };
    
    const result = await updateCompany(token, payload);
    setLoadingSubmit(false);
    
    if (result.success) {
      navigate("/dashboard");
    } else {
      setSubmitError(result.error || "Failed to update company");
    }
  };

  const handleCreateCompany = async () => {
    setLoadingSubmit(true);
    setSubmitError(null);
    
    const payload = {
      name: companyData.name,
      description: companyData.description,
      industry: companyData.industry,
      employees: Number(companyData.employees),
      revenue: Number(companyData.revenue),
      region: companyData.region,
      fiscalYear: new Date().getFullYear(),
      locations: companyData.locations.map((loc) => ({
        city: loc.city || loc.name,
        country: loc.country,
        isPrimary: loc.isPrimary || false,
      })),
    };
    
    const result = await createCompany(token, payload);
    setLoadingSubmit(false);
    
    if (result.success) {
      navigate("/dashboard");
    } else {
      setSubmitError(result.error || "Failed to create company");
    }
  };

  async function nextStep() {
    if (step < steps.length) {
      setStep((prev) => prev + 1);
    } else {
      // Final step - create or update company
      if (company) {
        await handleUpdateCompany();
      } else {
        await handleCreateCompany();
      }
    }
  }

  function prevStep() {
    if (step > 1) setStep((prev) => prev - 1);
  }

  const isStepValid = () => {
    switch(step) {
      case 1: return companyData.name.trim() !== "";
      case 2: return companyData.region !== "";
      case 3: return companyData.country !== "";
      case 4: return companyData.industry !== "";
      case 5: return companyData.employees !== "";
      case 6: return companyData.revenue !== "";
      case 7: return companyData.locations.length > 0;
      case 8: return true;
      default: return true;
    }
  };

  // If company exists, show summary view
  if (company && company.basicInfo?.name) {
    return (
      <div className="wizard-container">
        <SetupSummary data={companyData} updateField={updateField} />
        <div className="summary-actions">
          {submitError && (
            <div className="error-message">
              ⚠️ {submitError}
            </div>
          )}
          <PrimaryButton 
            onClick={handleUpdateCompany} 
            className="update-btn"
            disabled={loadingSubmit}
          >
            {loadingSubmit ? "Saving..." : "Save Changes"}
          </PrimaryButton>
        </div>
        <style jsx>{`
          .wizard-container {
            max-width: 900px;
            margin: 0 auto;
          }
          .summary-actions {
            margin-top: 24px;
            display: flex;
            justify-content: flex-end;
          }
          .error-message {
            background: #FEF2F2;
            border: 1px solid #FECACA;
            color: #DC2626;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            margin-right: 16px;
            flex: 1;
          }
          .update-btn {
            background: #2E7D64 !important;
            padding: 12px 32px !important;
          }
          .update-btn:hover {
            background: #1B4D3E !important;
          }
        `}</style>
      </div>
    );
  }

  // Show loading state while fetching company
  if (loading && !company) {
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

  return (
    <div className="wizard-container">
      {/* Step Progress Header */}
      <div className="wizard-header">
        <div className="steps-progress">
          {steps.map((s) => (
            <div key={s.id} className="step-item">
              <div className={`step-indicator ${step >= s.id ? 'completed' : ''} ${step === s.id ? 'active' : ''}`}>
                {step > s.id ? <FiCheck /> : s.icon}
              </div>
              <span className={`step-label ${step === s.id ? 'active' : ''}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${(step / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="wizard-content-card">
        <div className="wizard-content">
          {step === 1 && <CompanyInfoForm data={companyData} updateField={updateField} />}
          {step === 2 && <RegionSelector data={companyData} updateField={updateField} />}
          {step === 3 && <LocationManager data={companyData} updateField={updateField} />}
          {step === 4 && <IndustrySelector data={companyData} updateField={updateField} />}
          {step === 5 && <EmployeeForm data={companyData} updateField={updateField} />}
          {step === 6 && <RevenueForm data={companyData} updateField={updateField} />}
          {step === 7 && <FacilitiesList locations={companyData.locations} />}
          {step === 8 && <SetupSummary data={companyData} updateField={updateField} />}
        </div>

        {/* Navigation Buttons */}
        <div className="wizard-footer">
          {step > 1 && (
            <SecondaryButton onClick={prevStep} className="nav-btn back-btn">
              <FiArrowLeft /> Back
            </SecondaryButton>
          )}
          
          <PrimaryButton 
            onClick={nextStep} 
            className={`nav-btn next-btn ${!isStepValid() ? 'disabled' : ''}`}
            disabled={!isStepValid()}
          >
            {step === steps.length ? "Complete Setup" : "Continue"} 
            {step < steps.length && <FiArrowRight />}
            {step === steps.length && <BiLeaf />}
          </PrimaryButton>
        </div>
      </Card>

      <style jsx>{`
        .wizard-container {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
        }

        .wizard-header {
          margin-bottom: 30px;
        }

        .steps-progress {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
        }

        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          text-align: center;
        }

        .step-indicator {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: white;
          border: 2px solid #E5E7EB;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #9CA3AF;
          margin-bottom: 8px;
          transition: all 0.3s ease;
        }

        .step-indicator.completed {
          background: #2E7D64;
          border-color: #2E7D64;
          color: white;
        }

        .step-indicator.active {
          border-color: #2E7D64;
          color: #2E7D64;
          transform: scale(1.1);
          box-shadow: 0 0 0 4px rgba(46, 125, 100, 0.15);
        }

        .step-label {
          font-size: 12px;
          font-weight: 500;
          color: #6B7280;
          transition: all 0.3s ease;
        }

        .step-label.active {
          color: #2E7D64;
          font-weight: 600;
        }

        .progress-bar-container {
          height: 6px;
          background: #E5E7EB;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: #2E7D64;
          border-radius: 3px;
          transition: width 0.4s ease;
        }

        .wizard-content-card {
          padding: 32px !important;
          border-radius: 12px !important;
          border: 1px solid #E5E7EB !important;
        }

        .wizard-content {
          min-height: 350px;
          margin-bottom: 30px;
        }

        .wizard-footer {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding-top: 24px;
          border-top: 1px solid #E5E7EB;
        }

        .nav-btn {
          padding: 12px 28px !important;
          font-size: 15px !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          transition: all 0.3s ease !important;
        }

        .back-btn {
          background: white !important;
          color: #374151 !important;
          border: 1px solid #E5E7EB !important;
        }

        .back-btn:hover {
          border-color: #2E7D64 !important;
          color: #2E7D64 !important;
        }

        .next-btn {
          background: #2E7D64 !important;
          margin-left: auto !important;
        }

        .next-btn.disabled {
          opacity: 0.5;
          pointer-events: none;
        }

        @media (max-width: 768px) {
          .steps-progress {
            flex-wrap: wrap;
            gap: 10px;
          }
          .step-item {
            flex: 0 0 calc(33.333% - 10px);
          }
          .step-label {
            font-size: 10px;
          }
          .wizard-content-card {
            padding: 20px !important;
          }
          .wizard-footer {
            flex-direction: column-reverse;
          }
          .nav-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}