// src/pages/DashboardPage.jsx
import React, { useEffect } from "react";
import { 
  FiTrendingUp, 
  FiCalendar, 
  FiDownload,
  FiAlertCircle,
  FiZap,
  FiTarget,
  FiClock,
  FiAward
} from "react-icons/fi";
import { BiLeaf, BiTrendingUp } from "react-icons/bi";
import DashboardMetrics from "../components/dashboard/DashboardMetrics";
import ScopeBreakdown from "../components/dashboard/ScopeBreakdown";
import EmissionsTrendLine from "../components/dashboard/DashboardCharts/EmissionsTrendLine";
import TotalEmissionsPie from "../components/dashboard/DashboardCharts/TotalEmissionsPie";
import { useAuthStore } from "../store/authStore";
import { useEmissionStore } from "../store/emissionStore";
import Card from "../components/ui/Card";

export default function DashboardPage() {
  const token = useAuthStore((s) => s.token);
  const fetchSummary = useEmissionStore((s) => s.fetchSummary);
  const scope1Results = useEmissionStore((s) => s.scope1Results);
  const scope2Results = useEmissionStore((s) => s.scope2Results);

  useEffect(() => {
    if (token) fetchSummary(token);
  }, [token]);

  const scope1Kg = scope1Results?.total?.kgCO2e || 0;
  const scope2Kg = scope2Results?.total?.kgCO2e || 0;
  const totalKg = scope1Kg + scope2Kg;
  const totalTonnes = totalKg / 1000;
  const currentEmissions = totalTonnes;

  const scope1Breakdown = [
    { label: "Mobile Combustion", value: scope1Kg ? Math.round((scope1Results?.mobile?.kgCO2e || 0) / scope1Kg * 100) : 0, color: "bg-blue-500", icon: "🚗" },
    { label: "Stationary", value: scope1Kg ? Math.round((scope1Results?.stationary?.kgCO2e || 0) / scope1Kg * 100) : 0, color: "bg-green-500", icon: "🏭" },
    { label: "Refrigerants", value: scope1Kg ? Math.round((scope1Results?.refrigerants?.kgCO2e || 0) / scope1Kg * 100) : 0, color: "bg-orange-500", icon: "❄️" },
    { label: "Fugitive", value: scope1Kg ? Math.round((scope1Results?.fugitive?.kgCO2e || 0) / scope1Kg * 100) : 0, color: "bg-red-500", icon: "💨" },
  ];

  const scope2Breakdown = [
    { label: "Electricity", value: scope2Kg ? Math.round((scope2Results?.electricity?.kgCO2e || 0) / scope2Kg * 100) : 0, color: "bg-purple-500", icon: "⚡" },
    { label: "Heating/Cooling", value: scope2Kg ? Math.round((scope2Results?.heating?.kgCO2e || 0) / scope2Kg * 100) : 0, color: "bg-yellow-500", icon: "🔥" },
    { label: "Renewables", value: scope2Kg ? Math.round((scope2Results?.renewables?.kgCO2e || 0) / scope2Kg * 100) : 0, color: "bg-green-500", icon: "🌱" },
  ];

  const baseEmissions = 1250;
  const targetReduction = 50;
  const targetYear = 2030;
  const currentYear = 2026;
  const reductionSoFar = baseEmissions > 0 ? ((baseEmissions - currentEmissions) / baseEmissions) * 100 : 0;
  const remainingYears = targetYear - currentYear;
  const requiredAnnualReduction = (targetReduction - reductionSoFar) / remainingYears;

  const milestones = [
    { year: 2025, target: 15, achieved: 12, status: "in-progress" },
    { year: 2026, target: 22, achieved: 0, status: "upcoming" },
    { year: 2027, target: 30, achieved: 0, status: "upcoming" },
    { year: 2028, target: 38, achieved: 0, status: "upcoming" },
    { year: 2029, target: 45, achieved: 0, status: "upcoming" },
    { year: 2030, target: 50, achieved: 0, status: "upcoming" },
  ];

  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <div className="dashboard-header">
        <div>
          <h1>Emissions Dashboard</h1>
          <p>Track your organization's carbon footprint in real-time</p>
        </div>
        <div className="header-actions">
          <button className="date-range-btn">
            <FiCalendar />
            <span>{new Date().getFullYear()} Overview</span>
          </button>
          <button className="export-btn">
            <FiDownload />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Banner */}
      <div className="stats-banner">
        <div className="stat-item">
          <BiLeaf className="stat-icon" />
          <div>
            <span className="stat-label">Total Scope 1</span>
            <span className="stat-value">
              {scope1Kg > 0 ? `${(scope1Kg / 1000).toFixed(2)} tCO₂e` : "—"}
            </span>
          </div>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item">
          <FiTrendingUp className="stat-icon" />
          <div>
            <span className="stat-label">Total Scope 2</span>
            <span className="stat-value">
              {scope2Kg > 0 ? `${(scope2Kg / 1000).toFixed(2)} tCO₂e` : "—"}
            </span>
          </div>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item">
          <FiZap className="stat-icon" />
          <div>
            <span className="stat-label">Combined Total</span>
            <span className="stat-value">
              {totalKg > 0 ? `${totalTonnes.toFixed(2)} tCO₂e` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Dual-Method Scope 2 Stats */}
      {scope2Results?.locationBasedKgCO2e > 0 && (
        <div className="dual-method-banner">
          <div className="method-card location">
            <span className="method-label">📍 Location-Based</span>
            <span className="method-value">{(scope2Results.locationBasedKgCO2e / 1000).toFixed(2)} tCO₂e</span>
          </div>
          <div className="method-card market">
            <span className="method-label">📈 Market-Based</span>
            <span className="method-value">{(scope2Results.marketBasedKgCO2e / 1000).toFixed(2)} tCO₂e</span>
          </div>
        </div>
      )}


      {/* Main Metrics Cards */}
      <DashboardMetrics />

      {/* Progress Tracking Section */}
      <div className="progress-section">
        <Card className="goal-card">
          <div className="goal-header">
            <div className="goal-title">
              <FiTarget className="goal-icon" />
              <div>
                <h3>Science-Based Target</h3>
                <p>Reduction pathway to 2030</p>
              </div>
            </div>
            <div className="goal-badge">
              <FiAward />
              <span>{reductionSoFar >= 0 ? "On Track" : "Off Track"}</span>
            </div>
          </div>

          <div className="goal-visual">
            <div className="goal-stats">
              <div className="goal-stat-item">
                <span className="stat-label">Base Year (2020)</span>
                <span className="stat-value">{baseEmissions} tCO₂e</span>
              </div>
              <div className="goal-stat-item">
                <span className="stat-label">Current</span>
                <span className="stat-value">
                  {currentEmissions > 0 ? `${currentEmissions.toFixed(2)} tCO₂e` : "—"}
                </span>
              </div>
              <div className="goal-stat-item">
                <span className="stat-label">Target ({targetYear})</span>
                <span className="stat-value">{baseEmissions * (1 - targetReduction / 100)} tCO₂e</span>
              </div>
            </div>

            <div className="progress-container">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: "100%" }} />
                <div
                  className="progress-marker"
                  style={{ left: `${Math.min(Math.max((reductionSoFar / targetReduction) * 100, 0), 100)}%` }}
                >
                  <span className="marker-label">{reductionSoFar.toFixed(1)}%</span>
                </div>
              </div>
              <div className="progress-labels">
                <span>0%</span>
                <span className="current-label">Current: {reductionSoFar.toFixed(1)}%</span>
                <span>{targetReduction}%</span>
              </div>
            </div>

            <div className="goal-metrics">
              <div className="metric">
                <span className="metric-value">{reductionSoFar.toFixed(1)}%</span>
                <span className="metric-label">Reduced so far</span>
              </div>
              <div className="metric-divider"></div>
              <div className="metric">
                <span className="metric-value">{Math.max(0, targetReduction - reductionSoFar).toFixed(1)}%</span>
                <span className="metric-label">Remaining</span>
              </div>
              <div className="metric-divider"></div>
              <div className="metric">
                <span className="metric-value">{requiredAnnualReduction.toFixed(1)}%</span>
                <span className="metric-label">Need per year</span>
              </div>
            </div>
          </div>

          <div className="goal-footer">
            <FiAlertCircle className="footer-icon" />
            <div className="footer-text">
              {currentEmissions > 0
                ? <><strong>You're on track!</strong> Current reduction rate exceeds required annual target.</>
                : <><strong>No data yet.</strong> Submit Scope 1 and Scope 2 data to track progress.</>
              }
            </div>
          </div>
        </Card>

        {/* Milestone Timeline */}
        <Card className="milestone-card">
          <div className="milestone-header">
            <FiClock className="milestone-icon" />
            <h3>2030 Milestone Tracker</h3>
          </div>
          <div className="timeline">
            {milestones.map((milestone, index) => (
              <div key={index} className="timeline-item">
                <div className={`timeline-dot ${milestone.status}`}>
                  {milestone.status === "completed" && "✓"}
                </div>
                <div className="timeline-content">
                  <div className="timeline-year">{milestone.year}</div>
                  <div className="timeline-progress">
                    <div className="timeline-bar">
                      <div
                        className={`timeline-fill ${milestone.status}`}
                        style={{ width: `${(milestone.achieved / milestone.target) * 100}%` }}
                      />
                    </div>
                    <div className="timeline-stats">
                      <span className="timeline-target">Target: {milestone.target}%</span>
                      {milestone.achieved > 0 && (
                        <span className="timeline-achieved">{milestone.achieved}% achieved</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

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
            <TotalEmissionsPie />
          </div>
          <div className="chart-insight">
            <BiTrendingUp />
            <span>
              {scope1Kg > scope2Kg && scope1Kg > 0
                ? "Scope 1 is your largest contributor"
                : scope2Kg > scope1Kg
                ? "Scope 2 is your largest contributor"
                : totalKg > 0
                ? "Scope 1 and 2 are equal"
                : "Submit data to see distribution"}
            </span>
          </div>
        </Card>
      </div>

      {/* Scope Breakdowns */}
      <div className="breakdown-grid">
        <ScopeBreakdown title="Scope 1 Breakdown" items={scope1Breakdown} />
        <ScopeBreakdown title="Scope 2 Breakdown" items={scope2Breakdown} />
      </div>

      {/* Recent Activity */}
      <Card className="activity-card">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          {scope1Kg > 0 && (
            <div className="activity-item">
              <div className="activity-icon">🏭</div>
              <div className="activity-content">
                <p><strong>Scope 1 data submitted</strong> — {(scope1Kg / 1000).toFixed(2)} tCO₂e</p>
                <span className="activity-time">{new Date().getFullYear()} reporting period</span>
              </div>
            </div>
          )}
          {scope2Kg > 0 && (
            <div className="activity-item">
              <div className="activity-icon">⚡</div>
              <div className="activity-content">
                <p><strong>Scope 2 data submitted</strong> — {(scope2Kg / 1000).toFixed(2)} tCO₂e</p>
                <span className="activity-time">{new Date().getFullYear()} reporting period</span>
              </div>
            </div>
          )}
          {totalKg === 0 && (
            <div className="activity-item">
              <div className="activity-icon">📋</div>
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
          color: #14532D;
          margin: 0 0 4px;
        }

        .dashboard-header p {
          color: #4B5563;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .date-range-btn, .export-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 30px;
          background: white;
          color: #374151;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .date-range-btn:hover, .export-btn:hover {
          border-color: #22C55E;
          background: #F0FDF4;
        }

        .stats-banner {
          display: flex;
          align-items: center;
          justify-content: space-around;
          background: white;
          border-radius: 20px;
          padding: 20px 24px;
          margin-bottom: 24px;
          border: 1px solid rgba(34, 197, 94, 0.2);
          box-shadow: 0 4px 12px rgba(0,40,0,0.05);
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .stat-icon {
          font-size: 28px;
          color: #22C55E;
        }

        .stat-label {
          display: block;
          font-size: 12px;
          color: #6B7280;
          margin-bottom: 4px;
        }

        .stat-value {
          display: block;
          font-size: 18px;
          font-weight: 600;
          color: #14532D;
        }

        .stat-divider {
          width: 1px;
          height: 40px;
          background: rgba(34, 197, 94, 0.2);
        }


        .dual-method-banner {
          display: flex;
          gap: 16px;
          margin: 16px 0 24px;
          padding: 16px;
          background: white;
          border-radius: 16px;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .method-card {
          flex: 1;
          padding: 16px;
          border-radius: 12px;
          text-align: center;
        }

        .method-card.location {
          background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
          border: 1px solid #3B82F6;
        }

        .method-card.market {
          background: linear-gradient(135deg, #F3E8FF 0%, #EDE9FE 100%);
          border: 1px solid #8B5CF6;
        }

        .method-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 8px;
          color: #374151;
        }

        .method-value {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: #1F2937;
        }

        .progress-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }

        .goal-card {
          background: linear-gradient(135deg, #14532D 0%, #166534 100%);
          color: white;
          padding: 24px;
          border: none;
        }

        .goal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .goal-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .goal-icon {
          font-size: 28px;
          color: rgba(255,255,255,0.9);
        }

        .goal-title h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 4px;
        }

        .goal-title p {
          font-size: 13px;
          opacity: 0.8;
          margin: 0;
        }

        .goal-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(255,255,255,0.15);
          border-radius: 30px;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .goal-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
          padding: 16px;
          background: rgba(255,255,255,0.1);
          border-radius: 16px;
        }

        .goal-stat-item {
          text-align: center;
        }

        .goal-stat-item .stat-label {
          font-size: 11px;
          opacity: 0.7;
          margin-bottom: 4px;
        }

        .goal-stat-item .stat-value {
          font-size: 16px;
          font-weight: 600;
        }

        .progress-container {
          margin-bottom: 24px;
          position: relative;
        }

        .progress-track {
          height: 12px;
          background: rgba(255,255,255,0.2);
          border-radius: 6px;
          position: relative;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4ADE80, #22C55E);
          border-radius: 6px;
          transition: width 0.3s ease;
        }

        .progress-marker {
          position: absolute;
          top: -20px;
          transform: translateX(-50%);
          background: white;
          color: #14532D;
          padding: 4px 8px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .progress-marker::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid white;
        }

        .progress-labels {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          opacity: 0.7;
        }

        .current-label {
          color: #4ADE80;
          font-weight: 500;
        }

        .goal-metrics {
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 16px;
          background: rgba(0,0,0,0.2);
          border-radius: 16px;
        }

        .metric {
          text-align: center;
        }

        .metric-value {
          display: block;
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .metric-label {
          font-size: 11px;
          opacity: 0.7;
        }

        .metric-divider {
          width: 1px;
          height: 30px;
          background: rgba(255,255,255,0.2);
        }

        .goal-footer {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
          padding: 12px 16px;
          background: rgba(0,0,0,0.2);
          border-radius: 12px;
          font-size: 13px;
        }

        .footer-icon {
          color: #4ADE80;
          font-size: 18px;
          flex-shrink: 0;
        }

        .milestone-card {
          background: white;
          padding: 24px;
          border: 1px solid rgba(34, 197, 94, 0.15);
        }

        .milestone-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
        }

        .milestone-icon {
          font-size: 24px;
          color: #22C55E;
        }

        .milestone-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #14532D;
          margin: 0;
        }

        .timeline {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .timeline-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .timeline-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #F3F4F6;
          border: 2px solid #E5E7EB;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: white;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .timeline-dot.completed { background: #22C55E; border-color: #22C55E; }
        .timeline-dot.in-progress { background: #F59E0B; border-color: #F59E0B; animation: pulse 2s infinite; }
        .timeline-dot.upcoming { background: white; border-color: #E5E7EB; }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .timeline-content { flex: 1; }

        .timeline-year {
          font-weight: 600;
          color: #14532D;
          margin-bottom: 6px;
        }

        .timeline-progress {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .timeline-bar {
          flex: 1;
          height: 6px;
          background: #E5E7EB;
          border-radius: 3px;
          overflow: hidden;
        }

        .timeline-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .timeline-fill.completed { background: #22C55E; }
        .timeline-fill.in-progress { background: #F59E0B; }

        .timeline-stats {
          min-width: 120px;
          font-size: 12px;
        }

        .timeline-target { color: #6B7280; margin-right: 8px; }
        .timeline-achieved { color: #22C55E; font-weight: 500; }

        .charts-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .chart-card {
          background: white;
          border-radius: 20px;
          padding: 20px;
          border: 1px solid rgba(34, 197, 94, 0.1);
        }

        .chart-card.large { min-height: 400px; }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .chart-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #14532D;
          margin: 0;
        }

        .chart-legend { display: flex; gap: 16px; }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #4B5563;
        }

        .legend-dot { width: 10px; height: 10px; border-radius: 50%; }
        .legend-dot.scope1 { background: #0088FE; }
        .legend-dot.scope2 { background: #FF8042; }

        .chart-wrapper { height: 300px; width: 100%; }

        .pie-chart-wrapper {
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chart-insight {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding: 8px 12px;
          background: #F0FDF4;
          border-radius: 30px;
          font-size: 13px;
          color: #15803D;
        }

        .breakdown-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .activity-card {
          background: white;
          border: 1px solid rgba(34, 197, 94, 0.1);
        }

        .activity-card h3 {
          font-size: 16px;
          font-weight: 600;
          color: #14532D;
          margin: 0 0 16px;
        }

        .activity-list { display: flex; flex-direction: column; gap: 12px; }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px;
          background: #F9FAFB;
          border-radius: 12px;
          border: 1px solid rgba(34, 197, 94, 0.1);
          transition: all 0.2s ease;
        }

        .activity-item:hover { transform: translateX(4px); background: #F0FDF4; }

        .activity-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #22C55E20, #15803D20);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .activity-content { flex: 1; }

        .activity-content p {
          margin: 0 0 4px;
          font-size: 14px;
          color: #374151;
        }

        .activity-time { font-size: 12px; color: #6B7280; }

        @media (max-width: 1024px) {
          .progress-section, .charts-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 768px) {
          .dashboard-header { flex-direction: column; align-items: flex-start; }
          .stats-banner { flex-direction: column; gap: 16px; }
          .stat-divider { width: 80%; height: 1px; }
          .goal-stats { grid-template-columns: 1fr; gap: 12px; }
          .goal-metrics { flex-direction: column; gap: 12px; }
          .metric-divider { width: 80%; height: 1px; }
          .breakdown-grid { grid-template-columns: 1fr; }
          .timeline-progress { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}