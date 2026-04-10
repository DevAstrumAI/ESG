// src/pages/Scope2Page.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useEmissionStore } from "../store/emissionStore";
import { useCompanyStore } from "../store/companyStore";
import ElectricityForm from "../components/scope2/ElectricityForm";
import HeatingForm from "../components/scope2/HeatingForm";
import RenewableForm from "../components/scope2/RenewableForm";
import Card from "../components/ui/Card";
import { FiZap, FiThermometer, FiSun, FiCalendar, FiArrowLeft, FiSave, FiAlertCircle } from "react-icons/fi";

export default function Scope2Page() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useAuthStore((s) => s.token);
  const { company, fetchCompany } = useCompanyStore();
  
  // ✅ Get reset function from emissionStore
  const resetEmissionData = useEmissionStore((s) => s.reset);
  
  // Get month from URL parameter or default to current month
  const urlMonth = searchParams.get("month");
  const defaultMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  
  const [selectedMonth, setSelectedMonth] = useState(urlMonth || defaultMonth);
  const [activeTab, setActiveTab] = useState("electricity");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  
  // Get data from store
  const electricity = useEmissionStore((s) => s.scope2Electricity);
  const heating = useEmissionStore((s) => s.scope2Heating);
  const renewables = useEmissionStore((s) => s.scope2Renewable);
  
  // ✅ Get setter methods to replace data (not append)
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
  
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";
  
  // ✅ Clear emission data when component mounts (fresh start to prevent duplicates)
  useEffect(() => {
    resetEmissionData();
  }, [resetEmissionData]);
  
  // Load company data
  useEffect(() => {
    if (token && !company) {
      fetchCompany(token);
    }
  }, [token, company, fetchCompany]);
  
  // ✅ Load existing data for the selected month/year
  useEffect(() => {
    const loadScope2Data = async () => {
      if (!token) return;
      
      setLoadingData(true);
      
      try {
        // First, clear existing data to prevent duplicates
        setElectricity([]);
        setHeating([]);
        setRenewables([]);
        
        // Then fetch fresh data
        const [year] = selectedMonth.split("-");
        const response = await fetch(`${API_URL}/api/emissions/scope2?year=${year}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Transform electricity data with unique IDs
          const electricityData = (data.electricity || []).map((item, index) => ({
            id: item.id || `${Date.now()}-${index}-${Math.random()}`,
            facilityName: item.facilityName || 'Main Facility',
            consumption: item.consumption || 0,
            certificateType: item.certificateType || 'grid_average',
            month: item.month,
          }));
          
          // Transform heating data
          const heatingData = (data.heating || []).map((item, index) => ({
            id: item.id || `${Date.now()}-${index}-${Math.random()}`,
            energyType: item.energyType,
            consumption: item.consumption || 0,
            month: item.month,
          }));
          
          // Transform renewable data
          const renewableData = (data.renewables || []).map((item, index) => ({
            id: item.id || `${Date.now()}-${index}-${Math.random()}`,
            sourceType: item.sourceType,
            consumption: item.consumption || 0,
            month: item.month,
          }));
          
          // Set the data (replacing, not appending)
          setElectricity(electricityData);
          setHeating(heatingData);
          setRenewables(renewableData);
        }
      } catch (error) {
        console.error("Error loading Scope 2 data:", error);
      } finally {
        setLoadingData(false);
      }
    };
    
    loadScope2Data();
  }, [token, selectedMonth, setElectricity, setHeating, setRenewables]);
  
  // Generate month options (last 12 months + next 12 months)
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
  
  // Update URL when month changes
  const handleMonthChange = (newMonth) => {
    setSelectedMonth(newMonth);
    const url = new URL(window.location);
    url.searchParams.set('month', newMonth);
    window.history.replaceState({}, '', url);
  };
  
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    
    const [year, month] = selectedMonth.split("-");
    const result = await submitScope2(token, parseInt(year), selectedMonth);
    
    setSubmitting(false);
    if (result.success) {
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        navigate("/dashboard");
      }, 1500);
    } else {
      setSubmitError(result.error || "Submission failed. Please try again.");
    }
  };
  
  const hasData = electricity.length > 0 || heating.length > 0 || renewables.length > 0;
  
  const tabs = [
    { id: "electricity", label: "Electricity", icon: <FiZap size={16} />, count: electricity.length },
    { id: "heating", label: "Heating & Cooling", icon: <FiThermometer size={16} />, count: heating.length },
    { id: "renewables", label: "Renewable Energy", icon: <FiSun size={16} />, count: renewables.length },
  ];
  
  if (loadingData) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading your data...</p>
        <style jsx>{`
          .loading-state {
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
    <div className="scope2-page">
      <div className="page-header">
        <button onClick={() => navigate("/dashboard")} className="back-btn">
          <FiArrowLeft /> Back to Dashboard
        </button>
        <h1>Scope 2 Emissions</h1>
        <p>Indirect emissions from purchased electricity, steam, heating, and cooling</p>
      </div>
      
      <Card className="scope2-card">
        {/* Month Selector */}
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
        
        {/* Tab Navigation */}
        <div className="tab-navigation">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count > 0 && <span className="tab-count">{tab.count}</span>}
            </button>
          ))}
        </div>
        
        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === "electricity" && (
            <ElectricityForm
              entries={electricity}
              onAdd={addElectricity}
              onDelete={deleteElectricity}
            />
          )}
          
          {activeTab === "heating" && (
            <HeatingForm
              entries={heating}
              onAdd={addHeating}
              onDelete={deleteHeating}
            />
          )}
          
          {activeTab === "renewables" && (
            <RenewableForm
              entries={renewables}
              onAdd={addRenewable}
              onDelete={deleteRenewable}
            />
          )}
        </div>
        
        {/* Submit Section */}
        <div className="submit-section">
          {submitError && (
            <div className="error-message">
              <FiAlertCircle /> {submitError}
            </div>
          )}
          
          {submitSuccess && (
            <div className="success-message">
              <FiSave /> Data submitted successfully! Redirecting to dashboard...
            </div>
          )}
          
          <button
            className={`submit-btn ${hasData ? "" : "disabled"}`}
            onClick={handleSubmit}
            disabled={submitting || !hasData}
          >
            {submitting ? "Submitting..." : `Submit Scope 2 Data for ${new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}`}
          </button>
          
          {!hasData && (
            <p className="no-data-hint">Add at least one entry before submitting</p>
          )}
        </div>
      </Card>
      
      <style jsx>{`
        .scope2-page {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .loading-state {
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
        .loading-state p { margin-top: 16px; color: #6B7280; }
        
        .page-header {
          margin-bottom: 24px;
        }
        
        .back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: #6B7280;
          cursor: pointer;
          margin-bottom: 16px;
          font-size: 14px;
        }
        
        .back-btn:hover {
          color: #2E7D64;
        }
        
        .page-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #1B4D3E;
          margin: 0 0 8px;
        }
        
        .page-header p {
          color: #6B7280;
          margin: 0;
        }
        
        .scope2-card {
          padding: 24px;
        }
        
        .month-selector-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 20px;
          margin-bottom: 20px;
          border-bottom: 1px solid #E5E7EB;
          flex-wrap: wrap;
          gap: 12px;
        }
        
        .month-selector {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .selector-icon {
          color: #2E7D64;
          font-size: 18px;
        }
        
        .month-selector label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }
        
        .month-selector select {
          padding: 8px 12px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 14px;
          background: white;
          cursor: pointer;
        }
        
        .month-selector select:focus {
          outline: none;
          border-color: #2E7D64;
        }
        
        .month-hint {
          font-size: 12px;
          color: #6B7280;
        }
        
        .tab-navigation {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid #E5E7EB;
          flex-wrap: wrap;
        }
        
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          font-size: 14px;
          font-weight: 500;
          color: #6B7280;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .tab-btn:hover {
          color: #2E7D64;
        }
        
        .tab-btn.active {
          color: #2E7D64;
          border-bottom-color: #2E7D64;
        }
        
        .tab-count {
          background: #F3F4F6;
          color: #6B7280;
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 10px;
          margin-left: 4px;
        }
        
        .tab-btn.active .tab-count {
          background: #D1FAE5;
          color: #065F46;
        }
        
        .tab-content {
          min-height: 400px;
        }
        
        .submit-section {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #E5E7EB;
          text-align: center;
        }
        
        .error-message {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #DC2626;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .success-message {
          background: #D1FAE5;
          border: 1px solid #10B981;
          color: #065F46;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .submit-btn {
          background: #2E7D64;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .submit-btn:hover:not(.disabled) {
          background: #1B4D3E;
        }
        
        .submit-btn.disabled {
          background: #9CA3AF;
          cursor: not-allowed;
        }
        
        .no-data-hint {
          margin-top: 12px;
          font-size: 12px;
          color: #9CA3AF;
        }
        
        @media (max-width: 768px) {
          .scope2-page {
            padding: 16px;
          }
          
          .tab-navigation {
            flex-direction: column;
            gap: 4px;
          }
          
          .tab-btn {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}