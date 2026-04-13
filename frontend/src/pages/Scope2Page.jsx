// src/pages/Scope2Page.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useEmissionStore } from "../store/emissionStore";
import { useCompanyStore } from "../store/companyStore";
import { normalizeScope2ElectricityEntry, normalizeScope2HeatingEntry, normalizeScope2RenewableEntry } from "../utils/emissionHydration";
import ElectricityForm from "../components/scope2/ElectricityForm";
import HeatingForm from "../components/scope2/HeatingForm";
import RenewableForm from "../components/scope2/RenewableForm";
import Scope2Summary from "../components/scope2/Scope2Summary";
import Card from "../components/ui/Card";
import { FiZap, FiThermometer, FiSun, FiCalendar, FiArrowLeft, FiAlertCircle } from "react-icons/fi";

export default function Scope2Page() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useAuthStore((s) => s.token);
  const { company, fetchCompany } = useCompanyStore();
  
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
  
  // Load company data
  useEffect(() => {
    if (token && !company) {
      fetchCompany(token);
    }
  }, [token, company, fetchCompany]);
  
  // Load Scope 2 data when month changes
  useEffect(() => {
    const loadScope2Data = async () => {
      if (!token) return;
      
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
        setElectricity([]);
        setHeating([]);
        setRenewables([]);
        
        const [year] = selectedMonth.split("-");
        const response = await fetch(`${API_URL}/api/emissions/scope2?year=${year}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          
          const electricityData = (data.electricity || []).map((item, index) => ({
            id: item.id || `${Date.now()}-electricity-${index}-${Math.random()}`,
            facilityName: item.facilityName || 'Main Facility',
            consumption: item.consumption || 0,
            certificateType: item.certificateType || 'grid_average',
            month: item.month,
          }));
          
          const heatingData = (data.heating || []).map((item, index) => ({
            id: item.id || `${Date.now()}-heating-${index}-${Math.random()}`,
            energyType: item.energyType,
            consumption: item.consumption || 0,
            month: item.month,
          }));
          
          const renewableData = (data.renewables || []).map((item, index) => ({
            id: item.id || `${Date.now()}-renewable-${index}-${Math.random()}`,
            sourceType: item.sourceType,
            consumption: item.consumption || 0,
            month: item.month,
          }));
          
          setElectricity(electricityData);
          setHeating(heatingData);
          setRenewables(renewableData);
          
          // ✅ Mark this month as loaded
          dataLoadedForMonth.current = selectedMonth;
        }
      } catch (error) {
        console.error("Error loading Scope 2 data:", error);
      } finally {
        setLoadingData(false);
        isLoadingRef.current = false;
      }
    };
    
    loadScope2Data();
  }, [token, selectedMonth]);
  
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
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    
    const [year, month] = selectedMonth.split("-");
    
    // ✅ Force reload data before calculation
    dataLoadedForMonth.current = null;
    
    // Reload data
    try {
      const response = await fetch(`${API_URL}/api/emissions/scope2?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        
        const electricityData = (data.electricity || []).map((item, index) => ({
          id: item.id || `${Date.now()}-electricity-${index}-${Math.random()}`,
          facilityName: item.facilityName || 'Main Facility',
          consumption: item.consumption || 0,
          certificateType: item.certificateType || 'grid_average',
          month: item.month,
        }));
        
        const heatingData = (data.heating || []).map((item, index) => ({
          id: item.id || `${Date.now()}-heating-${index}-${Math.random()}`,
          energyType: item.energyType,
          consumption: item.consumption || 0,
          month: item.month,
        }));
        
        const renewableData = (data.renewables || []).map((item, index) => ({
          id: item.id || `${Date.now()}-renewable-${index}-${Math.random()}`,
          sourceType: item.sourceType,
          consumption: item.consumption || 0,
          month: item.month,
        }));
        
        setElectricity(electricityData);
        setHeating(heatingData);
        setRenewables(renewableData);
        dataLoadedForMonth.current = selectedMonth;
      }
    } catch (error) {
      console.error("Error reloading data:", error);
    }
    
    const result = await submitScope2(token, parseInt(year), selectedMonth);
    
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
      <ElectricityForm entries={electricity} onAdd={addElectricity} onDelete={deleteElectricity} />
    )},
    { id: "heating", label: "Heating", icon: <FiThermometer />, count: heating.length, component: (
      <HeatingForm entries={heating} onAdd={addHeating} onDelete={deleteHeating} />
    )},
    { id: "renewables", label: "Renewables", icon: <FiSun />, count: renewables.length, component: (
      <RenewableForm entries={renewables} onAdd={addRenewable} onDelete={deleteRenewable} />
    )},
  ];
  
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
          
          <div className="step-indicators">
            {steps.map((step, index) => (
              <div key={step.id} className={`step-indicator ${currentStep === index ? "active" : ""} ${currentStep > index ? "completed" : ""}`}>
                <span className="step-icon">{step.icon}</span>
                <span className="step-label">{step.label}</span>
                {step.count > 0 && <span className="step-count">{step.count}</span>}
              </div>
            ))}
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
        .step-navigation { display: flex; align-items: center; justify-content: space-between; padding: 24px; background: #F9FAFB; border-bottom: 1px solid #E5E7EB; }
        .nav-btn { padding: 10px 20px; border: 1px solid #D1D5DB; border-radius: 8px; background: white; color: #374151; font-weight: 500; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
        .nav-btn:hover:not(:disabled) { border-color: #2E7D64; color: #2E7D64; }
        .nav-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .calculate-btn { background: #2E7D64; color: white; border-color: #2E7D64; }
        .calculate-btn:hover:not(:disabled) { background: #1B4D3E; border-color: #1B4D3E; }
        .step-indicators { display: flex; align-items: center; gap: 16px; flex: 1; justify-content: center; }
        .step-indicator { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 8px; background: white; border: 2px solid #E5E7EB; transition: all 0.2s; min-width: 120px; }
        .step-indicator.active { border-color: #2E7D64; background: #F0F9F6; }
        .step-indicator.completed { border-color: #10B981; background: #F0FDF4; }
        .step-icon { font-size: 20px; }
        .step-label { font-size: 12px; font-weight: 500; color: #6B7280; text-align: center; }
        .step-indicator.active .step-label { color: #2E7D64; }
        .step-indicator.completed .step-label { color: #10B981; }
        .step-count { background: #2E7D64; color: white; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 10px; margin-top: 4px; }
        .step-content { padding: 24px; }
        .error-message { background: #FEF2F2; color: #DC2626; padding: 12px 16px; border-radius: 8px; margin: 0 24px 24px 24px; border: 1px solid #FECACA; display: flex; align-items: center; gap: 8px; }
        @media (max-width: 768px) {
          .scope2-page { padding: 16px; }
          .step-navigation { flex-direction: column; gap: 16px; }
          .step-indicators { flex-wrap: wrap; gap: 8px; }
          .step-indicator { min-width: 100px; padding: 8px 12px; }
          .nav-btn { padding: 8px 16px; font-size: 14px; }
        }
      `}</style>
    </div>
  );
}