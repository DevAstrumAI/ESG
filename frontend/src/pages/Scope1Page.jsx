// src/pages/Scope1Page.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useEmissionStore } from "../store/emissionStore";
import { useCompanyStore } from "../store/companyStore";
import { normalizeScope1MobileEntry, normalizeScope1StationaryEntry, normalizeScope1RefrigerantEntry, normalizeScope1FugitiveEntry } from "../utils/emissionHydration";
import VehicleTable from "../components/scope1/VehicleTable";
import StationaryForm from "../components/scope1/StationaryForm";
import RefrigerantForm from "../components/scope1/RefrigerantForm";
import FugitiveForm from "../components/scope1/FugitiveForm";
import Scope1Summary from "../components/scope1/Scope1Summary";
import Card from "../components/ui/Card";
import { FiTruck, FiBriefcase, FiWind, FiAlertCircle, FiCalendar, FiArrowLeft, FiSave } from "react-icons/fi";

export default function Scope1Page() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useAuthStore((s) => s.token);
  const { company, fetchCompany, loading: companyLoading, isInitialized: companyInitialized } = useCompanyStore();
  
  const urlMonth = searchParams.get("month");
  const defaultMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  
  const [selectedMonth, setSelectedMonth] = useState(urlMonth || defaultMonth);
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
  const vehicles = useEmissionStore((s) => s.scope1Vehicles);
  const stationary = useEmissionStore((s) => s.scope1Stationary);
  const refrigerants = useEmissionStore((s) => s.scope1Refrigerants);
  const fugitive = useEmissionStore((s) => s.scope1Fugitive);
  
  // Get store actions
  const addVehicle = useEmissionStore((s) => s.addScope1Vehicle);
  const updateVehicle = useEmissionStore((s) => s.updateScope1Vehicle);
  const deleteVehicle = useEmissionStore((s) => s.deleteScope1Vehicle);
  const addStationary = useEmissionStore((s) => s.addScope1Stationary);
  const deleteStationary = useEmissionStore((s) => s.deleteScope1Stationary);
  const addRefrigerant = useEmissionStore((s) => s.addScope1Refrigerant);
  const deleteRefrigerant = useEmissionStore((s) => s.deleteScope1Refrigerant);
  const addFugitive = useEmissionStore((s) => s.addScope1Fugitive);
  const deleteFugitive = useEmissionStore((s) => s.deleteScope1Fugitive);
  const submitScope1 = useEmissionStore((s) => s.submitScope1);
  
  const setScope1Vehicles = useEmissionStore((s) => s.setScope1Vehicles);
  const setScope1Stationary = useEmissionStore((s) => s.setScope1Stationary);
  const setScope1Refrigerants = useEmissionStore((s) => s.setScope1Refrigerants);
  const setScope1Fugitive = useEmissionStore((s) => s.setScope1Fugitive);
  const isSubmitting = useEmissionStore((s) => s.isSubmitting);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";
  const hasCompanySetup = Boolean(company?.basicInfo?.name) && Array.isArray(company?.locations) && company.locations.length > 0;
  
  // Load company data
  useEffect(() => {
    if (token && !companyInitialized) {
      fetchCompany(token);
    }
  }, [token, companyInitialized, fetchCompany]);
  
  // Load Scope 1 data when month changes
  useEffect(() => {
    const loadScope1Data = async () => {
      if (!token) return;
      if (!hasCompanySetup) {
        setLoadingData(false);
        return;
      }
      
      // ✅ Prevent duplicate loading for same month
      if (dataLoadedForMonth.current === selectedMonth && !isLoadingRef.current) {
        console.log("Data already loaded for", selectedMonth, "- skipping");
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
        setScope1Vehicles([]);
        setScope1Stationary([]);
        setScope1Refrigerants([]);
        setScope1Fugitive([]);
        
        const [year] = selectedMonth.split("-");
        const response = await fetch(
          `${API_URL}/api/emissions/scope1?year=${year}&month=${selectedMonth}`,
          {
          headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          
          const mobileData = (data.mobile || []).map((item, index) =>
            normalizeScope1MobileEntry(item, `${Date.now()}-mobile-${index}-${Math.random()}`)
          );
          const stationaryData = (data.stationary || []).map((item, index) =>
            normalizeScope1StationaryEntry(item, `${Date.now()}-stationary-${index}-${Math.random()}`)
          );
          const refrigerantData = (data.refrigerants || []).map((item, index) =>
            normalizeScope1RefrigerantEntry(item, `${Date.now()}-refrigerant-${index}-${Math.random()}`)
          );
          const fugitiveData = (data.fugitive || []).map((item, index) =>
            normalizeScope1FugitiveEntry(item, `${Date.now()}-fugitive-${index}-${Math.random()}`)
          );
          
          setScope1Vehicles(mobileData);
          setScope1Stationary(stationaryData);
          setScope1Refrigerants(refrigerantData);
          setScope1Fugitive(fugitiveData);
          
          // ✅ Mark this month as loaded
          dataLoadedForMonth.current = selectedMonth;
        }
      } catch (error) {
        console.error("Error loading Scope 1 data:", error);
      } finally {
        setLoadingData(false);
        isLoadingRef.current = false;
      }
    };
    
    loadScope1Data();
  }, [token, selectedMonth, hasCompanySetup]);
  
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
    const url = new URL(window.location);
    url.searchParams.set('month', newMonth);
    window.history.replaceState({}, '', url);
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
      setSubmitError("Please complete company setup before calculating Scope 1 emissions.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    
    const [year] = selectedMonth.split("-");
    const result = await submitScope1(token, parseInt(year, 10), selectedMonth);
    
    setSubmitting(false);
    if (result.success) {
      setSubmitSuccess(true);
      setShowSummary(true);
    } else {
      setSubmitError(result.error || "Calculation failed. Please try again.");
    }
  };
  
  const steps = [
    { id: "mobile", label: "Mobile Combustion", icon: <FiTruck size={16} />, count: vehicles.length, component: (
      <VehicleTable
        vehicles={vehicles}
        onAdd={addVehicle}
        onUpdate={updateVehicle}
        onDelete={deleteVehicle}
      />
    )},
    { id: "stationary", label: "Stationary Combustion", icon: <FiBriefcase size={16} />, count: stationary.length, component: (
      <StationaryForm
        entries={stationary}
        onAdd={addStationary}
        onDelete={deleteStationary}
      />
    )},
    { id: "refrigerants", label: "Refrigerants", icon: <FiWind size={16} />, count: refrigerants.length, component: (
      <RefrigerantForm
        entries={refrigerants}
        onAdd={addRefrigerant}
        onDelete={deleteRefrigerant}
      />
    )},
    { id: "fugitive", label: "Fugitive Emissions", icon: <FiAlertCircle size={16} />, count: fugitive.length, component: (
      <FugitiveForm
        entries={fugitive}
        onAdd={addFugitive}
        onDelete={deleteFugitive}
      />
    )},
  ];
  const progressPercent = steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 100;

  if (!companyInitialized || companyLoading) {
    return (
      <div className="scope1-page">
        <p style={{ color: "#6B7280", margin: 0 }}>Loading company setup...</p>
      </div>
    );
  }

  if (!hasCompanySetup) {
    return (
      <div className="scope1-page">
        <div className="setup-banner">
          <FiAlertCircle />
          <div>
            <h3>Complete company setup first</h3>
            <p>You need to finish Company Setup before using Scope 1 calculations.</p>
          </div>
          <button onClick={() => navigate("/setup")} className="setup-btn">
            Go to Company Setup
          </button>
        </div>
        <style jsx>{`
          .scope1-page { padding: 24px; max-width: 1400px; margin: 0 auto; }
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
            border: 1px solid #D97706;
            background: #D97706;
            color: white;
            border-radius: 8px;
            padding: 10px 14px;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
          }
          .setup-btn:hover { background: #B45309; border-color: #B45309; }
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
          <div className="skeleton-tab"></div>
        </div>
        <div className="skeleton-table">
          <div className="skeleton-row"></div>
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
      <div className="scope1-page">
        <div className="page-header">
          <button onClick={handleBackToSteps} className="back-btn">
            <FiArrowLeft /> Back to Entry
          </button>
          <h1>Scope 1 Emissions Summary</h1>
          <p>Review your calculated emissions</p>
        </div>
        
        <Scope1Summary />
        
        <div className="summary-actions">
          <button onClick={handleBackToSteps} className="secondary-btn">
            Edit Data
          </button>
          <button onClick={() => navigate("/dashboard")} className="primary-btn">
            Go to Dashboard
          </button>
        </div>
        <style jsx>{`
          .scope1-page { padding: 24px; max-width: 1400px; margin: 0 auto; }
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
    <div className="scope1-page">
      <div className="page-header">
        <button onClick={() => navigate("/dashboard")} className="back-btn">
          <FiArrowLeft /> Back to Dashboard
        </button>
        <h1>Scope 1 Emissions</h1>
        <p>Direct emissions from owned or controlled sources</p>
      </div>
      
      <Card className="scope1-card">
        <div className="month-selector-section">
          <div className="month-selector">
            <FiCalendar className="selector-icon" />
            <label>Reporting Period:</label>
            <select value={selectedMonth} onChange={(e) => handleMonthChange(e.target.value)}>
              {monthOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
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
        .scope1-page { padding: 24px; max-width: 1400px; margin: 0 auto; }
        .page-header { margin-bottom: 24px; }
        .back-btn { display: flex; align-items: center; gap: 6px; background: none; border: none; color: #6B7280; cursor: pointer; margin-bottom: 16px; font-size: 14px; }
        .back-btn:hover { color: #2E7D64; }
        .page-header h1 { font-size: 28px; font-weight: 700; color: #1B4D3E; margin: 0 0 8px; }
        .page-header p { color: #6B7280; margin: 0; }
        .scope1-card { background: white; border-radius: 12px; border: 1px solid #E5E7EB; overflow: hidden; }
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
        .progress-shell { position: relative; flex: 1; max-width: 680px; padding-top: 4px; }
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
          .scope1-page { padding: 16px; }
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