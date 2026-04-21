// src/pages/DashboardPage.jsx
import React, { useEffect, useState, useMemo } from "react";
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
import { useSelectedLocationStore } from "../store/selectedLocationStore";
import { appendLocationQuery } from "../utils/locationQuery";
import FacilityCitySelect from "../components/location/FacilityCitySelect";
import Card from "../components/ui/Card";
import ThemedSelect from "../components/ui/ThemedSelect";
import WhatIfScenarioBuilder from "../components/dashboard/WhatIfScenarioBuilder";
import SeasonalPatternCard from "../components/dashboard/SeasonalPatternCard";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
} from "recharts";

const FISCAL_YEAR_START_MONTH = 6;
const getCurrentFiscalStartYear = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  return month >= FISCAL_YEAR_START_MONTH ? now.getFullYear() : now.getFullYear() - 1;
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(getCurrentFiscalStartYear());
  const [activeView, setActiveView] = useState("overview");
  const [expandedSections, setExpandedSections] = useState({
    targetPeriod: false,
    progressTarget: true,
    pathway: false,
    scope2Delta: true,
    scope2Sparkline: false,
    sourceInsight: false,
  });
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
  const locationKey = useSelectedLocationStore((s) => s.locationKey);
  const syncFromCompany = useSelectedLocationStore((s) => s.syncFromCompany);
  const selectedFacility = useMemo(
    () => useSelectedLocationStore.getState().getSelectedLocation(company),
    [company, locationKey]
  );

  // Initial data load on mount and when token changes
  useEffect(() => {
    const loadInitialData = async () => {
      if (token && !initialLoadDone) {
        console.log("Initial data load starting...");
        
        // Force fetch company data
        await fetchCompany(token, { force: true });
        useSelectedLocationStore.getState().syncFromCompany(useCompanyStore.getState().company);
        await fetchDirectTargets();
        
        // Fetch emission summary
        await fetchSummary(token, selectedYear);
        
        setInitialLoadDone(true);
        console.log("Initial data load complete");
      }
    };
    
    loadInitialData();
  }, [token, fetchCompany, fetchSummary, selectedYear, initialLoadDone]);

  useEffect(() => {
    if (company) syncFromCompany(company);
  }, [company, syncFromCompany]);

  // Fetch data when year or selected facility changes
  useEffect(() => {
    if (token && initialLoadDone) {
      console.log("Year changed, fetching summary for:", selectedYear);
      fetchSummary(token, selectedYear);
    }
  }, [token, fetchSummary, selectedYear, initialLoadDone, locationKey]);

  useEffect(() => {
    const now = new Date();
    const currentFiscalStartYear = now.getMonth() + 1 >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    const years = [];
    for (let i = 0; i <= 5; i++) {
      years.push(currentFiscalStartYear - i);
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
  const [annualSeries, setAnnualSeries] = useState([]);
  const [trajectorySeries, setTrajectorySeries] = useState([]);
  const [pathwayMeta, setPathwayMeta] = useState({ baseYear: null, targetYear: null });
  const [scope1MonthlyBreakdown, setScope1MonthlyBreakdown] = useState([]);
  const [scope2MonthlyBreakdown, setScope2MonthlyBreakdown] = useState([]);
  const [aiTopSourceRecommendation, setAiTopSourceRecommendation] = useState("");
  const [aiRecommendationLoading, setAiRecommendationLoading] = useState(false);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
    useSelectedLocationStore.getState().syncFromCompany(useCompanyStore.getState().company);
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
        const targetTrajectory = payload?.predictions?.target_trajectory?.data || [];
        const targetFromDataAvailability = payload?.data_availability?.target_total_kg;
        
        const targetKg = onTrackData?.this_year_target_kg || 
                         trajectoryData?.target_total_kg || 
                         targetFromDataAvailability || 
                         null;
        
        setPredictionTargetKg(targetKg);
        setProjectedYearEndT(yearEndData?.projected_annual_t || null);
        setMonthlySeries(payload?.series?.monthly || []);
        setAnnualSeries(payload?.series?.annual || []);
        setTrajectorySeries(targetTrajectory);
        setPathwayMeta({
          baseYear: payload?.meta?.base_year || null,
          targetYear: payload?.meta?.target_year || null,
        });

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
        setAnnualSeries([]);
        setTrajectorySeries([]);
        setPathwayMeta({ baseYear: null, targetYear: null });
      } finally {
        setPredictionLoading(false);
      }
    };

    loadPredictionMetrics();
  }, [token, selectedYear, API_URL, scope1Results]);

  useEffect(() => {
    const loadScope1MonthlyBreakdown = async () => {
      if (!token) return;
      try {
        let url1 = `${API_URL}/api/emissions/monthly-category-breakdown?year=${selectedYear}&scope=scope1`;
        if (selectedFacility?.country && selectedFacility?.city) {
          url1 = appendLocationQuery(url1, selectedFacility.country, selectedFacility.city);
        }
        const response = await fetch(url1, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch scope1 monthly breakdown");
        }
        const payload = await response.json();
        setScope1MonthlyBreakdown(Array.isArray(payload) ? payload : []);
      } catch (error) {
        console.error("Scope1 monthly breakdown error:", error);
        setScope1MonthlyBreakdown([]);
      }
    };

    loadScope1MonthlyBreakdown();
  }, [token, selectedYear, API_URL, selectedFacility]);

  useEffect(() => {
    const loadScope2MonthlyBreakdown = async () => {
      if (!token) return;
      try {
        let url2 = `${API_URL}/api/emissions/monthly-category-breakdown?year=${selectedYear}&scope=scope2`;
        if (selectedFacility?.country && selectedFacility?.city) {
          url2 = appendLocationQuery(url2, selectedFacility.country, selectedFacility.city);
        }
        const response = await fetch(url2, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch scope2 monthly breakdown");
        }
        const payload = await response.json();
        setScope2MonthlyBreakdown(Array.isArray(payload) ? payload : []);
      } catch (error) {
        console.error("Scope2 monthly breakdown error:", error);
        setScope2MonthlyBreakdown([]);
      }
    };

    loadScope2MonthlyBreakdown();
  }, [token, selectedYear, API_URL, selectedFacility]);

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

  const fiscalMonths = Array.from({ length: 12 }, (_, idx) => {
    const monthNum = ((5 + idx) % 12) + 1; // Jun..May
    const yearNum = monthNum >= 6 ? selectedYear : selectedYear + 1;
    const monthKey = `${yearNum}-${String(monthNum).padStart(2, "0")}`;
    return {
      label: new Date(yearNum, monthNum - 1, 1).toLocaleString("en-US", { month: "short" }),
      monthKey,
      yearNum,
      monthNum,
    };
  });
  const monthNames = fiscalMonths.map((m) => m.label);
  const monthlyActualT = fiscalMonths.map((m) => {
    const monthKey = m.monthKey;
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
  const currentYear = new Date().getFullYear();
  const elapsedMonthsForTrajectory =
    selectedYear < currentYear ? 12 : selectedYear > currentYear ? 0 : (new Date().getMonth() + 1);
  const actualYtdT = totalTonnes;
  const requiredYtdT = annualBudgetT > 0 ? (annualBudgetT * (elapsedMonthsForTrajectory / 12)) : 0;
  const trajectoryGapT = actualYtdT - requiredYtdT;
  const trajectoryGapPct = requiredYtdT > 0 ? (trajectoryGapT / requiredYtdT) * 100 : 0;
  const trajectoryStatus =
    !annualBudgetT || elapsedMonthsForTrajectory === 0
      ? "na"
      : trajectoryGapT <= 0
      ? "green"
      : trajectoryGapPct <= 10
      ? "amber"
      : "red";
  const annualUsedT = actualYtdT;
  const annualRemainingT = annualBudgetT > 0 ? (annualBudgetT - actualYtdT) : 0;
  const annualUsedPct = annualBudgetT > 0 ? Math.min((annualUsedT / annualBudgetT) * 100, 100) : 0;
  const hasPathwayData = trajectorySeries.length > 1 && pathwayMeta.baseYear && pathwayMeta.targetYear;
  const annualActualMap = annualSeries.reduce((acc, row) => {
    const year = Number(row?.year);
    if (Number.isFinite(year)) acc[year] = Number(row?.total_kg || 0) / 1000;
    return acc;
  }, {});
  const trajectoryMap = trajectorySeries.reduce((acc, row) => {
    const year = Number(row?.year);
    if (Number.isFinite(year)) acc[year] = Number(row?.target_t || 0);
    return acc;
  }, {});
  const pathwayYears = hasPathwayData
    ? Array.from({ length: pathwayMeta.targetYear - pathwayMeta.baseYear + 1 }, (_, i) => pathwayMeta.baseYear + i)
    : [];
  const latestActualYear = Object.keys(annualActualMap).map(Number).filter((y) => Number.isFinite(y)).sort((a, b) => b - a)[0];
  const latestActualValue = Number.isFinite(latestActualYear) ? annualActualMap[latestActualYear] : null;
  const targetYearRequired = Number.isFinite(pathwayMeta.targetYear) ? trajectoryMap[pathwayMeta.targetYear] : null;
  const pathwayChartData = pathwayYears.map((year) => {
    const required = trajectoryMap[year] ?? null;
    const actual = annualActualMap[year] ?? null;
    let projection = null;
    if (
      Number.isFinite(latestActualYear) &&
      latestActualValue != null &&
      year >= latestActualYear &&
      targetYearRequired != null &&
      pathwayMeta.targetYear > latestActualYear
    ) {
      const progress = (year - latestActualYear) / (pathwayMeta.targetYear - latestActualYear);
      projection = latestActualValue + (targetYearRequired - latestActualValue) * progress;
    } else if (year === latestActualYear && latestActualValue != null) {
      projection = latestActualValue;
    }
    return {
      year: String(year),
      required,
      actual,
      projection,
    };
  });
  const gapAreas = pathwayChartData
    .map((point, index) => {
      const next = pathwayChartData[index + 1];
      if (!next) return null;
      if (point.actual == null || point.required == null || next.actual == null || next.required == null) return null;
      const isAbove = point.actual > point.required && next.actual > next.required;
      const isBelow = point.actual < point.required && next.actual < next.required;
      if (!isAbove && !isBelow) return null;
      return {
        x1: point.year,
        x2: next.year,
        y1: Math.min(point.actual, point.required, next.actual, next.required),
        y2: Math.max(point.actual, point.required, next.actual, next.required),
        isAbove,
      };
    })
    .filter(Boolean);
  
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
  const scope2DeltaKg = Math.max(locationBasedKg - marketBasedKg, 0);
  const scope2DeltaPct = locationBasedKg > 0 ? (scope2DeltaKg / locationBasedKg) * 100 : 0;
  const scope2SparklineData = fiscalMonths.map((m) => {
    const monthKey = m.monthKey;
    const monthRow = scope2MonthlyBreakdown.find((row) => row?.month === monthKey) || {};
    const locationT = Number(monthRow?.electricityLocationKg || 0) / 1000;
    const marketT = Number(monthRow?.electricityMarketKg || 0) / 1000;
    return {
      month: m.label,
      locationT,
      marketT,
      benefitT: Math.max(locationT - marketT, 0),
      hasData: Boolean(monthRow?.hasData),
    };
  });
  const scope2SparklineGapAreas = scope2SparklineData
    .map((point, index) => {
      const next = scope2SparklineData[index + 1];
      if (!next) return null;
      if (!point.hasData || !next.hasData) return null;
      const benefitPositive = point.locationT > point.marketT && next.locationT > next.marketT;
      if (!benefitPositive) return null;
      return {
        x1: point.month,
        x2: next.month,
        y1: Math.min(point.locationT, point.marketT, next.locationT, next.marketT),
        y2: Math.max(point.locationT, point.marketT, next.locationT, next.marketT),
      };
    })
    .filter(Boolean);
  const scope2SparklineBenefitT = scope2SparklineData.reduce((sum, row) => sum + (row.benefitT || 0), 0);
  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayFiscalStartYear = todayMonth >= 6 ? today.getFullYear() : today.getFullYear() - 1;
  const currentMonthIndex = selectedYear === todayFiscalStartYear ? fiscalMonths.findIndex((m) => m.monthKey === `${today.getFullYear()}-${String(todayMonth).padStart(2, "0")}`) : 11;
  const safeCurrentMonthIndex = currentMonthIndex >= 0 ? currentMonthIndex : 11;
  const currentMonthKey = fiscalMonths[safeCurrentMonthIndex]?.monthKey;
  const scope1CurrentMonth = scope1MonthlyBreakdown.find((row) => row?.month === currentMonthKey) || {};
  const scope2CurrentMonth = scope2MonthlyBreakdown.find((row) => row?.month === currentMonthKey) || {};
  const monthlySources = [
    { key: "mobileKg", name: "Mobile Combustion", value: Number(scope1CurrentMonth?.mobileKg || 0), recommendation: "Optimize fleet routes and transition high-use vehicles to lower-carbon fuel options." },
    { key: "stationaryKg", name: "Stationary Combustion", value: Number(scope1CurrentMonth?.stationaryKg || 0), recommendation: "Tune boiler efficiency and schedule preventive maintenance to reduce fuel burn." },
    { key: "refrigerantsKg", name: "Refrigerants", value: Number(scope1CurrentMonth?.refrigerantsKg || 0), recommendation: "Prioritize leak detection and recovery practices for high-GWP refrigerants." },
    { key: "fugitiveKg", name: "Fugitive Emissions", value: Number(scope1CurrentMonth?.fugitiveKg || 0), recommendation: "Tighten containment checks and replace leaking components in high-risk assets." },
    { key: "electricityLocationKg", name: "Purchased Electricity", value: Number(scope2CurrentMonth?.electricityLocationKg || 0), recommendation: "Increase REC/PPA coverage and improve electricity efficiency in peak-load operations." },
    { key: "heatingKg", name: "Heating & Cooling", value: Number(scope2CurrentMonth?.heatingKg || 0), recommendation: "Improve HVAC controls and setpoint strategy to cut avoidable thermal energy use." },
  ];
  const currentMonthTotalKg = monthlySources.reduce((sum, src) => sum + src.value, 0);
  const topSource = monthlySources.reduce((max, src) => (src.value > (max?.value || 0) ? src : max), null);
  const topSourcePct = currentMonthTotalKg > 0 && topSource ? (topSource.value / currentMonthTotalKg) * 100 : 0;
  const sourceTrendData = Array.from({ length: 6 }, (_, i) => {
    const trendIndex = Math.max(0, safeCurrentMonthIndex - (5 - i));
    const refMonth = fiscalMonths[trendIndex] || fiscalMonths[0];
    const monthKey = refMonth.monthKey;
    const label = refMonth.label;
    const s1 = scope1MonthlyBreakdown.find((r) => r?.month === monthKey) || {};
    const s2 = scope2MonthlyBreakdown.find((r) => r?.month === monthKey) || {};
    const valueKg = topSource?.key
      ? Number((topSource.key in s1 ? s1[topSource.key] : s2[topSource.key]) || 0)
      : 0;
    return { month: label, tco2e: valueKg / 1000 };
  });
  const fallbackRecommendationBySource = {
    "Mobile Combustion": "Prioritize route optimization and driver efficiency coaching for Mobile Combustion to reduce fuel use quickly without disrupting operations.",
    "Stationary Combustion": "Improve Stationary Combustion efficiency through burner tuning and preventive maintenance to cut avoidable fuel consumption this quarter.",
    "Refrigerants": "Strengthen leak detection and maintenance protocols for Refrigerants to reduce high-GWP losses and prevent recurring emission spikes.",
    "Fugitive Emissions": "Run targeted inspections on valves, joints, and seals to reduce Fugitive Emissions from persistent small leaks.",
    "Purchased Electricity": "Expand renewable procurement and tighten electricity efficiency controls in high-load operations to reduce Purchased Electricity intensity.",
    "Heating & Cooling": "Optimize HVAC scheduling and setpoints for Heating & Cooling while correcting control drift in high-consumption zones.",
  };
  const fallbackTopSourceRecommendation = topSource
    ? (fallbackRecommendationBySource[topSource.name] || "Focus near-term reduction actions on this largest source to lower monthly emissions fastest.")
    : "";

  useEffect(() => {
    const loadAiTopSourceRecommendation = async () => {
      if (!token || !topSource || topSource.value <= 0 || currentMonthTotalKg <= 0) {
        setAiTopSourceRecommendation("");
        return;
      }

      setAiRecommendationLoading(true);
      try {
        const monthLabel = `${monthNames[safeCurrentMonthIndex]} ${fiscalMonths[safeCurrentMonthIndex]?.yearNum || selectedYear}`;
        const response = await fetch(`${API_URL}/api/reports/source-recommendation`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_name: topSource.name,
            source_share_pct: topSourcePct,
            source_tco2e: topSource.value / 1000,
            month_label: monthLabel,
          }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.detail || "Failed to generate AI recommendation");
        }
        setAiTopSourceRecommendation(String(payload?.recommendation || "").trim());
      } catch (error) {
        console.error("Top source AI recommendation error:", error);
        setAiTopSourceRecommendation("");
      } finally {
        setAiRecommendationLoading(false);
      }
    };

    loadAiTopSourceRecommendation();
  }, [token, topSource?.name, topSource?.value, topSourcePct, safeCurrentMonthIndex, selectedYear, API_URL, currentMonthTotalKg]);

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
  const renderTargetEmptyState = (title, description) => (
    <div className="rich-empty-state">
      <div className="rich-empty-icon"><FiTarget /></div>
      <div className="rich-empty-content">
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      <button onClick={() => navigate('/target-settings')} className="set-target-btn-inline">Set Target</button>
    </div>
  );
  
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
            <ThemedSelect
              value={selectedYear}
              onChange={(value) => setSelectedYear(Number(value))}
              options={availableYears.map((year) => ({
                value: year,
                label: `${year}-${year + 1} Overview`,
              }))}
              placeholder="Reporting Year"
              className="year-themed-select"
              menuDirection="down"
            />
          </div>
          {company?.locations?.length > 0 && (
            <FacilityCitySelect company={company} menuDirection="down" />
          )}
          <button onClick={handleRefresh} className="refresh-btn" disabled={refreshing}>
            <FiRefreshCw className={refreshing ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button className={`tab-btn ${activeView === "overview" ? "active" : ""}`} onClick={() => setActiveView("overview")}>
          Overview
        </button>
        <button className={`tab-btn ${activeView === "targets" ? "active" : ""}`} onClick={() => setActiveView("targets")}>
          Targets
        </button>
        <button className={`tab-btn ${activeView === "scope2" ? "active" : ""}`} onClick={() => setActiveView("scope2")}>
          Scope 2
        </button>
        <button className={`tab-btn ${activeView === "activity" ? "active" : ""}`} onClick={() => setActiveView("activity")}>
          Recent Activity
        </button>
      </div>

      {activeView === "overview" && (
      <>
      <div className="section-title">This year at a glance</div>
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
      <div className="section-title">Performance</div>
      <Card className="top-source-card">
        <div className="collapsible-header">
          <div className="top-source-header">
            <h3>Top Emission Source Insight</h3>
            <p>Largest source for {monthNames[safeCurrentMonthIndex]} {fiscalMonths[safeCurrentMonthIndex]?.yearNum || selectedYear}</p>
          </div>
          <button className="collapse-btn" onClick={() => toggleSection("sourceInsight")}>
            {expandedSections.sourceInsight ? "Hide trend" : "Show 6-month trend"}
          </button>
        </div>
        {topSource && topSource.value > 0 ? (
          <>
            <div className="top-source-main">
              <div className="top-source-name">{topSource.name}</div>
              <div className="top-source-share">{topSourcePct.toFixed(1)}% of total monthly emissions</div>
            </div>
            <div className="top-source-reco">
              {aiRecommendationLoading
                ? "Generating AI recommendation..."
                : (aiTopSourceRecommendation || fallbackTopSourceRecommendation)}
            </div>
            {expandedSections.sourceInsight && (
              <div className="top-source-trend">
                <ResponsiveContainer width="100%" height={170}>
                  <LineChart data={sourceTrendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#EEF2F7" strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => `${Number(value || 0).toFixed(2)} tCO₂e`} />
                    <Line type="monotone" dataKey="tco2e" stroke="#1B4D3E" strokeWidth={2.5} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        ) : (
          <div className="collapsed-summary">No monthly category data available yet for this period.</div>
        )}
      </Card>
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
      <div className="section-title">Monthly trend</div>
      {/* Data Completeness Calendar */}
      <div className="calendar-section">
        <DataCompletenessCalendar
          year={selectedYear}
          country={selectedFacility?.country}
          city={selectedFacility?.city}
        />
      </div>

      {/* Charts Grid - Updated with Stacked Category Chart */}
      <div className="charts-grid">
        <Card className="chart-card large">
          <div className="chart-header">
            <h3>Monthly Emissions by Category</h3>
          </div>
          <div className="chart-wrapper">
            <StackedCategoryChart
              year={selectedYear}
              country={selectedFacility?.country}
              city={selectedFacility?.city}
            />
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
      </>
      )}

      {activeView === "targets" && (
      <>
      <div className="section-title">Targets</div>
      <Card className="target-breakdown-card">
        <div className="collapsible-header">
          <div>
            <h3>Target Period Breakdown</h3>
            <p>Quarterly and monthly milestones derived from annual budget</p>
          </div>
          <button className="collapse-btn" onClick={() => toggleSection("targetPeriod")}>
            {expandedSections.targetPeriod ? "Hide" : "Show"}
          </button>
        </div>
        {!annualBudgetT ? (
          renderTargetEmptyState(
            "No target configured yet",
            "Set an annual target to unlock quarterly and monthly milestone tracking."
          )
        ) : expandedSections.targetPeriod ? (
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
        ) : <div className="collapsed-summary">Quarter milestones and monthly cells are hidden. Expand to view details.</div>}
      </Card>
      <Card className="progress-target-card">
        <div className="collapsible-header">
          <div>
            <h3>Progress vs Target Display</h3>
            <p>Live comparison of actual YTD emissions against required trajectory</p>
          </div>
          <button className="collapse-btn" onClick={() => toggleSection("progressTarget")}>
            {expandedSections.progressTarget ? "Hide" : "Show"}
          </button>
        </div>
        {!annualBudgetT ? (
          renderTargetEmptyState(
            "Track progress against your annual target",
            "This view compares actual YTD emissions with required trajectory and highlights risk early."
          )
        ) : expandedSections.progressTarget ? (
          <>
            <div className="trajectory-row">
              <div className="trajectory-block">
                <span className="trajectory-label">Actual YTD</span>
                <span className="trajectory-value">{actualYtdT.toFixed(1)} tCO₂e</span>
              </div>
              <div className="trajectory-block">
                <span className="trajectory-label">Required YTD</span>
                <span className="trajectory-value">{requiredYtdT.toFixed(1)} tCO₂e</span>
              </div>
              <div className="trajectory-status-wrap">
                <span className={`rag-chip ${trajectoryStatus}`}>
                  {trajectoryStatus === "green" && "On Track"}
                  {trajectoryStatus === "amber" && "At Risk"}
                  {trajectoryStatus === "red" && "Off Track"}
                  {trajectoryStatus === "na" && "N/A"}
                </span>
              </div>
            </div>

            <div className="gap-row">
              <span>Gap vs required trajectory:</span>
              <strong className={trajectoryGapT <= 0 ? "gap-good" : "gap-bad"}>
                {trajectoryGapT >= 0 ? "+" : ""}
                {trajectoryGapT.toFixed(1)} tCO₂e
              </strong>
            </div>

            <div className="budget-summary-card">
              <div className="budget-summary-title">Budget Summary</div>
              <div className="budget-summary-line">
                <span>Used</span>
                <span>{annualUsedT.toFixed(1)} / {annualBudgetT.toFixed(1)} tCO₂e ({annualUsedPct.toFixed(0)}%)</span>
              </div>
              <div className="budget-summary-bar">
                <div className={`budget-summary-fill ${annualRemainingT < 0 ? "red" : "green"}`} style={{ width: `${annualUsedPct}%` }} />
              </div>
              <div className="budget-summary-line">
                <span>Remaining</span>
                <span className={annualRemainingT >= 0 ? "gap-good" : "gap-bad"}>
                  {annualRemainingT.toFixed(1)} tCO₂e
                </span>
              </div>
            </div>
          </>
        ) : <div className="collapsed-summary">YTD comparison and budget summary are hidden. Expand to view details.</div>}
      </Card>

      <Card className="pathway-chart-card">
        <div className="collapsible-header">
          <div className="pathway-header">
            <h3>Net Zero Pathway Chart</h3>
            <p>Actual performance against required trajectory from baseline to target year</p>
          </div>
          <button className="collapse-btn" onClick={() => toggleSection("pathway")}>
            {expandedSections.pathway ? "Hide" : "Show"}
          </button>
        </div>
        {!hasPathwayData ? (
          renderTargetEmptyState(
            "Build your net zero pathway",
            "Set a target to visualize required trajectory, actual emissions, and projection to target year."
          )
        ) : expandedSections.pathway ? (
          <div className="pathway-chart-wrap">
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={pathwayChartData} margin={{ top: 18, right: 18, left: 8, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#6B7280" }} />
                <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} label={{ value: "tCO₂e", angle: -90, position: "insideLeft", style: { fill: "#6B7280", fontSize: 12 } }} />
                <Tooltip formatter={(value) => (value != null ? `${Number(value).toFixed(2)} tCO₂e` : "—")} />
                <Legend />
                {gapAreas.map((g) => (
                  <ReferenceArea
                    key={`gap-${g.x1}-${g.x2}`}
                    x1={g.x1}
                    x2={g.x2}
                    y1={g.y1}
                    y2={g.y2}
                    strokeOpacity={0}
                    fill={g.isAbove ? "#FEE2E2" : "#D1FAE5"}
                    fillOpacity={0.6}
                  />
                ))}
                <Line type="monotone" dataKey="required" name="Required Trajectory" stroke="#1B4D3E" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="actual" name="Actual Emissions" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
                <Line type="monotone" dataKey="projection" name="Projection to Target Year" stroke="#6B7280" strokeWidth={2} strokeDasharray="6 5" dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
            <div className="pathway-note">
              <span><span className="swatch red"></span>Actual above required pathway</span>
              <span><span className="swatch green"></span>Actual below required pathway</span>
            </div>
          </div>
        ) : <div className="collapsed-summary">Pathway chart is hidden. Expand to view trajectory and gap shading.</div>}
      </Card>

      <WhatIfScenarioBuilder
        token={token}
        year={selectedYear}
        selectedFacility={selectedFacility}
        ytdTotalKg={totalKg}
        monthsSubmitted={monthsSubmitted}
        annualTargetT={targetT || 0}
        scope1Results={scope1Results}
        scope2Results={scope2Results}
      />
      <SeasonalPatternCard
        token={token}
        year={selectedYear}
        selectedFacility={selectedFacility}
      />
      </>
      )}

      {activeView === "scope2" && (
      <>
      <div className="section-title">Scope 2</div>
      <Card className="scope2-delta-card">
        <div className="collapsible-header">
          <div className="scope2-delta-header">
            <h3>Scope 2 Delta</h3>
            <p>Location-based vs market-based emissions and reduction opportunity</p>
          </div>
          <button className="collapse-btn" onClick={() => toggleSection("scope2Delta")}>
            {expandedSections.scope2Delta ? "Hide" : "Show"}
          </button>
        </div>
        {expandedSections.scope2Delta ? (
        <>
        <div className="scope2-delta-header">
          <p />
        </div>

        <div className="scope2-delta-values">
          <div className="scope2-delta-primary">
            {locationBasedKg > 0 ? (locationBasedKg / 1000).toFixed(2) : "0.00"}
            <span className="scope2-delta-unit"> tCO₂e</span>
          </div>
          <div className="scope2-delta-primary-label">Location-based total</div>

          <div className="scope2-delta-secondary">
            Market-based: <strong>{(marketBasedKg / 1000).toFixed(2)} tCO₂e</strong>
          </div>
        </div>

        <div className={`scope2-gap-callout ${scope2DeltaKg > 0 ? "positive" : "neutral"}`}>
          {scope2DeltaKg > 0 ? (
            <>
              <span>Reduction opportunity:</span>
              <strong>
                {(scope2DeltaKg / 1000).toFixed(2)} tCO₂e ({scope2DeltaPct.toFixed(1)}%)
              </strong>
            </>
          ) : (
            <>
              <span>Reduction opportunity:</span>
              <strong>0.00 tCO₂e (0.0%)</strong>
            </>
          )}
        </div>

        <div className="scope2-delta-actions">
          <button
            type="button"
            className="set-target-btn"
            onClick={() => navigate("/guide")}
          >
            Learn how
          </button>
          <span>REC/PPA explanation</span>
        </div>
        </>
        ) : <div className="collapsed-summary">Scope 2 delta metrics are hidden. Expand to view totals and gap callout.</div>}
      </Card>

      <Card className="scope2-sparkline-card">
        <div className="collapsible-header">
          <div className="scope2-sparkline-header">
            <h3>Scope 2 Dual-line Sparkline</h3>
            <p>Electricity trend: location-based vs market-based emissions</p>
          </div>
          <button className="collapse-btn" onClick={() => toggleSection("scope2Sparkline")}>
            {expandedSections.scope2Sparkline ? "Hide" : "Show"}
          </button>
        </div>
        {expandedSections.scope2Sparkline ? (
        <>
        <div className="scope2-sparkline-wrap">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={scope2SparklineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#EEF2F7" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value) => `${Number(value || 0).toFixed(2)} tCO₂e`}
                labelFormatter={(label) => `${label} ${selectedYear}`}
              />
              {scope2SparklineGapAreas.map((area) => (
                <ReferenceArea
                  key={`s2-gap-${area.x1}-${area.x2}`}
                  x1={area.x1}
                  x2={area.x2}
                  y1={area.y1}
                  y2={area.y2}
                  fill="#D1FAE5"
                  fillOpacity={0.6}
                  strokeOpacity={0}
                />
              ))}
              <Line
                type="monotone"
                dataKey="locationT"
                name="Location-based"
                stroke="#2563EB"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="marketT"
                name="Market-based"
                stroke="#10B981"
                strokeWidth={2.2}
                strokeDasharray="6 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="scope2-sparkline-note">
          <span><span className="swatch green"></span>Gap area shows renewable certificate benefit</span>
          <strong>Total benefit: {scope2SparklineBenefitT.toFixed(2)} tCO₂e</strong>
        </div>
        </>
        ) : <div className="collapsed-summary">Electricity sparkline is hidden. Expand to view location vs market lines.</div>}
      </Card>
      </>
      )}

      {activeView === "activity" && (
      <>
      <div className="section-title">Recent Activity</div>
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
      </>
      )}

      {/* GHG Protocol Compliance Footer (all tabs) */}
      <div className="ghg-fixed-footer">
        <div className="ghg-footer-inner">
          <span className="ghg-footer-title"><FiAward /> GHG Protocol Compliance</span>
          <span>Location-based Scope 2 is primary; market-based is reported separately.</span>
          <span>Renewables are tracked separately and biogenic emissions are excluded from Scope 1 totals.</span>
        </div>
      </div>

      <style jsx>{`
        .dashboard-container {
          padding: 24px;
          padding-bottom: 86px;
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
          display: flex;
          align-items: center;
          min-width: 220px;
        }

        .year-themed-select {
          width: 100%;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 38px;
          padding: 9px 14px;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          background: white;
          color: #374151;
          font-size: 13px;
          font-weight: 600;
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
        .dashboard-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .tab-btn {
          border: 1px solid #D1D5DB;
          background: #fff;
          color: #374151;
          border-radius: 10px;
          padding: 8px 13px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .tab-btn:hover {
          border-color: #2E7D64;
          color: #1B4D3E;
        }
        .tab-btn.active {
          background: #1B4D3E;
          border-color: #1B4D3E;
          color: #fff;
        }
        .section-title {
          margin: 8px 0 12px;
          font-size: 14px;
          font-weight: 700;
          color: #1B4D3E;
        }
        .collapsible-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 8px;
        }
        .collapse-btn {
          border: 1px solid #D1D5DB;
          background: #fff;
          color: #374151;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          min-height: 34px;
          padding: 7px 12px;
          cursor: pointer;
        }
        .collapse-btn:hover {
          border-color: #2E7D64;
          color: #1B4D3E;
        }
        .collapsed-summary {
          border: 1px solid #E5E7EB;
          background: #F9FAFB;
          border-radius: 8px;
          padding: 10px 12px;
          color: #6B7280;
          font-size: 13px;
        }
        .rich-empty-state {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid #E5E7EB;
          background: #F9FAFB;
          border-radius: 10px;
          padding: 14px;
        }
        .rich-empty-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid #D1D5DB;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #1B4D3E;
          background: #fff;
          flex-shrink: 0;
        }
        .rich-empty-content {
          flex: 1;
        }
        .rich-empty-content h4 {
          margin: 0 0 4px;
          font-size: 14px;
          color: #1F2937;
        }
        .rich-empty-content p {
          margin: 0;
          font-size: 12px;
          color: #6B7280;
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
          min-height: 36px;
          padding: 8px 14px;
          border: 1px solid #1B4D3E;
          border-radius: 10px;
          background: #1B4D3E;
          color: #FFFFFF;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
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
          border-radius: 10px;
          min-height: 36px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
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
        .progress-target-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .progress-target-header h3 {
          margin: 0 0 6px 0;
          font-size: 18px;
          color: #1B4D3E;
        }
        .progress-target-header p {
          margin: 0 0 14px 0;
          font-size: 13px;
          color: #6B7280;
        }
        .progress-target-empty {
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
        .trajectory-row {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 12px;
          margin-bottom: 10px;
        }
        .trajectory-block {
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 10px;
          background: #FBFCFD;
        }
        .trajectory-label {
          display: block;
          font-size: 11px;
          color: #6B7280;
          margin-bottom: 4px;
        }
        .trajectory-value {
          font-size: 15px;
          font-weight: 700;
          color: #1F2937;
        }
        .trajectory-status-wrap {
          display: flex;
          align-items: center;
        }
        .gap-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          color: #4B5563;
          margin-bottom: 12px;
        }
        .gap-good { color: #065F46; }
        .gap-bad { color: #991B1B; }
        .budget-summary-card {
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          padding: 12px;
          background: #FBFCFD;
        }
        .budget-summary-title {
          font-size: 13px;
          font-weight: 600;
          color: #1B4D3E;
          margin-bottom: 8px;
        }
        .budget-summary-line {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #4B5563;
          margin-bottom: 6px;
        }
        .budget-summary-bar {
          height: 8px;
          background: #E5E7EB;
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .budget-summary-fill {
          height: 100%;
        }
        .budget-summary-fill.green { background: #10B981; }
        .budget-summary-fill.red { background: #EF4444; }
        .pathway-chart-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .pathway-header h3 {
          margin: 0 0 6px 0;
          font-size: 18px;
          color: #1B4D3E;
        }
        .pathway-header p {
          margin: 0 0 14px 0;
          font-size: 13px;
          color: #6B7280;
        }
        .pathway-empty {
          border: 1px solid #E5E7EB;
          background: #F9FAFB;
          border-radius: 8px;
          padding: 12px;
          color: #6B7280;
          font-size: 13px;
        }
        .pathway-chart-wrap {
          width: 100%;
        }
        .pathway-note {
          margin-top: 10px;
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          font-size: 12px;
          color: #6B7280;
        }
        .swatch {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 2px;
          margin-right: 6px;
        }
        .swatch.red { background: #FEE2E2; }
        .swatch.green { background: #D1FAE5; }
        .scope2-delta-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .scope2-delta-header h3 {
          margin: 0 0 6px 0;
          font-size: 18px;
          color: #1B4D3E;
        }
        .scope2-delta-header p {
          margin: 0 0 14px 0;
          font-size: 13px;
          color: #6B7280;
        }
        .scope2-delta-values {
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          padding: 14px;
          background: #FBFCFD;
        }
        .scope2-delta-primary {
          font-size: 36px;
          line-height: 1.1;
          font-weight: 700;
          color: #1B4D3E;
        }
        .scope2-delta-unit {
          font-size: 14px;
          color: #6B7280;
          margin-left: 4px;
          font-weight: 500;
        }
        .scope2-delta-primary-label {
          margin-top: 6px;
          font-size: 12px;
          color: #6B7280;
        }
        .scope2-delta-secondary {
          margin-top: 10px;
          font-size: 14px;
          color: #374151;
        }
        .scope2-gap-callout {
          margin-top: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          border-radius: 8px;
          padding: 10px 12px;
          border: 1px solid #E5E7EB;
          font-size: 13px;
          color: #4B5563;
          flex-wrap: wrap;
        }
        .scope2-gap-callout.positive {
          background: #ECFDF5;
          border-color: #A7F3D0;
        }
        .scope2-gap-callout.neutral {
          background: #F9FAFB;
          border-color: #E5E7EB;
        }
        .scope2-delta-actions {
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          font-size: 12px;
          color: #6B7280;
        }
        .scope2-sparkline-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .scope2-sparkline-header h3 {
          margin: 0 0 6px 0;
          font-size: 18px;
          color: #1B4D3E;
        }
        .scope2-sparkline-header p {
          margin: 0 0 12px 0;
          font-size: 13px;
          color: #6B7280;
        }
        .scope2-sparkline-wrap {
          width: 100%;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          padding: 8px 8px 2px 8px;
          background: #FCFDFE;
        }
        .scope2-sparkline-note {
          margin-top: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
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

        .ghg-fixed-footer {
          position: fixed;
          left: var(--app-sidebar-width, 0px);
          right: 0;
          bottom: 0;
          z-index: 40;
          border-top: 1px solid #D1D5DB;
          background: #FFFFFF;
          box-shadow: 0 -4px 12px rgba(15, 23, 42, 0.06);
        }
        .ghg-footer-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 10px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          font-size: 12px;
          color: #4B5563;
        }
        .ghg-footer-title {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          color: #1B4D3E;
        }
        .top-source-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .top-source-header h3 {
          margin: 0 0 6px 0;
          font-size: 18px;
          color: #1B4D3E;
        }
        .top-source-header p {
          margin: 0;
          font-size: 13px;
          color: #6B7280;
        }
        .top-source-main {
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          padding: 12px;
          background: #FBFCFD;
        }
        .top-source-name {
          font-size: 20px;
          font-weight: 700;
          color: #1F2937;
        }
        .top-source-share {
          margin-top: 4px;
          font-size: 13px;
          color: #6B7280;
        }
        .top-source-reco {
          margin-top: 10px;
          font-size: 13px;
          color: #374151;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 10px 12px;
        }
        .top-source-trend {
          margin-top: 12px;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          padding: 8px;
          background: #FCFDFE;
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
          .ghg-footer-inner {
            padding: 10px 16px;
          }
          .quarter-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .month-grid {
            grid-template-columns: repeat(6, minmax(0, 1fr));
          }
          .trajectory-row {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 16px;
            padding-bottom: 104px;
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
          .trajectory-row {
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