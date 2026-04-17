// src/components/dashboard/DataCompletenessCalendar.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useEmissionStore } from "../../store/emissionStore";
import { useCompanyStore } from "../../store/companyStore";
import { FiCalendar, FiAlertCircle, FiCheckCircle, FiMinusCircle } from "react-icons/fi";
import ConfirmationDialog from "../ui/ConfirmationDialog";
import { appendLocationQuery } from "../../utils/locationQuery";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

export default function DataCompletenessCalendar({ year, onMonthClick, country, city }) {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const fetchCompany = useCompanyStore((s) => s.fetchCompany);
  const [monthStatus, setMonthStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [missingCount, setMissingCount] = useState(0);
  const [showBanner, setShowBanner] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    options: null,
    onConfirm: null
  });

  // Fiscal year starts in June: Jun..May
  const fiscalMonths = Array.from({ length: 12 }, (_, idx) => {
    const monthNum = ((5 + idx) % 12) + 1; // 6..12,1..5
    const yearNum = monthNum >= 6 ? year : year + 1;
    const date = new Date(yearNum, monthNum - 1, 1);
    return {
      label: date.toLocaleString("en-US", { month: "short" }),
      yearNum,
      monthNum,
      monthKey: `${yearNum}-${String(monthNum).padStart(2, "0")}`,
    };
  });
  const months = fiscalMonths.map((m) => m.label);

  useEffect(() => {
    if (token) {
      fetchMonthStatus();
      // Refresh company data to ensure targets are loaded
      fetchCompany(token, { force: true });
    }
  }, [token, year, country, city]);

  const fetchMonthStatus = async () => {
    setLoading(true);
    
    try {
      let statusUrl = `${API_URL}/api/emissions/month-status?year=${year}`;
      if (country && city) {
        statusUrl = appendLocationQuery(statusUrl, country, city);
      }
      const response = await fetch(statusUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch month status");
      }

      const data = await response.json();
      setMonthStatus(data);
      
      const missing = Object.values(data).filter(status => status === "none").length;
      setMissingCount(missing);
      setShowBanner(missing > 0);
      
    } catch (err) {
      console.error("Error fetching month status:", err);
      loadFallbackStatus();
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackStatus = () => {
    const scope1Results = useEmissionStore.getState().scope1Results;
    const scope2Results = useEmissionStore.getState().scope2Results;
    
    const hasScope1Data = scope1Results?.total?.kgCO2e > 0;
    const hasScope2Data = scope2Results?.total?.kgCO2e > 0;
    
    const currentMonth = new Date().getMonth();
    const status = {};
    
    for (let i = 0; i < 12; i++) {
      if (hasScope1Data && hasScope2Data && i === currentMonth) {
        status[i] = "both";
      } else if (hasScope1Data && i === currentMonth) {
        status[i] = "scope1";
      } else if (hasScope2Data && i === currentMonth) {
        status[i] = "scope2";
      } else {
        status[i] = "none";
      }
    }
    
    setMonthStatus(status);
    const missing = Object.values(status).filter(s => s === "none").length;
    setMissingCount(missing);
    setShowBanner(missing > 0);
  };

  const handleMonthClick = (monthIndex, status) => {
    const meta = fiscalMonths[monthIndex];
    const monthStr = meta.monthKey;
    const monthName = meta.label;
    const displayYear = meta.yearNum;
    
    if (status === "none") {
      // Missing month pills should open data entry directly with month prefilled.
      navigate(`/scope1?month=${monthStr}`);
      return;
    } else if (status === "scope1") {
      // Only Scope 1 exists, offer to add Scope 2
      setDialogConfig({
        isOpen: true,
        title: `Add Scope 2 Data for ${monthName} ${displayYear}`,
        message: `Scope 1 data exists for ${monthName} ${displayYear}. Would you like to add Scope 2 data?`,
        options: [
          { label: "⚡ Add Scope 2 Data", value: "scope2" },
          { label: "📊 View Scope 1 Data", value: "scope1_view" }
        ],
        onConfirm: (selectedOption) => {
          if (selectedOption === "scope2") {
            navigate(`/scope2?month=${monthStr}`);
          } else if (selectedOption === "scope1_view") {
            navigate(`/scope1?month=${monthStr}`);
          }
        }
      });
    } else if (status === "scope2") {
      // Only Scope 2 exists, offer to add Scope 1
      setDialogConfig({
        isOpen: true,
        title: `Add Scope 1 Data for ${monthName} ${displayYear}`,
        message: `Scope 2 data exists for ${monthName} ${displayYear}. Would you like to add Scope 1 data?`,
        options: [
          { label: "📊 Add Scope 1 Data", value: "scope1" },
          { label: "⚡ View Scope 2 Data", value: "scope2_view" }
        ],
        onConfirm: (selectedOption) => {
          if (selectedOption === "scope1") {
            navigate(`/scope1?month=${monthStr}`);
          } else if (selectedOption === "scope2_view") {
            navigate(`/scope2?month=${monthStr}`);
          }
        }
      });
    } else if (status === "both") {
      // Both exist - ask what to do
      setDialogConfig({
        isOpen: true,
        title: `${monthName} ${displayYear} - Data Exists`,
        message: `Both Scope 1 and Scope 2 data exist for ${monthName} ${displayYear}. What would you like to do?`,
        options: [
          { label: "📊 Edit Scope 1 Data", value: "scope1" },
          { label: "⚡ Edit Scope 2 Data", value: "scope2" },
          { label: "📋 View Summary", value: "summary" }
        ],
        onConfirm: (selectedOption) => {
          if (selectedOption === "scope1") {
            navigate(`/scope1?month=${monthStr}`);
          } else if (selectedOption === "scope2") {
            navigate(`/scope2?month=${monthStr}`);
          } else if (selectedOption === "summary") {
            navigate(`/dashboard?month=${monthStr}`);
          }
        }
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "both":
        return { bg: "#D1FAE5", text: "#065F46", border: "#10B981", label: "Complete" };
      case "scope1":
        return { bg: "#FEF3C7", text: "#92400E", border: "#F59E0B", label: "Scope 1 Only" };
      case "scope2":
        return { bg: "#FEF3C7", text: "#92400E", border: "#F59E0B", label: "Scope 2 Only" };
      default:
        return { bg: "#F3F4F6", text: "#6B7280", border: "#E5E7EB", label: "Missing" };
    }
  };

  const getMissingMonthsList = () => {
    const missing = [];
    for (let i = 0; i < 12; i++) {
      if (monthStatus[i] === "none") {
        missing.push(months[i]);
      }
    }
    return missing;
  };

  if (loading) {
    return (
      <div className="calendar-loading">
        <div className="loading-spinner"></div>
        <span>Loading calendar...</span>
        <style jsx>{`
          .calendar-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 20px;
            color: #6B7280;
          }
          .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #E5E7EB;
            border-top-color: #2E7D64;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const missingMonths = getMissingMonthsList();
  const coveredCount = 12 - missingCount;
  const coveragePercent = Math.round((coveredCount / 12) * 100);

  return (
    <div className="completeness-calendar">
      {/* Red Banner - shown if months are missing */}
      {showBanner && (
        <div className="warning-banner">
          <FiAlertCircle className="banner-icon" />
          <div className="banner-content">
            <span className="banner-title">Incomplete Data</span>
            <span className="banner-message">
              Your report covers {coveredCount}/12 months ({coveragePercent}%). 
              {missingMonths.length > 0 && ` Missing: ${missingMonths.join(", ")}`}
            </span>
          </div>
          <button 
            className="banner-action"
            onClick={() => {
              const firstMissingIndex = months.findIndex(m => missingMonths.includes(m));
              if (firstMissingIndex !== -1) {
                handleMonthClick(firstMissingIndex, "none");
              }
            }}
          >
            Add Missing Data
          </button>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {months.map((month, index) => {
          const status = monthStatus[index] || "none";
          const colors = getStatusColor(status);
          
          return (
            <button
              key={month}
              className={`month-pill ${status}`}
              style={{
                background: colors.bg,
                borderColor: colors.border,
                color: colors.text
              }}
              onClick={() => handleMonthClick(index, status)}
              title={`${month} ${fiscalMonths[index]?.yearNum || year}: ${colors.label}`}
            >
              <span className="month-name">{month}</span>
              {status === "both" && <FiCheckCircle className="status-icon" />}
              {status === "scope1" && <span className="status-badge">S1</span>}
              {status === "scope2" && <span className="status-badge">S2</span>}
              {status === "none" && <FiMinusCircle className="status-icon missing" />}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-dot both"></span>
          <span>Both Scopes</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot partial"></span>
          <span>One Scope Only</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot missing"></span>
          <span>No Data</span>
        </div>
        <div className="legend-item">
          <FiCheckCircle size={12} />
          <span>Complete</span>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={dialogConfig.isOpen}
        onClose={() => setDialogConfig({ ...dialogConfig, isOpen: false })}
        onConfirm={dialogConfig.onConfirm}
        title={dialogConfig.title}
        message={dialogConfig.message}
        options={dialogConfig.options}
        confirmText="Continue"
        cancelText="Cancel"
      />

      <style jsx>{`
        .completeness-calendar {
          background: white;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #E5E7EB;
        }
        
        .warning-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 10px;
          padding: 12px 20px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        
        .banner-icon {
          font-size: 20px;
          color: #DC2626;
          flex-shrink: 0;
        }
        
        .banner-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .banner-title {
          font-weight: 700;
          color: #991B1B;
          font-size: 14px;
        }
        
        .banner-message {
          font-size: 13px;
          color: #7F1D1D;
        }
        
        .banner-action {
          background: #DC2626;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
        }
        
        .banner-action:hover {
          background: #B91C1C;
        }
        
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .month-pill {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px 4px;
          border-radius: 10px;
          border: 1px solid;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          background: white;
        }
        
        .month-pill:hover {
          transform: translateY(-2px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .month-name {
          font-weight: 600;
        }
        
        .status-icon {
          font-size: 12px;
        }
        
        .status-icon.missing {
          color: #9CA3AF;
        }
        
        .status-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 2px 4px;
          border-radius: 4px;
          background: rgba(0,0,0,0.05);
        }
        
        .calendar-legend {
          display: flex;
          justify-content: center;
          gap: 24px;
          flex-wrap: wrap;
          padding-top: 12px;
          border-top: 1px solid #E5E7EB;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #6B7280;
        }
        
        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 2px;
        }
        
        .legend-dot.both {
          background: #10B981;
        }
        
        .legend-dot.partial {
          background: #F59E0B;
        }
        
        .legend-dot.missing {
          background: #E5E7EB;
          border: 1px solid #D1D5DB;
        }
        
        @media (max-width: 1024px) {
          .calendar-grid {
            grid-template-columns: repeat(6, 1fr);
          }
        }
        
        @media (max-width: 640px) {
          .calendar-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .warning-banner {
            flex-direction: column;
            text-align: center;
          }
          
          .banner-action {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}