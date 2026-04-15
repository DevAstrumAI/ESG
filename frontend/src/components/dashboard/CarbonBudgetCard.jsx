// src/components/dashboard/CarbonBudgetCard.jsx
import React, { useState, useEffect } from "react";
import { FiInfo, FiTarget, FiTrendingUp, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { useEmissionStore } from "../../store/emissionStore";
import { useCompanyStore } from "../../store/companyStore";
import { useAuthStore } from "../../store/authStore";

export default function CarbonBudgetCard({ year }) {
  const [budgetData, setBudgetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  
  const token = useAuthStore(s => s.token);
  const calculateCarbonBudget = useEmissionStore(s => s.calculateCarbonBudget);
  const company = useCompanyStore(s => s.company);
  
  useEffect(() => {
    if (token) {
      loadBudgetData();
    }
  }, [token, year]);
  
  const loadBudgetData = async () => {
    setLoading(true);
    const data = await calculateCarbonBudget(token, year);
    setBudgetData(data);
    setLoading(false);
  };
  
  if (loading) {
    return (
      <div className="carbon-budget-card">
        <div className="card-header">
          <FiTarget className="header-icon" />
          <h3>Carbon Budget</h3>
        </div>
        <div className="skeleton">Loading budget data...</div>
        <style jsx>{`
          .carbon-budget-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            border: 1px solid #E5E7EB;
          }
          .card-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
          }
          .header-icon {
            font-size: 20px;
            color: #2E7D64;
          }
          .card-header h3 {
            font-size: 16px;
            font-weight: 600;
            color: #1B4D3E;
            margin: 0;
          }
          .skeleton {
            height: 100px;
            background: #F3F4F6;
            border-radius: 8px;
            animation: pulse 1.5s infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }
  
  const getStatusColor = () => {
    switch (budgetData?.status) {
      case "on_track": return { bg: "#D1FAE5", text: "#065F46", border: "#10B981", icon: <FiCheckCircle size={16} /> };
      case "at_risk": return { bg: "#FEF3C7", text: "#92400E", border: "#F59E0B", icon: <FiAlertCircle size={16} /> };
      case "off_track": return { bg: "#FEE2E2", text: "#991B1B", border: "#EF4444", icon: <FiAlertCircle size={16} /> };
      default: return { bg: "#F3F4F6", text: "#6B7280", border: "#9CA3AF", icon: <FiInfo size={16} /> };
    }
  };
  
  const statusColors = getStatusColor();
  const percentUsed = budgetData?.percentUsed || 0;
  const percentRemaining = 100 - percentUsed;
  const progressBarColor = budgetData?.status === "on_track" ? "#10B981" : budgetData?.status === "at_risk" ? "#F59E0B" : "#EF4444";
  
  return (
    <div className="carbon-budget-card">
      <div className="card-header">
        <FiTarget className="header-icon" />
        <h3>Carbon Budget</h3>
        <div className="tooltip-wrapper">
          <div 
            className="info-icon"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <FiInfo size={14} />
          </div>
          {showTooltip && (
            <div className="tooltip">
              {budgetData?.tooltipText || "Track your progress against annual target"}
            </div>
          )}
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="progress-section">
        <div className="progress-labels">
          <span className="progress-label">Consumed</span>
          <span className="progress-value">{budgetData?.currentTotalT?.toFixed(1) || 0} tCO₂e</span>
        </div>
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill"
            style={{ 
              width: `${Math.min(percentUsed, 100)}%`,
              backgroundColor: progressBarColor
            }}
          />
        </div>
        <div className="progress-labels">
          <span className="progress-label">Remaining</span>
          <span className="progress-value">
            {budgetData?.annualTargetT ? (budgetData.annualTargetT - (budgetData.currentTotalT || 0)).toFixed(1) : "—"} tCO₂e
          </span>
        </div>
      </div>
      
      {/* Projection Section */}
      <div className="projection-section">
        <div className="projection-item">
          <FiTrendingUp className="projection-icon" />
          <div className="projection-content">
            <span className="projection-label">Projected Year-End</span>
            <span className="projection-value">
              {budgetData?.projectedTotalT ? `${budgetData.projectedTotalT.toFixed(1)} tCO₂e` : "—"}
            </span>
          </div>
        </div>
        
        {budgetData?.annualTargetT && (
          <div className={`status-badge ${budgetData.status}`}>
            {statusColors.icon}
            <span>
              {budgetData.status === "on_track" && "On Track"}
              {budgetData.status === "at_risk" && "At Risk"}
              {budgetData.status === "off_track" && "Off Track"}
              {budgetData.status === "no_target" && "No Target Set"}
            </span>
          </div>
        )}
      </div>
      
      {/* Annual Target Display */}
      <div className="target-section">
        <span className="target-label">Annual Target</span>
        <span className="target-value">
          {budgetData?.annualTargetT ? `${budgetData.annualTargetT} tCO₂e` : "Not set"}
        </span>
        {!budgetData?.annualTargetT && (
          <button className="set-target-btn" onClick={() => window.location.href = "/settings"}>
            Set Target
          </button>
        )}
      </div>
      
      <style jsx>{`
        .carbon-budget-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #E5E7EB;
          transition: all 0.2s ease;
        }
        .carbon-budget-card:hover {
          border-color: #2E7D64;
          transform: translateY(-2px);
        }
        .card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          position: relative;
        }
        .header-icon {
          font-size: 20px;
          color: #2E7D64;
        }
        .card-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1B4D3E;
          margin: 0;
          flex: 1;
        }
        .tooltip-wrapper {
          position: relative;
        }
        .info-icon {
          cursor: pointer;
          color: #9CA3AF;
          transition: color 0.2s;
          display: flex;
          align-items: center;
        }
        .info-icon:hover {
          color: #2E7D64;
        }
        .tooltip {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          background: #1F2937;
          color: white;
          font-size: 12px;
          padding: 8px 12px;
          border-radius: 8px;
          white-space: nowrap;
          z-index: 10;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .tooltip::before {
          content: '';
          position: absolute;
          top: -6px;
          right: 8px;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-bottom: 6px solid #1F2937;
        }
        .progress-section {
          margin-bottom: 20px;
        }
        .progress-labels {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 6px;
        }
        .progress-label {
          color: #6B7280;
        }
        .progress-value {
          font-weight: 600;
          color: #1F2937;
        }
        .progress-bar-container {
          background: #E5E7EB;
          border-radius: 10px;
          height: 8px;
          overflow: hidden;
          margin-bottom: 6px;
        }
        .progress-bar-fill {
          height: 100%;
          border-radius: 10px;
          transition: width 0.3s ease;
        }
        .projection-section {
          background: #F9FAFB;
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .projection-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .projection-icon {
          font-size: 16px;
          color: #2E7D64;
        }
        .projection-content {
          display: flex;
          flex-direction: column;
        }
        .projection-label {
          font-size: 11px;
          color: #6B7280;
        }
        .projection-value {
          font-size: 14px;
          font-weight: 700;
          color: #1B4D3E;
        }
        .status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .status-badge.on_track {
          background: #D1FAE5;
          color: #065F46;
        }
        .status-badge.at_risk {
          background: #FEF3C7;
          color: #92400E;
        }
        .status-badge.off_track {
          background: #FEE2E2;
          color: #991B1B;
        }
        .status-badge.no_target {
          background: #F3F4F6;
          color: #6B7280;
        }
        .target-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid #E5E7EB;
          font-size: 13px;
        }
        .target-label {
          color: #6B7280;
        }
        .target-value {
          font-weight: 600;
          color: #1B4D3E;
        }
        .set-target-btn {
          background: none;
          border: none;
          color: #2E7D64;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          text-decoration: underline;
        }
        .set-target-btn:hover {
          color: #1B4D3E;
        }
        @media (max-width: 768px) {
          .projection-section {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}