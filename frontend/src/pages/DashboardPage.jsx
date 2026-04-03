// src/pages/DashboardPage.jsx
import React, { useEffect, useState } from "react";
import { 
  FiCalendar, 
  FiDownload,
  FiAlertCircle,
  FiZap,
  FiTarget,
  FiClock,
  FiAward,
  FiTruck,
  FiBriefcase,
  FiWind,
  FiThermometer,
  FiSun,
  FiBarChart2,
  FiActivity,
  FiChevronDown,
  FiRefreshCw
} from "react-icons/fi";
import { BiLeaf, BiTrendingUp } from "react-icons/bi";
import ScopeBreakdown from "../components/dashboard/ScopeBreakdown";
import EmissionsTrendLine from "../components/dashboard/DashboardCharts/EmissionsTrendLine";
import TotalEmissionsPie from "../components/dashboard/DashboardCharts/TotalEmissionsPie";
import { useAuthStore } from "../store/authStore";
import { useEmissionStore } from "../store/emissionStore";
import Card from "../components/ui/Card";

export default function DashboardPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const token = useAuthStore((s) => s.token);
  const fetchSummary = useEmissionStore((s) => s.fetchSummary);
  const scope1Results = useEmissionStore((s) => s.scope1Results);
  const scope2Results = useEmissionStore((s) => s.scope2Results);

  // Fetch data when year changes
  useEffect(() => {
    if (token) {
      fetchSummary(token, selectedYear);
    }
  }, [token, fetchSummary, selectedYear]);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i <= 5; i++) {
      years.push(currentYear - i);
    }
    setAvailableYears(years);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSummary(token, selectedYear);
    setTimeout(() => setRefreshing(false), 500);
  };

  // CORRECTED DATA MAPPING
  // Scope 1: Use total.kgCO2e
  const scope1Kg = scope1Results?.total?.kgCO2e || 0;
  
  // Scope 2: locationBasedKgCO2e already includes electricity + heating
  const scope2Kg = scope2Results?.locationBasedKgCO2e || 0;
  const totalKg = scope1Kg + scope2Kg;
  const totalTonnes = totalKg / 1000;

  const scope1Tonnes = scope1Kg / 1000;
  const scope2Tonnes = scope2Kg / 1000;

  // Individual components for breakdown display
  const electricityLocationKg = scope2Results?.electricity?.locationBasedKgCO2e || 0;
  const electricityMarketKg = scope2Results?.electricity?.marketBasedKgCO2e || 0;
  const heatingKg = scope2Results?.heating?.kgCO2e || 0;
  const renewablesKg = scope2Results?.renewables?.kgCO2e || 0;
  
  // For display in Location vs Market card
  const locationBasedKg = scope2Kg; // Already includes heating
  const marketBasedKg = scope2Results?.marketBasedKgCO2e || 0;

  // Scope 1 Breakdown
  const scope1Breakdown = [
    { 
      label: "Mobile Combustion", 
      value: scope1Kg ? Math.round((scope1Results?.mobile?.kgCO2e || 0) / scope1Kg * 100) : 0, 
      color: "#3B82F6", 
      icon: <FiTruck size={14} />,
      kgCO2e: scope1Results?.mobile?.kgCO2e || 0
    },
    { 
      label: "Stationary Combustion", 
      value: scope1Kg ? Math.round((scope1Results?.stationary?.kgCO2e || 0) / scope1Kg * 100) : 0, 
      color: "#F59E0B", 
      icon: <FiBriefcase size={14} />,
      kgCO2e: scope1Results?.stationary?.kgCO2e || 0
    },
    { 
      label: "Refrigerants", 
      value: scope1Kg ? Math.round((scope1Results?.refrigerants?.kgCO2e || 0) / scope1Kg * 100) : 0, 
      color: "#06B6D4", 
      icon: <FiWind size={14} />,
      kgCO2e: scope1Results?.refrigerants?.kgCO2e || 0
    },
    { 
      label: "Fugitive Emissions", 
      value: scope1Kg ? Math.round((scope1Results?.fugitive?.kgCO2e || 0) / scope1Kg * 100) : 0, 
      color: "#EF4444", 
      icon: <FiAlertCircle size={14} />,
      kgCO2e: scope1Results?.fugitive?.kgCO2e || 0
    },
  ];

  // Scope 2 Breakdown
  const scope2Breakdown = [
    { 
      label: "Electricity (Location-based)", 
      value: locationBasedKg ? Math.round((electricityLocationKg || 0) / locationBasedKg * 100) : 0, 
      color: "#8B5CF6", 
      icon: <FiZap size={14} />,
      kgCO2e: electricityLocationKg || 0
    },
    { 
      label: "Heating & Cooling", 
      value: locationBasedKg ? Math.round((heatingKg || 0) / locationBasedKg * 100) : 0, 
      color: "#F97316", 
      icon: <FiThermometer size={14} />,
      kgCO2e: heatingKg || 0
    },
  ];

  // Data for TotalEmissionsPie donut chart
  const pieChartData = [
    { name: "Scope 1", value: scope1Kg / 1000, color: "#3B82F6" },
    { name: "Scope 2", value: scope2Kg / 1000, color: "#F97316" },
  ];

  const hasData = totalKg > 0;

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Emissions Dashboard</h1>
          <p>Track your organization's carbon footprint in real-time</p>
        </div>
        <div className="header-actions">
          <div className="year-selector">
            <FiCalendar className="year-icon" />
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="year-dropdown"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year} Overview
                </option>
              ))}
            </select>
            <FiChevronDown className="dropdown-icon" />
          </div>
          <button onClick={handleRefresh} className="refresh-btn" disabled={refreshing}>
            <FiRefreshCw className={refreshing ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-card-title">
            <span className="kpi-icon-wrap">
              <BiLeaf className="kpi-icon" />
            </span>
            <span>Scope 1 Total</span>
          </div>
          <div className="kpi-value">
            {hasData ? scope1Tonnes.toFixed(1) : "—"}
            <span className="kpi-unit"> tCO₂e</span>
          </div>
          {hasData && scope1Kg > 0 && (
            <div className="kpi-sub">
              {((scope1Kg / totalKg) * 100).toFixed(1)}% of total emissions
            </div>
          )}
        </div>

        <div className="kpi-card">
          <div className="kpi-card-title">
            <span className="kpi-icon-wrap">
              <FiZap className="kpi-icon" />
            </span>
            <span>Scope 2 Total (Location-based)</span>
          </div>
          <div className="kpi-value">
            {hasData ? scope2Tonnes.toFixed(1) : "—"}
            <span className="kpi-unit"> tCO₂e</span>
          </div>
          {hasData && scope2Kg > 0 && (
            <div className="kpi-sub">
              {((scope2Kg / totalKg) * 100).toFixed(1)}% of total emissions
            </div>
          )}
        </div>

        <div className="kpi-card">
          <div className="kpi-card-title">
            <span className="kpi-icon-wrap">
              <FiTarget className="kpi-icon" />
            </span>
            <span>Location vs Market</span>
          </div>
          <div className="kpi-value">
            {(locationBasedKg / 1000).toFixed(1)}
            <span className="kpi-unit"> tCO₂e</span>
          </div>
          <div className="kpi-sub">
            <div>📍 Location-based: {(locationBasedKg / 1000).toFixed(1)} tCO₂e</div>
            <div>📊 Market-based: {(marketBasedKg / 1000).toFixed(1)} tCO₂e</div>
            {(locationBasedKg - marketBasedKg) > 0 && (
              <div style={{ color: '#10B981', fontSize: '11px', marginTop: '6px' }}>
                ✓ {((locationBasedKg - marketBasedKg) / 1000).toFixed(1)} tCO₂e reduction from renewable energy certificates
              </div>
            )}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-title">
            <span className="kpi-icon-wrap">
              <FiCalendar className="kpi-icon" />
            </span>
            <span>Reporting Year</span>
          </div>
          <div className="kpi-value kpi-year">{selectedYear}</div>
          <div className="kpi-sub">Selected reporting period</div>
        </div>
      </div>

      {/* Total Emissions Card */}
      <Card className="total-emissions-card">
        <div className="total-header">
          <div className="total-icon">
            <BiLeaf />
          </div>
          <div>
            <h3>Total CO₂e Emissions</h3>
            <p>Combined Scope 1 and Scope 2 emissions for {selectedYear}</p>
          </div>
        </div>
        <div className="total-value">
          {hasData ? totalTonnes.toFixed(2) : "—"}
          <span className="total-unit"> tonnes CO₂e</span>
        </div>
        {hasData && (
          <div className="total-breakdown">
            <span>Scope 1: {scope1Tonnes.toFixed(2)} tCO₂e</span>
            <span className="separator">|</span>
            <span>Scope 2: {scope2Tonnes.toFixed(2)} tCO₂e</span>
            {heatingKg > 0 && (
              <>
                <span className="separator">|</span>
                <span>Heating: {(heatingKg / 1000).toFixed(2)} tCO₂e</span>
              </>
            )}
          </div>
        )}
      </Card>

      {/* Charts Grid */}
      <div className="charts-grid">
        <Card className="chart-card large">
          <div className="chart-header">
            <h3>Emissions Trend</h3>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-dot scope1"></span>Scope 1
              </span>
              <span className="legend-item">
                <span className="legend-dot scope2"></span>Scope 2
              </span>
            </div>
          </div>
          <div className="chart-wrapper">
            <EmissionsTrendLine />
          </div>
        </Card>

        <Card className="chart-card">
          <div className="chart-header">
            <h3>Emissions Distribution</h3>
          </div>
          <div className="pie-chart-wrapper">
            <TotalEmissionsPie data={pieChartData} />
          </div>
          {totalKg > 0 && (
            <div className="chart-insight">
              <BiTrendingUp />
              <span>
                {scope1Kg > scope2Kg
                  ? `Scope 1 is your largest contributor (${scope1Tonnes.toFixed(1)} tCO₂e)`
                  : scope2Kg > scope1Kg
                  ? `Scope 2 is your largest contributor (${scope2Tonnes.toFixed(1)} tCO₂e)`
                  : "Scope 1 and Scope 2 are equal"}
              </span>
            </div>
          )}
        </Card>
      </div>

      {/* Scope Breakdowns */}
      <div className="breakdown-grid">
        <ScopeBreakdown 
          title="Scope 1 Breakdown" 
          items={scope1Breakdown} 
          totalEmissions={scope1Kg / 1000}
        />
        <ScopeBreakdown 
          title="Scope 2 Breakdown" 
          items={scope2Breakdown} 
          totalEmissions={scope2Kg / 1000}
        />
      </div>

      {/* GHG Protocol Compliance Note */}
      <Card className="compliance-card">
        <div className="compliance-header">
          <FiAward className="compliance-icon" />
          <h3>GHG Protocol Compliance</h3>
        </div>
        <div className="compliance-grid">
          <div className="compliance-item">
            <span className="compliance-check">✓</span>
            <span>Scope 2 reported using location-based method (primary)</span>
          </div>
          <div className="compliance-item">
            <span className="compliance-check">✓</span>
            <span>Market-based Scope 2 reported separately</span>
          </div>
          <div className="compliance-item">
            <span className="compliance-check">✓</span>
            <span>Renewable energy reported separately — not deducted from totals</span>
          </div>
          <div className="compliance-item">
            <span className="compliance-check">✓</span>
            <span>Biogenic emissions flagged and excluded from Scope 1 totals</span>
          </div>
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="activity-card">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          {hasData ? (
            <>
              {scope1Kg > 0 && (
                <div className="activity-item">
                  <div className="activity-icon"><FiTruck /></div>
                  <div className="activity-content">
                    <p><strong>Scope 1 data submitted</strong> — {scope1Tonnes.toFixed(2)} tCO₂e</p>
                    <span className="activity-time">{selectedYear} reporting period</span>
                  </div>
                </div>
              )}
              {scope2Kg > 0 && (
                <div className="activity-item">
                  <div className="activity-icon"><FiZap /></div>
                  <div className="activity-content">
                    <p><strong>Scope 2 data submitted</strong> — {scope2Tonnes.toFixed(2)} tCO₂e (location-based)</p>
                    <span className="activity-time">{selectedYear} reporting period</span>
                  </div>
                </div>
              )}
              {heatingKg > 0 && (
                <div className="activity-item">
                  <div className="activity-icon"><FiThermometer /></div>
                  <div className="activity-content">
                    <p><strong>Heating/Cooling data</strong> — {(heatingKg / 1000).toFixed(2)} tCO₂e</p>
                    <span className="activity-time">Added to location-based total</span>
                  </div>
                </div>
              )}
              {marketBasedKg > 0 && marketBasedKg !== locationBasedKg && (
                <div className="activity-item">
                  <div className="activity-icon"><FiTarget /></div>
                  <div className="activity-content">
                    <p><strong>Market-based reporting active</strong> — {(marketBasedKg / 1000).toFixed(2)} tCO₂e</p>
                    <span className="activity-time">Renewable energy certificates applied</span>
                  </div>
                </div>
              )}
              {renewablesKg > 0 && (
                <div className="activity-item">
                  <div className="activity-icon"><FiSun /></div>
                  <div className="activity-content">
                    <p><strong>Renewable energy generated</strong> — {(renewablesKg / 1000).toFixed(2)} tCO₂e avoided</p>
                    <span className="activity-time">Reported separately per GHG Protocol</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="activity-item">
              <div className="activity-icon"><FiActivity /></div>
              <div className="activity-content">
                <p><strong>No activity yet</strong> — Submit Scope 1 and Scope 2 data to get started</p>
                <span className="activity-time">Awaiting data</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      <style jsx>{`
        .dashboard-container {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .dashboard-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #1B4D3E;
          margin: 0 0 4px;
        }

        .dashboard-header p {
          color: #4A5568;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .year-selector {
          position: relative;
          display: flex;
          align-items: center;
        }

        .year-icon {
          position: absolute;
          left: 14px;
          color: #2E7D64;
          font-size: 16px;
          pointer-events: none;
          z-index: 1;
        }

        .year-dropdown {
          padding: 10px 32px 10px 40px;
          border: 1px solid #E5E7EB;
          border-radius: 30px;
          background: white;
          color: #374151;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          appearance: none;
          transition: all 0.2s ease;
        }

        .year-dropdown:hover {
          border-color: #2E7D64;
          background: #F8FAF8;
        }

        .dropdown-icon {
          position: absolute;
          right: 14px;
          color: #9CA3AF;
          font-size: 14px;
          pointer-events: none;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: 1px solid #E5E7EB;
          border-radius: 30px;
          background: white;
          color: #374151;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .refresh-btn:hover {
          border-color: #2E7D64;
          background: #F8FAF8;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        .kpi-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }

        .kpi-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #E5E7EB;
          transition: all 0.2s ease;
        }

        .kpi-card:hover {
          border-color: #2E7D64;
          transform: translateY(-2px);
        }

        .kpi-card-title {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #1B4D3E;
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 12px;
        }

        .kpi-icon-wrap {
          width: 38px;
          height: 38px;
          background: #F8FAF8;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #E5E7EB;
        }

        .kpi-icon {
          font-size: 18px;
          color: #2E7D64;
        }

        .kpi-value {
          font-size: 32px;
          font-weight: 700;
          color: #1B4D3E;
          line-height: 1.2;
        }

        .kpi-unit {
          font-size: 14px;
          font-weight: 500;
          color: #6B7280;
          margin-left: 4px;
        }

        .kpi-year {
          font-size: 28px;
        }

        .kpi-sub {
          margin-top: 8px;
          font-size: 12px;
          color: #6B7280;
        }

        .total-emissions-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          border: 1px solid #E5E7EB;
          text-align: center;
        }

        .total-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .total-icon {
          width: 48px;
          height: 48px;
          background: #F8FAF8;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: #2E7D64;
          border: 1px solid #E5E7EB;
        }

        .total-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1B4D3E;
          margin: 0 0 4px;
        }

        .total-header p {
          font-size: 13px;
          color: #6B7280;
          margin: 0;
        }

        .total-value {
          font-size: 48px;
          font-weight: 700;
          color: #1B4D3E;
        }

        .total-unit {
          font-size: 18px;
          font-weight: 500;
          color: #6B7280;
        }

        .total-breakdown {
          margin-top: 12px;
          font-size: 13px;
          color: #6B7280;
        }

        .total-breakdown .separator {
          margin: 0 8px;
          color: #E5E7EB;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .chart-card {
          background: white;
          border-radius: 12px;
<<<<<<< Updated upstream
          padding: 10px;
=======
          padding: 20px;
>>>>>>> Stashed changes
          border: 1px solid #E5E7EB;
          overflow: visible;
        }

<<<<<<< Updated upstream
        .chart-card.large {
          min-height: 450px;
=======
        .chart-card.large { 
          min-height: 400px; 
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
>>>>>>> Stashed changes
        }

        .chart-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1B4D3E;
          margin: 0;
        }

        .chart-legend { 
          display: flex; 
          gap: 16px; 
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #4A5568;
        }

        .legend-dot { 
          width: 10px; 
          height: 10px; 
          border-radius: 50%; 
        }
        
        .legend-dot.scope1 { 
          background: #3B82F6; 
        }
        
        .legend-dot.scope2 { 
          background: #F97316; 
        }

<<<<<<< Updated upstream
        .chart-wrapper { height: 350px; width: 100%; }

       .pie-chart-wrapper {
          min-height: 340px;
=======
        .chart-wrapper { 
          height: 300px; 
          width: 100%; 
        }

        .pie-chart-wrapper {
          min-height: 320px;
>>>>>>> Stashed changes
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          overflow: visible;
<<<<<<< Updated upstream
      }
=======
        }
>>>>>>> Stashed changes

        .chart-insight {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          padding: 8px 12px;
          background: #F8FAF8;
          border-radius: 20px;
          font-size: 13px;
          color: #2E7D64;
          border: 1px solid #E5E7EB;
        }

        .breakdown-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .compliance-card {
          background: white;
          border: 1px solid #E5E7EB;
          padding: 20px;
          margin-bottom: 24px;
        }

        .compliance-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }

        .compliance-icon {
          font-size: 20px;
          color: #2E7D64;
        }

        .compliance-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1B4D3E;
          margin: 0;
        }

        .compliance-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .compliance-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #4B5563;
        }

        .compliance-check {
          width: 20px;
          height: 20px;
          background: #D1FAE5;
          color: #065F46;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }

        .activity-card {
          background: white;
          border: 1px solid #E5E7EB;
          padding: 24px;
        }

        .activity-card h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1B4D3E;
          margin: 0 0 16px;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px;
          background: #F9FAFB;
          border-radius: 8px;
          border: 1px solid #E5E7EB;
          transition: all 0.2s ease;
        }

        .activity-item:hover {
          transform: translateX(4px);
          border-color: #2E7D64;
        }

        .activity-icon {
          width: 40px;
          height: 40px;
          background: #F8FAF8;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: #2E7D64;
          border: 1px solid #E5E7EB;
          flex-shrink: 0;
        }

        .activity-content {
          flex: 1;
        }

        .activity-content p {
          margin: 0 0 4px;
          font-size: 14px;
          color: #374151;
        }

        .activity-time {
          font-size: 12px;
          color: #6B7280;
        }

        @media (max-width: 1024px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
          .compliance-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 16px;
          }
          
          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .kpi-row {
            grid-template-columns: 1fr;
          }

          .breakdown-grid {
            grid-template-columns: 1fr;
          }

          .total-value {
            font-size: 32px;
          }
        }
      `}</style>
    </div>
  );
}