// src/pages/Scope2Page.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useEmissionStore } from "../store/emissionStore";
import { useCompanyStore } from "../store/companyStore";
import { useSelectedLocationStore } from "../store/selectedLocationStore";
import { appendLocationQuery } from "../utils/locationQuery";
import FacilityCitySelect from "../components/location/FacilityCitySelect";
import { normalizeScope2ElectricityEntry, normalizeScope2HeatingEntry, normalizeScope2RenewableEntry } from "../utils/emissionHydration";
import ElectricityForm from "../components/scope2/ElectricityForm";
import HeatingForm from "../components/scope2/HeatingForm";
import RenewableForm from "../components/scope2/RenewableForm";
import Scope2Summary from "../components/scope2/Scope2Summary";
import Card from "../components/ui/Card";
import ThemedSelect from "../components/ui/ThemedSelect";
import { FiZap, FiThermometer, FiSun, FiCalendar, FiArrowLeft, FiAlertCircle } from "react-icons/fi";

export default function Scope2Page() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = useAuthStore((s) => s.token);
  const { company, fetchCompany, loading: companyLoading, isInitialized: companyInitialized } = useCompanyStore();
  const locationKey = useSelectedLocationStore((s) => s.locationKey);
  const syncFromCompany = useSelectedLocationStore((s) => s.syncFromCompany);
  
  const urlMonth = searchParams.get("month");
  const defaultMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  
  const [selectedMonth, setSelectedMonth] = useState(urlMonth || defaultMonth);
  const dataLoadKey = `${selectedMonth}__${locationKey || ""}`;
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  
  // ✅ Ref to track if data is already loaded for current month
  const dataLoadedForMonth = useRef(null);
  const isLoadingRef = useRef(false);
  
  // Get data from store
  const electricity = useEmissionStore((s) => s.scope2Electricity);
  const heating = useEmissionStore((s) => s.scope2Heating);
  const renewables = useEmissionStore((s) => s.scope2Renewable);
  
  // Get store actions
  const setElectricity = useEmissionStore((s) => s.setScope2Electricity);
  const setHeating = useEmissionStore((s) => s.setScope2Heating);
  const setRenewables = useEmissionStore((s) => s.setScope2Renewable);
  
  const addElectricity = useEmissionStore((s) => s.addScope2Electricity);
  const deleteElectricity = useEmissionStore((s) => s.deleteScope2Electricity);
  const addHeating = useEmissionStore((s) => s.addScope2Heating);
  const deleteHeating = useEmissionStore((s) => s.deleteScope2Heating);
  const addRenewable = useEmissionStore((s) => s.addScope2Renewable);
  const deleteRenewable = useEmissionStore((s) => s.deleteScope2Renewable);
  const submitScope2 = useEmissionStore((s) => s.submitScope2);
  const isSubmitting = useEmissionStore((s) => s.isSubmitting);
  
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";
  const hasCompanySetup = Boolean(company?.basicInfo?.name) && Array.isArray(company?.locations) && company.locations.length > 0;
  
  // Load company data
  useEffect(() => {
    if (token && !companyInitialized) {
      fetchCompany(token);
    }
  }, [token, companyInitialized, fetchCompany]);

  useEffect(() => {
    if (company) syncFromCompany(company);
  }, [company, syncFromCompany]);

  // Keep selected month synced with URL month query.
  useEffect(() => {
    const resolvedMonth = urlMonth || defaultMonth;
    if (resolvedMonth !== selectedMonth) {
      setSelectedMonth(resolvedMonth);
      dataLoadedForMonth.current = null;
    }
  }, [urlMonth, defaultMonth]);
  
  // Load Scope 2 data when month changes
  useEffect(() => {
    const loadScope2Data = async () => {
      if (!token) return;
      if (!hasCompanySetup) {
        setLoadingData(false);
        return;
      }
      
      // ✅ Prevent duplicate loading for same month
      if (dataLoadedForMonth.current === dataLoadKey && !isLoadingRef.current) {
        console.log("Data already loaded for", dataLoadKey, "- skipping");
        setLoadingData(false);
        return;
      }
      
      // ✅ Prevent concurrent loads
      if (isLoadingRef.current) {
        console.log("Already loading data, skipping...");
        return;
      }
      
      isLoadingRef.current = true;
      setLoadingData(true);
      
      try {
        // Clear existing data to prevent duplicates
        setElectricity([]);
        setHeating([]);
        setRenewables([]);
        
        const [year] = selectedMonth.split("-");
        let url = `${API_URL}/api/emissions/scope2?year=${year}&month=${encodeURIComponent(selectedMonth)}`;
        const loc = useSelectedLocationStore.getState().getSelectedLocation(company);
        if (loc?.country && loc?.city) {
          url = appendLocationQuery(url, loc.country, loc.city);
        }
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.ok) {
          const data = await response.json();

          const matchesMonth = (entryMonth) =>
            typeof entryMonth === "string" && entryMonth.slice(0, 7) === selectedMonth;
          const dedupeById = (rows) => {
            const seen = new Set();
            return rows.filter((row) => {
              if (!row?.id) return true;
              if (seen.has(row.id)) return false;
              seen.add(row.id);
              return true;
            });
          };
          
          const electricityData = dedupeById((data.electricity || []).filter((item) => matchesMonth(item.month))).map((item, index) => ({
            id: item.id || `${Date.now()}-electricity-${index}-${Math.random()}`,
            facilityName: item.facilityName || 'Main City',
            consumption: item.consumption || 0,
            certificateType: item.certificateType || 'grid_average',
            month: item.month,
          }));
          
          const heatingData = dedupeById((data.heating || []).filter((item) => matchesMonth(item.month))).map((item, index) => ({
            id: item.id || `${Date.now()}-heating-${index}-${Math.random()}`,
            energyType: item.energyType,
            consumption: item.consumption || 0,
            month: item.month,
          }));
          
          const renewableData = dedupeById((data.renewables || []).filter((item) => matchesMonth(item.month))).map((item, index) => ({
            id: item.id || `${Date.now()}-renewable-${index}-${Math.random()}`,
            sourceType: item.sourceType,
            consumption: item.consumption || 0,
            month: item.month,
          }));
          
          setElectricity(electricityData);
          setHeating(heatingData);
          setRenewables(renewableData);
          
          // ✅ Mark this month as loaded
          dataLoadedForMonth.current = dataLoadKey;
        }
      } catch (error) {
        console.error("Error loading Scope 2 data:", error);
      } finally {
        setLoadingData(false);
        isLoadingRef.current = false;
      }
    };
    
    loadScope2Data();
  }, [token, selectedMonth, hasCompanySetup, company, locationKey, dataLoadKey]);
  
  // Generate month options
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = -12; i <= 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      options.push({ value: `${year}-${month}`, label });
    }
    return options;
  };
  
  const monthOptions = generateMonthOptions();
  
  const handleMonthChange = (newMonth) => {
    if (newMonth === selectedMonth) return;
    setSelectedMonth(newMonth);
    // ✅ Reset loaded flag when month changes
    dataLoadedForMonth.current = null;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("month", newMonth);
    setSearchParams(nextParams, { replace: true });
  };
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleBackToSteps = () => {
    setShowSummary(false);
    setSubmitSuccess(false);
    setSubmitError(null);
  };
  
  const handleCalculateAll = async () => {
    if (!hasCompanySetup) {
      setSubmitError("Please complete company setup before calculating Scope 2 emissions.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    
    const [year] = selectedMonth.split("-");
    const result = await submitScope2(token, parseInt(year, 10), selectedMonth);
    
    setSubmitting(false);
    if (result.success) {
      setSubmitSuccess(true);
      setShowSummary(true);
    } else {
      setSubmitError(result.error || "Calculation failed. Please try again.");
    }
  };
  
  const steps = [
    { id: "electricity", label: "Electricity", icon: <FiZap />, count: electricity.length, component: (
      <ElectricityForm reportingMonth={selectedMonth} entries={electricity} onAdd={addElectricity} onDelete={deleteElectricity} />
    )},
    { id: "heating", label: "Heating", icon: <FiThermometer />, count: heating.length, component: (
      <HeatingForm reportingMonth={selectedMonth} entries={heating} onAdd={addHeating} onDelete={deleteHeating} />
    )},
    { id: "renewables", label: "Renewables", icon: <FiSun />, count: renewables.length, component: (
      <RenewableForm reportingMonth={selectedMonth} entries={renewables} onAdd={addRenewable} onDelete={deleteRenewable} />
    )},
  ];
  const progressPercent = steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 100;

  if (!companyInitialized || companyLoading) {
    return (
      <div className="scope2-page">
        <p style={{ color: "#6B7280", margin: 0 }}>Loading company setup...</p>
      </div>
    );
  }

  if (!hasCompanySetup) {
    return (
      <div className="scope2-page">
        <div className="setup-banner">
          <FiAlertCircle />
          <div>
            <h3>Complete company setup first</h3>
            <p>You need to finish Company Setup before using Scope 2 calculations.</p>
          </div>
          <button onClick={() => navigate("/setup")} className="setup-btn">
            Go to Company Setup
          </button>
        </div>
        <style jsx>{`
          .scope2-page { padding: 24px; max-width: 1400px; margin: 0 auto; }
          .setup-banner {
            border: 1px solid #FCD34D;
            background: #FFFBEB;
            color: #92400E;
            border-radius: 12px;
            padding: 16px;
            display: flex;
            gap: 12px;
            align-items: flex-start;
          }
          .setup-banner h3 { margin: 0 0 4px 0; font-size: 16px; color: #78350F; }
          .setup-banner p { margin: 0; color: #92400E; }
          .setup-btn {
            margin-left: auto;
            padding: 7px 14px;
            background: #1B4D3E;
            color: white;
            border: none;
            border-radius: 7px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            white-space: nowrap;
            transition: background 0.15s;
          }
          .setup-btn:hover { background: #2E7D64; }
        `}</style>
      </div>
    );
  }
  
  if (loadingData) {
    return (
      <div className="loading-skeleton">
        <div className="skeleton-header"></div>
        <div className="skeleton-tabs">
          <div className="skeleton-tab"></div>
          <div className="skeleton-tab"></div>
          <div className="skeleton-tab"></div>
        </div>
        <div className="skeleton-table">
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
        </div>
        <style jsx>{`
          .loading-skeleton { padding: 24px; max-width: 1400px; margin: 0 auto; }
          .skeleton-header { height: 40px; width: 200px; background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; margin-bottom: 24px; }
          .skeleton-tabs { display: flex; gap: 12px; margin-bottom: 24px; }
          .skeleton-tab { height: 40px; width: 120px; background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
          .skeleton-table { border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; }
          .skeleton-row { height: 50px; background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; margin-bottom: 12px; }
          @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        `}</style>
      </div>
    );
  }
  
  if (showSummary) {
    return (
      <div className="scope2-page">
        <div className="page-header">
          <button onClick={handleBackToSteps} className="back-btn">
            <FiArrowLeft /> Back to Entry
          </button>
          <h1>Scope 2 Emissions Summary</h1>
          <p>Review your calculated emissions</p>
        </div>
        
        <Scope2Summary />
        
        <div className="summary-actions">
          <button onClick={handleBackToSteps} className="secondary-btn">
            Edit Data
          </button>
          <button onClick={() => navigate("/dashboard")} className="primary-btn">
            Go to Dashboard
          </button>
        </div>
        <style jsx>{`
          .scope2-page { padding: 24px; max-width: 1400px; margin: 0 auto; }
          .page-header { margin-bottom: 24px; }
          .back-btn { display: flex; align-items: center; gap: 6px; background: none; border: none; color: #6B7280; cursor: pointer; margin-bottom: 16px; font-size: 14px; }
          .back-btn:hover { color: #2E7D64; }
          .page-header h1 { font-size: 28px; font-weight: 700; color: #1B4D3E; margin: 0 0 8px; }
          .page-header p { color: #6B7280; margin: 0; }
          .summary-actions { display: flex; gap: 12px; justify-content: center; margin-top: 24px; }
          .secondary-btn { padding: 12px 24px; border: 1px solid #D1D5DB; border-radius: 8px; background: white; color: #374151; font-weight: 500; cursor: pointer; }
          .secondary-btn:hover { border-color: #2E7D64; color: #2E7D64; }
          .primary-btn { padding: 12px 24px; border: 1px solid #2E7D64; border-radius: 8px; background: #2E7D64; color: white; font-weight: 500; cursor: pointer; }
          .primary-btn:hover { background: #1B4D3E; }
        `}</style>
      </div>
    );
  }
  
  return (
    <div className="scope2-page">
      <div className="page-header">
        <button onClick={() => navigate("/dashboard")} className="back-btn">
          <FiArrowLeft /> Back to Dashboard
        </button>
        <h1>Scope 2 Emissions</h1>
        <p>Indirect emissions from purchased electricity, steam, heating, and cooling</p>
      </div>
      
      <Card className="scope2-card">
        <div className="month-selector-section">
          <div className="month-selector">
            <FiCalendar className="selector-icon" />
            <label>Reporting Period:</label>
            <ThemedSelect
              value={selectedMonth}
              onChange={handleMonthChange}
              options={monthOptions}
              placeholder="Reporting Period"
            />
          </div>
          <FacilityCitySelect company={company} />
          <div className="month-hint">
            Data will be saved for {new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
          </div>
        </div>
        
        <div className="step-navigation">
          <button onClick={handlePrevious} disabled={currentStep === 0} className="nav-btn previous-btn">
            ← Previous
          </button>
          
          <div className="progress-shell">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          <div className="step-indicators">
            {steps.map((step, index) => (
              <div key={step.id} className={`step-indicator ${currentStep === index ? "active" : ""} ${currentStep > index ? "completed" : ""}`}>
                <span className="step-icon">{step.icon}</span>
                <span className="step-label">{step.label}</span>
                {step.count > 0 && <span className="step-count">{step.count}</span>}
              </div>
            ))}
          </div>
          </div>
          
          {currentStep < steps.length - 1 ? (
            <button onClick={handleNext} className="nav-btn next-btn">Next →</button>
          ) : (
            <button onClick={handleCalculateAll} disabled={submitting} className="nav-btn calculate-btn">
              {submitting ? "Calculating..." : "Calculate All →"}
            </button>
          )}
        </div>
        
        <div className="step-content">
          {steps[currentStep].component}
        </div>
        
        {submitError && (
          <div className="error-message">
            <FiAlertCircle /> {submitError}
          </div>
        )}
      </Card>
      
      <style jsx>{`
        .scope2-page { padding: 24px; max-width: 1400px; margin: 0 auto; }
        .page-header { margin-bottom: 24px; }
        .back-btn { display: flex; align-items: center; gap: 6px; background: none; border: none; color: #6B7280; cursor: pointer; margin-bottom: 16px; font-size: 14px; }
        .back-btn:hover { color: #2E7D64; }
        .page-header h1 { font-size: 28px; font-weight: 700; color: #1B4D3E; margin: 0 0 8px; }
        .page-header p { color: #6B7280; margin: 0; }
        .scope2-card { background: white; border-radius: 12px; border: 1px solid #E5E7EB; overflow: hidden; }
        .month-selector-section { padding: 24px 24px 0 24px; border-bottom: 1px solid #F3F4F6; }
        .month-selector { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .month-selector label { font-weight: 500; color: #374151; }
        .month-selector select { padding: 8px 12px; border: 1px solid #D1D5DB; border-radius: 6px; background: white; font-size: 14px; }
        .month-hint { color: #6B7280; font-size: 14px; margin-bottom: 24px; }
        .step-navigation { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 20px; background: linear-gradient(180deg, #FBFCFD 0%, #F8FAFB 100%); border-bottom: 1px solid #E5E7EB; }
        .nav-btn {
          min-width: 126px;
          height: 44px;
          padding: 0 18px;
          border-radius: 12px;
          border: 1px solid #D1D5DB;
          background: white;
          color: #374151;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.06);
          white-space: nowrap;
        }
        .nav-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 18px rgba(15, 23, 42, 0.12); }
        .nav-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
        .previous-btn { background: #FFFFFF; border-color: #D5DBE3; color: #4B5563; }
        .previous-btn:hover:not(:disabled) { border-color: #9CA3AF; color: #1F2937; }
        .next-btn {
          background: linear-gradient(135deg, #2E7D64 0%, #1F9D7A 100%);
          color: white;
          border-color: #2E7D64;
        }
        .next-btn:hover:not(:disabled) {
          border-color: #1F9D7A;
          box-shadow: 0 12px 22px rgba(31, 157, 122, 0.34);
        }
        .calculate-btn {
          background: linear-gradient(135deg, #1B4D3E 0%, #2E7D64 100%);
          color: white;
          border-color: #1B4D3E;
        }
        .calculate-btn:hover:not(:disabled) {
          border-color: #1B4D3E;
          box-shadow: 0 12px 22px rgba(27, 77, 62, 0.32);
        }
        .progress-shell { position: relative; flex: 1; max-width: 560px; padding-top: 4px; }
        .progress-track {
          position: absolute;
          top: 28px;
          left: 28px;
          right: 28px;
          height: 4px;
          border-radius: 999px;
          background: #E5E7EB;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #2E7D64 0%, #10B981 100%);
          box-shadow: 0 0 14px rgba(16, 185, 129, 0.32);
          transition: width 280ms ease;
        }
        .step-indicators { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
        .step-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          min-width: 110px;
          padding: 0 6px;
          color: #6B7280;
          transition: transform 0.2s ease, color 0.2s ease;
        }
        .step-icon {
          width: 44px;
          height: 44px;
          border-radius: 999px;
          border: 2px solid #D1D5DB;
          background: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
          transition: all 0.2s ease;
        }
        .step-label { font-size: 11px; font-weight: 600; text-align: center; }
        .step-indicator.active { color: #1F6F5B; transform: translateY(-2px); }
        .step-indicator.active .step-icon {
          border-color: #2E7D64;
          color: #2E7D64;
          background: #ECFDF5;
          box-shadow: 0 8px 22px rgba(46, 125, 100, 0.24);
        }
        .step-indicator.completed { color: #0F766E; }
        .step-indicator.completed .step-icon { border-color: #10B981; color: #10B981; background: #F0FDF4; }
        .step-count { background: #2E7D64; color: white; font-size: 10px; font-weight: 700; line-height: 1; padding: 5px 8px; border-radius: 999px; min-width: 22px; text-align: center; }
        .step-content { padding: 24px; }
        .error-message { background: #FEF2F2; color: #DC2626; padding: 12px 16px; border-radius: 8px; margin: 0 24px 24px 24px; border: 1px solid #FECACA; display: flex; align-items: center; gap: 8px; }
        @media (max-width: 768px) {
          .scope2-page { padding: 16px; }
          .step-navigation { flex-direction: column; gap: 16px; }
          .progress-shell { width: 100%; max-width: none; }
          .progress-track { left: 16px; right: 16px; top: 24px; }
          .step-indicator { min-width: 90px; }
          .step-icon { width: 38px; height: 38px; font-size: 14px; }
          .nav-btn { min-width: 118px; height: 40px; padding: 0 14px; font-size: 13px; }
        }
      `}</style>
    </div>
  );
}