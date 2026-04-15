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
  FiRefreshCw,
  FiTrendingUp
} from "react-icons/fi";
import { BiLeaf, BiTrendingUp } from "react-icons/bi";
import { useNavigate } from "react-router-dom";
import ScopeBreakdown from "../components/dashboard/ScopeBreakdown";
import TotalEmissionsPie from "../components/dashboard/DashboardCharts/TotalEmissionsPie";
import StackedCategoryChart from "../components/dashboard/DashboardCharts/StackedCategoryChart";
import DataCompletenessCalendar from "../components/dashboard/DataCompletenessCalendar";
import { useAuthStore } from "../store/authStore";
import { useEmissionStore } from "../store/emissionStore";
import { useCompanyStore } from "../store/companyStore";
import Card from "../components/ui/Card";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  const token = useAuthStore((s) => s.token);
  const fetchSummary = useEmissionStore((s) => s.fetchSummary);
  const scope1Results = useEmissionStore((s) => s.scope1Results);
  const scope2Results = useEmissionStore((s) => s.scope2Results);
  const company = useCompanyStore((s) => s.company);
  const fetchCompany = useCompanyStore((s) => s.fetchCompany);
  const targets = useCompanyStore((s) => s.targets);

  // Initial data load on mount and when token changes
  useEffect(() => {
    const loadInitialData = async () => {
      if (token && !initialLoadDone) {
        console.log("Initial data load starting...");
        
        // Force fetch company data
        await fetchCompany(token, { force: true });
        await fetchDirectTargets();
        
        // Fetch emission summary
        await fetchSummary(token, selectedYear);
        
        setInitialLoadDone(true);
        console.log("Initial data load complete");
      }
    };
    
    loadInitialData();
  }, [token, fetchCompany, fetchSummary, selectedYear, initialLoadDone]);

  // Fetch data when year changes
  useEffect(() => {
    if (token && initialLoadDone) {
      console.log("Year changed, fetching summary for:", selectedYear);
      fetchSummary(token, selectedYear);
    }
  }, [token, fetchSummary, selectedYear, initialLoadDone]);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i <= 5; i++) {
      years.push(currentYear - i);
    }
    setAvailableYears(years);
  }, []);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

  const [yoyTrend, setYoyTrend] = useState(null);
  const [predictionTargetKg, setPredictionTargetKg] = useState(null);
  const [monthsSubmitted, setMonthsSubmitted] = useState(0);
  const [projectedYearEndT, setProjectedYearEndT] = useState(null);
  const [predictionConfidence, setPredictionConfidence] = useState({ score: null, label: "N/A" });
  const [directTargets, setDirectTargets] = useState(null);
  const [monthlySeries, setMonthlySeries] = useState([]);
  const [predictionLoading, setPredictionLoading] = useState(false);

  const fetchDirectTargets = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/companies/targets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch targets");
      const data = await response.json();
      setDirectTargets(data?.targets || null);
    } catch (error) {
      console.error("Direct target fetch failed:", error);
      setDirectTargets(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCompany(token, { force: true });
    await fetchDirectTargets();
    await fetchSummary(token, selectedYear);
    setTimeout(() => setRefreshing(false), 500);
  };

  useEffect(() => {
    fetchDirectTargets();
  }, [token]);

  useEffect(() => {
    const loadPredictionMetrics = async () => {
      if (!token) return;
      setPredictionLoading(true);

      try {
        const response = await fetch(`${API_URL}/api/predictions?year=${selectedYear}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.detail || "Failed to load prediction metrics.");
        }

        const apiMonths = payload?.data_availability?.total_months || 0;
        const currentYearMonths = payload?.data_availability?.months_in_current_year || 0;
        const hasData = (scope1Results?.total?.kgCO2e > 0) || (scope2Results?.total?.kgCO2e > 0);
        const actualMonths = apiMonths > 0 ? apiMonths : (hasData ? 1 : 0);
        
        setMonthsSubmitted(actualMonths);

        const yoyData = payload?.predictions?.yoy_trend?.data;
        setYoyTrend(yoyData && typeof yoyData.avg_yoy_change_pct === "number" ? yoyData : null);

        const onTrackData = payload?.predictions?.on_track_analysis?.data;
        const trajectoryData = payload?.predictions?.target_trajectory?.data;
        const yearEndData = payload?.predictions?.year_end_projection?.data;
        const targetFromDataAvailability = payload?.data_availability?.target_total_kg;
        
        const targetKg = onTrackData?.this_year_target_kg || 
                         trajectoryData?.target_total_kg || 
                         targetFromDataAvailability || 
                         null;
        
        setPredictionTargetKg(targetKg);
        setProjectedYearEndT(yearEndData?.projected_annual_t || null);
        setMonthlySeries(payload?.series?.monthly || []);

        const monthsForConfidence = Math.max(currentYearMonths, actualMonths);
        if (monthsForConfidence > 0) {
          const score = Math.min(95, Math.max(10, Math.round((monthsForConfidence / 12) * 100)));
          const label = score < 40 ? "Low" : score < 75 ? "Medium" : "High";
          setPredictionConfidence({ score, label });
        } else {
          setPredictionConfidence({ score: null, label: "N/A" });
        }
        
      } catch (error) {
        console.error("Predictions error:", error);
        setYoyTrend(null);
        setPredictionTargetKg(null);
        setMonthsSubmitted(scope1Results?.total?.kgCO2e > 0 ? 1 : 0);
        setProjectedYearEndT(null);
        setPredictionConfidence({ score: null, label: "N/A" });
        setMonthlySeries([]);
      } finally {
        setPredictionLoading(false);
      }
    };

    loadPredictionMetrics();
  }, [token, selectedYear, API_URL, scope1Results]);

  // CORRECTED DATA MAPPING
  const scope1Kg = scope1Results?.total?.kgCO2e || 0;
  const scope2Kg = scope2Results?.locationBasedKgCO2e || 0;
  const totalKg = scope1Kg + scope2Kg;
  const totalTonnes = totalKg / 1000;
  
  // Target logic: use explicit annual target first, otherwise derive from configured reduction target.
  const configuredTargets = directTargets || targets || company?.targets || null;
  const rawCompanyTarget = configuredTargets?.annualTargetT ?? null;
  const parsedCompanyTarget = Number(rawCompanyTarget);
  const hasAnnualTarget = Number.isFinite(parsedCompanyTarget) && parsedCompanyTarget > 0;
  const hasConfiguredTarget = Boolean(configuredTargets?.reductionPct || hasAnnualTarget);
  const predictionTargetT = predictionTargetKg ? (predictionTargetKg / 1000) : null;
  const targetT = hasAnnualTarget ? parsedCompanyTarget : predictionTargetT;
  const budgetUsedPct = targetT > 0 ? (totalTonnes / targetT) * 100 : null;
  const targetProgressPct = targetT > 0 ? ((targetT - totalTonnes) / targetT) * 100 : null;
  const progressBarPct = targetProgressPct != null ? Math.min(Math.abs(targetProgressPct), 100) : 0;
  const isNegativeProgress = targetProgressPct != null && targetProgressPct < 0;
  const annualBudgetT = targetT || 0;
  const quarterlyMilestoneT = annualBudgetT > 0 ? annualBudgetT / 4 : 0;
  const monthlyMilestoneT = annualBudgetT > 0 ? annualBudgetT / 12 : 0;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyActualT = monthNames.map((_, idx) => {
    const monthKey = `${selectedYear}-${String(idx + 1).padStart(2, "0")}`;
    const point = monthlySeries.find((m) => String(m.month).slice(0, 7) === monthKey);
    return (Number(point?.total_kg || 0) / 1000);
  });
  const quarterRanges = [
    { key: "Q1", months: [0, 1, 2] },
    { key: "Q2", months: [3, 4, 5] },
    { key: "Q3", months: [6, 7, 8] },
    { key: "Q4", months: [9, 10, 11] },
  ];
  const getRag = (actual, milestone) => {
    if (!milestone || milestone <= 0) return "na";
    const ratio = actual / milestone;
    if (ratio <= 1.0) return "green";
    if (ratio <= 1.1) return "amber";
    return "red";
  };
  const quarterData = quarterRanges.map((q) => {
    const actual = q.months.reduce((sum, m) => sum + monthlyActualT[m], 0);
    const progressPct = quarterlyMilestoneT > 0 ? Math.min((actual / quarterlyMilestoneT) * 100, 100) : 0;
    return {
      ...q,
      actual,
      progressPct,
      rag: getRag(actual, quarterlyMilestoneT),
    };
  });
  
  // Determine status based on budget used
  const getBudgetStatus = () => {
    if (budgetUsedPct === null) return "no-target";
    if (budgetUsedPct <= 100) return "on-track";
    if (budgetUsedPct <= 115) return "at-risk";
    return "off-track";
  };
  
  const budgetStatus = getBudgetStatus();
  
  const getStatusColor = () => {
    switch (budgetStatus) {
      case "on-track": return { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" };
      case "at-risk": return { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" };
      case "off-track": return { bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444" };
      default: return { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" };
    }
  };
  
  const statusColors = getStatusColor();

  const scope1Tonnes = scope1Kg / 1000;
  const scope2Tonnes = scope2Kg / 1000;

  const electricityLocationKg = scope2Results?.electricity?.locationBasedKgCO2e || 0;
  const electricityMarketKg = scope2Results?.electricity?.marketBasedKgCO2e || 0;
  const heatingKg = scope2Results?.heating?.kgCO2e || 0;
  const renewablesKg = scope2Results?.renewables?.kgCO2e || 0;
  
  const locationBasedKg = scope2Kg;
  const marketBasedKg = scope2Results?.marketBasedKgCO2e || 0;

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

  const pieChartData = [
    { name: "Scope 1", value: scope1Kg / 1000, color: "#3B82F6" },
    { name: "Scope 2", value: scope2Kg / 1000, color: "#F97316" },
  ];

  const hasData = totalKg > 0;
  
  // Tooltip text for budget card
  const getTooltipText = () => {
    if (!targetT) return "Set an annual target to track your budget";
    if (projectedYearEndT) {
      return `At this rate you will emit ${projectedYearEndT.toFixed(1)} tCO₂e by December — your target is ${targetT.toFixed(1)} tCO₂e`;
    }
    return `Target: ${targetT.toFixed(1)} tCO₂e. Submit more data for projections.`;
  };

  // Debug logging
  useEffect(() => {
    console.log("Dashboard state:", {
      hasTarget: !!targetT,
      targetT,
      budgetUsedPct,
      monthsWithData: scope1Results?.monthsCount,
      companyExists: !!company,
      targetsExist: !!targets
    });
  }, [targetT, budgetUsedPct, scope1Results, company, targets]);

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

      <Card className="target-breakdown-card">
        <div className="target-breakdown-header">
          <h3>Target Period Breakdown</h3>
          <p>Quarterly and monthly milestones derived from annual budget</p>
        </div>
        {!annualBudgetT ? (
          <div className="target-breakdown-empty">
            <span>Set a target to view period milestones.</span>
            <button onClick={() => navigate('/target-settings')} className="set-target-btn-inline">Set Target</button>
          </div>
        ) : (
          <>
            <div className="milestone-meta">
              <span>Quarterly Milestone: <strong>{quarterlyMilestoneT.toFixed(1)} tCO₂e</strong></span>
              <span>Monthly Milestone: <strong>{monthlyMilestoneT.toFixed(1)} tCO₂e</strong></span>
            </div>
            <div className="quarter-grid">
              {quarterData.map((q) => (
                <div key={q.key} className="quarter-card">
                  <div className="quarter-top">
                    <span>{q.key}</span>
                    <span className={`rag-chip ${q.rag}`}>
                      {q.rag === "green" ? "On Track" : q.rag === "amber" ? "At Risk" : "Off Track"}
                    </span>
                  </div>
                  <div className="quarter-bar">
                    <div className={`quarter-fill ${q.rag}`} style={{ width: `${q.progressPct}%` }} />
                  </div>
                  <div className="quarter-values">{q.actual.toFixed(1)} / {quarterlyMilestoneT.toFixed(1)} tCO₂e</div>
                </div>
              ))}
            </div>
            <div className="month-grid">
              {monthNames.map((m, idx) => {
                const actual = monthlyActualT[idx];
                const rag = getRag(actual, monthlyMilestoneT);
                return (
                  <div key={m} className={`month-cell ${rag}`}>
                    <div className="month-name">{m}</div>
                    <div className="month-value">{actual.toFixed(1)} t</div>
                    <div className="month-target">/{monthlyMilestoneT.toFixed(1)} t</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Summary KPI Strip */}
      <div className="summary-strip">
        {/* Card 1: Total Scope 1 + 2 */}
        <div className="kpi-card">
          <div className="kpi-card-title">
            <span className="kpi-icon-wrap">
              <BiLeaf className="kpi-icon" />
            </span>
            <span>Total Scope 1 + 2</span>
          </div>
          <div className="kpi-value">
            {hasData ? totalTonnes.toFixed(2) : "—"}
            <span className="kpi-unit"> tCO₂e</span>
          </div>
          <div className="kpi-sub">Combined emissions for {selectedYear}</div>
        </div>

        {/* Card 2: YoY Change */}
        <div className="kpi-card">
          <div className="kpi-card-title">
            <span className="kpi-icon-wrap">
              <FiTrendingUp className="kpi-icon" />
            </span>
            <span>YoY Change</span>
          </div>
          <div className={`yoy-value ${yoyTrend?.direction === 'decreasing' ? 'yoy-good' : 'yoy-bad'}`}>
            {yoyTrend
              ? `${yoyTrend.direction === 'decreasing' ? '↓' : '↑'} ${Math.abs(yoyTrend.avg_yoy_change_pct).toFixed(1)}%`
              : 'N/A'}
          </div>
          <div className="kpi-sub">
            {yoyTrend
              ? (yoyTrend.direction === 'decreasing'
                  ? 'Emissions down from prior year'
                  : 'Emissions up from prior year')
              : 'No year-on-year data yet'}
          </div>
        </div>

        {/* Card 3: Carbon Budget */}
        <div className="kpi-card budget-card">
          <div className="kpi-card-title">
            <span className="kpi-icon-wrap">
              <FiTarget className="kpi-icon" />
            </span>
            <span>Carbon Budget</span>
          </div>
          
          {/* Budget Percentage with Tooltip */}
          <div className="tooltip-container">
            <div className="kpi-value">
              {targetProgressPct != null ? `${targetProgressPct.toFixed(0)}%` : 'N/A'}
            </div>
            <div className="tooltip-text">{getTooltipText()}</div>
          </div>
          
          {/* Progress Bar */}
          <div className="budget-progress-bar">
            <div
              className={`budget-progress-fill ${isNegativeProgress ? "negative" : "positive"}`}
              style={{ width: `${progressBarPct}%` }}
            />
          </div>
          
          {/* Projected Year-End Total */}
          <div className="projected-section">
            <div className="projected-label">
              <FiTrendingUp size={12} />
              <span>Projected year-end total based on current monthly run rate.</span>
            </div>
            <div className="projected-value">
              {projectedYearEndT ? `${projectedYearEndT.toFixed(1)} tCO₂e` : '—'}
            </div>
            <div className="projected-confidence">
              Confidence: {predictionConfidence.score != null
                ? `${predictionConfidence.label} (${predictionConfidence.score}%)`
                : "N/A"}
            </div>
          </div>
          
          {/* Status Indicator */}
          <div className={`status-indicator ${budgetStatus}`} style={{ background: statusColors.bg, color: statusColors.text }}>
            <span className="status-dot" style={{ background: statusColors.dot }}></span>
            <span className="status-text">
              {budgetStatus === "on-track" && "On Track"}
              {budgetStatus === "at-risk" && "At Risk"}
              {budgetStatus === "off-track" && "Off Track"}
              {budgetStatus === "no-target" && "No Target Set"}
            </span>
          </div>
          
          {/* Target Display with Set Target Link */}
          <div className="kpi-sub">
            {hasConfiguredTarget ? (
              targetT ? `of ${targetT.toFixed(1)} t target` : "Target configured"
            ) : (
              <button 
                onClick={() => navigate('/target-settings')}
                className="set-target-btn"
              >
                Set Target
              </button>
            )}
          </div>
        </div>

        {/* Card 4: Months with Data */}
        <div className="kpi-card">
          <div className="kpi-card-title">
            <span className="kpi-icon-wrap">
              <FiCalendar className="kpi-icon" />
            </span>
            <span>Months with Data</span>
          </div>
          <div className="kpi-value">
            {scope1Results?.monthsCount || scope2Results?.monthsCount || monthsSubmitted || 0}
            <span className="kpi-unit"> months</span>
          </div>
          <div className="kpi-sub">
            {(scope1Results?.monthsCount || monthsSubmitted) === 12 ? "Full year complete" : `${12 - ((scope1Results?.monthsCount || monthsSubmitted) || 0)} months remaining`}
          </div>
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

      {/* Data Completeness Calendar */}
      <div className="calendar-section">
        <DataCompletenessCalendar year={selectedYear} />
      </div>

      {/* Charts Grid - Updated with Stacked Category Chart */}
      <div className="charts-grid">
        <Card className="chart-card large">
          <div className="chart-header">
            <h3>Monthly Emissions by Category</h3>
          </div>
          <div className="chart-wrapper">
            <StackedCategoryChart year={selectedYear} />
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

        .summary-strip {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
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

        .kpi-sub {
          margin-top: 8px;
          font-size: 12px;
          color: #6B7280;
        }

        .yoy-value {
          font-size: 32px;
          font-weight: 700;
          margin: 12px 0 8px;
        }

        .yoy-good {
          color: #047857;
        }

        .yoy-bad {
          color: #B91C1C;
        }

        .budget-progress-bar {
          width: 100%;
          height: 10px;
          background: #E5E7EB;
          border-radius: 999px;
          overflow: hidden;
          margin: 12px 0 10px;
        }

        .budget-progress-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.35s ease;
        }
        .budget-progress-fill.positive {
          background: #2E7D64;
        }
        .budget-progress-fill.negative {
          background: #DC2626;
        }

        .projected-section {
          margin: 12px 0 8px;
          padding: 8px 0;
          border-top: 1px solid #E5E7EB;
          border-bottom: 1px solid #E5E7EB;
        }

        .projected-label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #6B7280;
          margin-bottom: 4px;
        }

        .projected-value {
          font-size: 16px;
          font-weight: 700;
          color: #1B4D3E;
        }
        .projected-confidence {
          margin-top: 4px;
          font-size: 11px;
          color: #6B7280;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 8px 0;
          padding: 4px 8px;
          border-radius: 20px;
          width: fit-content;
          font-size: 12px;
          font-weight: 600;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .tooltip-container {
          position: relative;
          display: inline-block;
          cursor: help;
        }

        .tooltip-text {
          visibility: hidden;
          background-color: #1F2937;
          color: white;
          text-align: center;
          border-radius: 6px;
          padding: 6px 10px;
          position: absolute;
          z-index: 1;
          bottom: 125%;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          font-size: 12px;
          font-weight: normal;
        }

        .tooltip-container:hover .tooltip-text {
          visibility: visible;
        }

        .set-target-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          padding: 6px 12px;
          border: 1px solid #1B4D3E;
          border-radius: 7px;
          background: #1B4D3E;
          color: #FFFFFF;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .set-target-btn:hover {
          background: #2E7D64;
          border-color: #2E7D64;
        }

        .calendar-section {
          margin-bottom: 24px;
        }
        .target-breakdown-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .target-breakdown-header h3 {
          margin: 0 0 6px 0;
          font-size: 18px;
          color: #1B4D3E;
        }
        .target-breakdown-header p {
          margin: 0 0 14px 0;
          font-size: 13px;
          color: #6B7280;
        }
        .target-breakdown-empty {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 12px;
          font-size: 13px;
          color: #6B7280;
        }
        .set-target-btn-inline {
          border: 1px solid #1B4D3E;
          background: #1B4D3E;
          color: #fff;
          border-radius: 7px;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
        }
        .set-target-btn-inline:hover { background: #2E7D64; border-color: #2E7D64; }
        .milestone-meta {
          display: flex;
          gap: 18px;
          flex-wrap: wrap;
          margin-bottom: 14px;
          font-size: 13px;
          color: #4B5563;
        }
        .quarter-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }
        .quarter-card {
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          padding: 10px;
          background: #FBFCFD;
        }
        .quarter-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }
        .quarter-bar {
          height: 8px;
          background: #E5E7EB;
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 6px;
        }
        .quarter-fill { height: 100%; }
        .quarter-fill.green { background: #10B981; }
        .quarter-fill.amber { background: #F59E0B; }
        .quarter-fill.red { background: #EF4444; }
        .quarter-values {
          font-size: 11px;
          color: #6B7280;
        }
        .rag-chip {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 999px;
        }
        .rag-chip.green { background: #D1FAE5; color: #065F46; }
        .rag-chip.amber { background: #FEF3C7; color: #92400E; }
        .rag-chip.red { background: #FEE2E2; color: #991B1B; }
        .month-grid {
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr));
          gap: 8px;
        }
        .month-cell {
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 8px 6px;
          text-align: center;
          background: #fff;
        }
        .month-cell.green { border-color: #86EFAC; background: #F0FDF4; }
        .month-cell.amber { border-color: #FCD34D; background: #FFFBEB; }
        .month-cell.red { border-color: #FCA5A5; background: #FEF2F2; }
        .month-name { font-size: 11px; font-weight: 600; color: #374151; }
        .month-value { font-size: 11px; color: #1F2937; margin-top: 3px; }
        .month-target { font-size: 10px; color: #6B7280; }

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
          padding: 20px;
          border: 1px solid #E5E7EB;
          overflow: visible;
        }

        .chart-card.large { 
          min-height: 450px; 
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .chart-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1B4D3E;
          margin: 0;
        }

        .chart-wrapper { 
          height: 350px; 
          width: 100%; 
        }

        .pie-chart-wrapper {
          min-height: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          overflow: visible;
        }

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
          .quarter-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .month-grid {
            grid-template-columns: repeat(6, minmax(0, 1fr));
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

          .summary-strip {
            grid-template-columns: 1fr;
          }

          .breakdown-grid {
            grid-template-columns: 1fr;
          }
          .month-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .total-value {
            font-size: 32px;
          }
        }
      `}</style>
    </div>
  );
}