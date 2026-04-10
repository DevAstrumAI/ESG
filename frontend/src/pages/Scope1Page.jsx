// src/pages/Scope1Page.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useEmissionStore } from "../store/emissionStore";
import { useCompanyStore } from "../store/companyStore";
import VehicleTable from "../components/scope1/VehicleTable";
import StationaryForm from "../components/scope1/StationaryForm";
import RefrigerantForm from "../components/scope1/RefrigerantForm";
import FugitiveForm from "../components/scope1/FugitiveForm";
import Card from "../components/ui/Card";
import { FiTruck, FiBriefcase, FiWind, FiAlertCircle, FiCalendar, FiArrowLeft, FiSave } from "react-icons/fi";

export default function Scope1Page() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useAuthStore((s) => s.token);
  const { company, fetchCompany } = useCompanyStore();
  
  const urlMonth = searchParams.get("month");
  const defaultMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  
  const [selectedMonth, setSelectedMonth] = useState(urlMonth || defaultMonth);
  const [activeTab, setActiveTab] = useState("mobile");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  
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
  
  // ✅ ADD THESE SETTERS to emissionStore.js first
  const setScope1Vehicles = useEmissionStore((s) => s.setScope1Vehicles);
  const setScope1Stationary = useEmissionStore((s) => s.setScope1Stationary);
  const setScope1Refrigerants = useEmissionStore((s) => s.setScope1Refrigerants);
  const setScope1Fugitive = useEmissionStore((s) => s.setScope1Fugitive);
  
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";
  
  // ✅ Load company data
  useEffect(() => {
    if (token && !company) {
      fetchCompany(token);
    }
  }, [token, company, fetchCompany]);
  
  // ✅ CLEAR and LOAD data when component mounts or month changes
  useEffect(() => {
    const loadScope1Data = async () => {
      if (!token) return;
      
      setLoadingData(true);
      
      try {
        // First, clear existing data to prevent duplicates
        setScope1Vehicles([]);
        setScope1Stationary([]);
        setScope1Refrigerants([]);
        setScope1Fugitive([]);
        
        // Then fetch fresh data
        const [year] = selectedMonth.split("-");
        const response = await fetch(`${API_URL}/api/emissions/scope1?year=${year}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Transform mobile data with unique IDs
          const mobileData = (data.mobile || []).map((item, index) => ({
            id: item.id || `${Date.now()}-${index}-${Math.random()}`,
            vehicleType: item.fuelType?.replace('_car', '').replace('_truck', '').replace('_van', '') || '',
            fuelType: item.fuelType?.includes('diesel') ? 'diesel' : 'petrol',
            litres: item.litresConsumed || 0,
            km: item.distanceKm || 0,
            month: item.month,
          }));
          
          // Transform stationary data
          const stationaryData = (data.stationary || []).map((item, index) => ({
            id: item.id || `${Date.now()}-${index}-${Math.random()}`,
            fuelType: item.fuelType,
            consumption: item.consumption || 0,
            month: item.month,
          }));
          
          // Transform refrigerant data
          const refrigerantData = (data.refrigerants || []).map((item, index) => ({
            id: item.id || `${Date.now()}-${index}-${Math.random()}`,
            refrigerantKey: item.refrigerantType,
            leakageKg: item.leakageKg || 0,
            month: item.month,
          }));
          
          // Transform fugitive data
          const fugitiveData = (data.fugitive || []).map((item, index) => ({
            id: item.id || `${Date.now()}-${index}-${Math.random()}`,
            sourceType: item.sourceType,
            amount: item.amount || item.emissionKg || 0,
            month: item.month,
          }));
          
          // Set the data (replacing, not appending)
          setScope1Vehicles(mobileData);
          setScope1Stationary(stationaryData);
          setScope1Refrigerants(refrigerantData);
          setScope1Fugitive(fugitiveData);
        }
      } catch (error) {
        console.error("Error loading Scope 1 data:", error);
      } finally {
        setLoadingData(false);
      }
    };
    
    loadScope1Data();
  }, [token, selectedMonth, setScope1Vehicles, setScope1Stationary, setScope1Refrigerants, setScope1Fugitive]);
  
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
    const result = await submitScope1(token, parseInt(year), selectedMonth);
    
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
  
  const hasData = vehicles.length > 0 || stationary.length > 0 || refrigerants.length > 0 || fugitive.length > 0;
  
  const tabs = [
    { id: "mobile", label: "Mobile Combustion", icon: <FiTruck size={16} />, count: vehicles.length },
    { id: "stationary", label: "Stationary Combustion", icon: <FiBriefcase size={16} />, count: stationary.length },
    { id: "refrigerants", label: "Refrigerants", icon: <FiWind size={16} />, count: refrigerants.length },
    { id: "fugitive", label: "Fugitive Emissions", icon: <FiAlertCircle size={16} />, count: fugitive.length },
  ];
  
  if (loadingData) {
    return (
      <div className="scope1-page">
        <div className="loading-state">Loading your data...</div>
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
        
        <div className="tab-content">
          {activeTab === "mobile" && (
            <VehicleTable
              vehicles={vehicles}
              onAdd={addVehicle}
              onUpdate={updateVehicle}
              onDelete={deleteVehicle}
            />
          )}
          
          {activeTab === "stationary" && (
            <StationaryForm
              entries={stationary}
              onAdd={addStationary}
              onDelete={deleteStationary}
            />
          )}
          
          {activeTab === "refrigerants" && (
            <RefrigerantForm
              entries={refrigerants}
              onAdd={addRefrigerant}
              onDelete={deleteRefrigerant}
            />
          )}
          
          {activeTab === "fugitive" && (
            <FugitiveForm
              entries={fugitive}
              onAdd={addFugitive}
              onDelete={deleteFugitive}
            />
          )}
        </div>
        
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
            {submitting ? "Submitting..." : `Submit Scope 1 Data for ${new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}`}
          </button>
          
          {!hasData && (
            <p className="no-data-hint">Add at least one entry before submitting</p>
          )}
        </div>
      </Card>
      
      <style jsx>{`
        .scope1-page {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .loading-state {
          text-align: center;
          padding: 60px;
          color: #6B7280;
          font-size: 16px;
        }
        
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
        
        .scope1-card {
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
          .scope1-page {
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