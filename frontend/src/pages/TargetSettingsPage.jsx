// src/pages/TargetSettingsPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useCompanyStore } from "../store/companyStore";
import Card from "../components/ui/Card";
import { FiSave, FiTarget, FiCalendar, FiTrendingDown, FiCheckCircle, FiArrowLeft } from "react-icons/fi";

export default function TargetSettingsPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const { company, fetchCompany } = useCompanyStore();
  
  const [formData, setFormData] = useState({
    reductionPct: 42,
    baseYear: new Date().getFullYear(),
    targetYear: 2030,
    reductionType: "absolute",
    alignment: "SBTi",
    annualTargetT: null,
  });
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Load existing targets when component mounts
  useEffect(() => {
    const loadTargets = async () => {
      if (!token) return;
      setLoading(true);
      
      try {
        const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";
        const response = await fetch(`${API_URL}/api/companies/targets`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.targets) {
            setFormData({
              reductionPct: data.targets.reductionPct || 42,
              baseYear: data.targets.baseYear || new Date().getFullYear(),
              targetYear: data.targets.targetYear || 2030,
              reductionType: data.targets.reductionType || "absolute",
              alignment: data.targets.alignment || "SBTi",
              annualTargetT: data.targets.annualTargetT || null,
            });
          }
        }
      } catch (err) {
        console.error("Error loading targets:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadTargets();
  }, [token]);
  
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
    setError(null);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    
    try {
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";
      const response = await fetch(`${API_URL}/api/companies/targets`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reductionPct: formData.reductionPct,
          baseYear: formData.baseYear,
          targetYear: formData.targetYear,
          reductionType: formData.reductionType,
          alignment: formData.alignment,
          annualTargetT: formData.annualTargetT,
          scopesCovered: "scope1+2",
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSaveSuccess(true);
        // Refresh company data
        await fetchCompany(token, { force: true });
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError(data.detail || "Failed to save targets");
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="target-settings-container">
        <div className="loading-state">Loading targets...</div>
      </div>
    );
  }
  
  return (
    <div className="target-settings-container">
      <button onClick={() => navigate('/dashboard')} className="back-btn">
        <FiArrowLeft /> Back to Dashboard
      </button>
      
      <div className="page-header">
        <h1>Emission Reduction Targets</h1>
        <p>Set your company's science-based reduction targets</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Card className="target-form-card">
          <div className="form-section">
            <h3>
              <FiTarget className="section-icon" />
              Annual Reduction Target
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Baseline Year</label>
                <select
                  value={formData.baseYear}
                  onChange={(e) => handleChange("baseYear", parseInt(e.target.value))}
                  className="form-input"
                >
                  {[2022, 2023, 2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <small>The year used as your starting point</small>
              </div>
              
              <div className="form-group">
                <label>Target Year</label>
                <select
                  value={formData.targetYear}
                  onChange={(e) => handleChange("targetYear", parseInt(e.target.value))}
                  className="form-input"
                >
                  {[2027, 2028, 2029, 2030, 2035, 2040, 2050].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <small>The year to achieve your target</small>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Reduction Percentage</label>
                <div className="percentage-input">
                  <input
                    type="number"
                    value={formData.reductionPct}
                    onChange={(e) => handleChange("reductionPct", parseFloat(e.target.value))}
                    className="form-input"
                    min="0"
                    max="100"
                    step="1"
                  />
                  <span className="percentage-symbol">%</span>
                </div>
                <small>Target reduction from baseline by target year</small>
              </div>
              
              <div className="form-group">
                <label>Annual Target (tCO₂e)</label>
                <input
                  type="number"
                  value={formData.annualTargetT || ""}
                  onChange={(e) => handleChange("annualTargetT", parseFloat(e.target.value) || null)}
                  className="form-input"
                  placeholder="Optional"
                  step="10"
                />
                <small>Optional: Set a specific annual target in tonnes</small>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Reduction Type</label>
                <select
                  value={formData.reductionType}
                  onChange={(e) => handleChange("reductionType", e.target.value)}
                  className="form-input"
                >
                  <option value="absolute">Absolute Reduction (tCO₂e)</option>
                  <option value="intensity">Intensity-based (tCO₂e/employee)</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="form-section">
            <h3>
              <FiTrendingDown className="section-icon" />
              Alignment Framework
            </h3>
            
            <div className="alignment-options">
              <label className={`alignment-card ${formData.alignment === "SBTi" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="alignment"
                  value="SBTi"
                  checked={formData.alignment === "SBTi"}
                  onChange={(e) => handleChange("alignment", e.target.value)}
                />
                <div className="alignment-content">
                  <strong>SBTi (Science Based Targets initiative)</strong>
                  <small>1.5°C pathway aligned with Paris Agreement</small>
                </div>
              </label>
              
              <label className={`alignment-card ${formData.alignment === "NetZero2050" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="alignment"
                  value="NetZero2050"
                  checked={formData.alignment === "NetZero2050"}
                  onChange={(e) => handleChange("alignment", e.target.value)}
                />
                <div className="alignment-content">
                  <strong>Net Zero by 2050</strong>
                  <small>90% reduction from baseline by 2050</small>
                </div>
              </label>
              
              <label className={`alignment-card ${formData.alignment === "Custom" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="alignment"
                  value="Custom"
                  checked={formData.alignment === "Custom"}
                  onChange={(e) => handleChange("alignment", e.target.value)}
                />
                <div className="alignment-content">
                  <strong>Custom Target</strong>
                  <small>Define your own reduction pathway</small>
                </div>
              </label>
            </div>
          </div>
          
          <div className="form-section preview-section">
            <h3>Target Preview</h3>
            <div className="preview-card">
              <div className="preview-item">
                <span className="preview-label">Reduction Required:</span>
                <span className="preview-value">
                  {formData.reductionPct}% by {formData.targetYear}
                </span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Timeframe:</span>
                <span className="preview-value">
                  {formData.targetYear - formData.baseYear} years
                </span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Annual Reduction Rate:</span>
                <span className="preview-value">
                  {(formData.reductionPct / (formData.targetYear - formData.baseYear)).toFixed(1)}% per year
                </span>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="error-message">{error}</div>
          )}
          
          {saveSuccess && (
            <div className="success-message">
              <FiCheckCircle /> Targets saved successfully!
            </div>
          )}
          
          <div className="form-actions">
            <button
              type="submit"
              className="save-btn"
              disabled={saving}
            >
              <FiSave />
              {saving ? "Saving..." : "Save Targets"}
            </button>
          </div>
        </Card>
      </form>
      
      <style jsx>{`
        .target-settings-container {
          padding: 24px;
          max-width: 800px;
          margin: 0 auto;
        }
        
        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: #6B7280;
          cursor: pointer;
          margin-bottom: 20px;
          font-size: 14px;
        }
        
        .back-btn:hover {
          color: #2E7D64;
        }
        
        .loading-state {
          text-align: center;
          padding: 40px;
          color: #6B7280;
        }
        
        .page-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #1B4D3E;
          margin: 0 0 8px;
        }
        
        .page-header p {
          color: #6B7280;
          margin: 0 0 24px;
        }
        
        .target-form-card {
          padding: 24px;
        }
        
        .form-section {
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 1px solid #E5E7EB;
        }
        
        .form-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        
        .form-section h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 600;
          color: #1B4D3E;
          margin-bottom: 20px;
        }
        
        .section-icon {
          font-size: 20px;
          color: #2E7D64;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .form-group label {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }
        
        .form-group small {
          font-size: 12px;
          color: #6B7280;
        }
        
        .form-input {
          padding: 10px 12px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s;
        }
        
        .form-input:focus {
          outline: none;
          border-color: #2E7D64;
          ring: 2px solid #2E7D64;
        }
        
        .percentage-input {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .percentage-input .form-input {
          flex: 1;
        }
        
        .percentage-symbol {
          font-size: 16px;
          font-weight: 600;
          color: #374151;
        }
        
        .alignment-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .alignment-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .alignment-card:hover {
          border-color: #2E7D64;
          background: #F8FAF8;
        }
        
        .alignment-card.selected {
          border-color: #2E7D64;
          background: #F0FDF4;
        }
        
        .alignment-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .alignment-content strong {
          font-size: 14px;
          color: #1B4D3E;
        }
        
        .alignment-content small {
          font-size: 12px;
          color: #6B7280;
        }
        
        .preview-section {
          background: #F9FAFB;
          border-radius: 12px;
          padding: 20px;
          margin-top: 16px;
        }
        
        .preview-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .preview-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .preview-label {
          font-size: 13px;
          color: #6B7280;
        }
        
        .preview-value {
          font-size: 14px;
          font-weight: 600;
          color: #1B4D3E;
        }
        
        .error-message {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #DC2626;
          padding: 12px;
          border-radius: 8px;
          margin: 16px 0;
        }
        
        .success-message {
          background: #D1FAE5;
          border: 1px solid #10B981;
          color: #065F46;
          padding: 12px;
          border-radius: 8px;
          margin: 16px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .form-actions {
          margin-top: 24px;
          display: flex;
          justify-content: flex-end;
        }
        
        .save-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: #2E7D64;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .save-btn:hover:not(:disabled) {
          background: #1B4D3E;
        }
        
        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        @media (max-width: 640px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}