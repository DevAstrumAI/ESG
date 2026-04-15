// src/components/dashboard/DashboardCharts/StackedCategoryChart.jsx
import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from "recharts";
import { useAuthStore } from "../../../store/authStore";
import { useEmissionStore } from "../../../store/emissionStore";
import { FiLayers, FiBarChart2, FiRefreshCw } from "react-icons/fi";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";
const KG_TO_TONNES = 1000;

export default function StackedCategoryChart({ year }) {
  const token = useAuthStore((s) => s.token);
  const [scope, setScope] = useState("scope1"); // 'scope1' or 'scope2'
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Scope 1 categories
  const scope1Categories = [
    { key: "mobile", name: "Mobile Combustion", color: "#3B82F6" },
    { key: "stationary", name: "Stationary Combustion", color: "#F59E0B" },
    { key: "refrigerants", name: "Refrigerants", color: "#06B6D4" },
    { key: "fugitive", name: "Fugitive Emissions", color: "#EF4444" },
  ];

  // Scope 2 categories
  const scope2Categories = [
    { key: "electricityLocation", name: "Electricity (Location)", color: "#8B5CF6" },
    { key: "electricityMarket", name: "Electricity (Market)", color: "#A78BFA" },
    { key: "heating", name: "Heating & Cooling", color: "#F97316" },
  ];

  const fetchMonthlyBreakdown = async () => {
    if (!token) {
      setLoading(false);
      setError("Authentication required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/emissions/monthly-category-breakdown?year=${year}&scope=${scope}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          await fetchFallbackData();
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      transformChartData(data);
      
    } catch (err) {
      console.error("Error fetching monthly data:", err);
      setError(err.message);
      await fetchFallbackData();
    } finally {
      setLoading(false);
    }
  };

// In StackedCategoryChart.jsx, update the fetchFallbackData function:

const fetchFallbackData = async () => {
  try {
    // Try to get data from store
    const scope1Results = useEmissionStore.getState().scope1Results;
    const scope2Results = useEmissionStore.getState().scope2Results;
    
    const hasData = (scope1Results?.total?.kgCO2e > 0) || (scope2Results?.total?.kgCO2e > 0);
    
    if (!hasData) {
      createEmptyChartData();
      return;
    }
    
    // Get the current month index
    const currentMonthIndex = new Date().getMonth();
    
    const transformedData = months.map((month, index) => {
      const monthStr = `${year}-${String(index + 1).padStart(2, '0')}`;
      const isCurrentMonth = index === currentMonthIndex;
      
      if (scope === "scope1") {
        return {
          name: month,
          month: monthStr,
          mobile: isCurrentMonth ? (scope1Results?.mobile?.kgCO2e || 0) / KG_TO_TONNES : 0,
          stationary: isCurrentMonth ? (scope1Results?.stationary?.kgCO2e || 0) / KG_TO_TONNES : 0,
          refrigerants: isCurrentMonth ? (scope1Results?.refrigerants?.kgCO2e || 0) / KG_TO_TONNES : 0,
          fugitive: isCurrentMonth ? (scope1Results?.fugitive?.kgCO2e || 0) / KG_TO_TONNES : 0,
          hasData: isCurrentMonth && hasData,
        };
      } else {
        return {
          name: month,
          month: monthStr,
          electricityLocation: isCurrentMonth ? (scope2Results?.electricity?.locationBasedKgCO2e || 0) / KG_TO_TONNES : 0,
          electricityMarket: isCurrentMonth ? (scope2Results?.electricity?.marketBasedKgCO2e || 0) / KG_TO_TONNES : 0,
          heating: isCurrentMonth ? (scope2Results?.heating?.kgCO2e || 0) / KG_TO_TONNES : 0,
          hasData: isCurrentMonth && hasData,
        };
      }
    });
    
    setChartData(applyMissingPlaceholders(transformedData));
    
  } catch (err) {
    console.error("Fallback error:", err);
    createEmptyChartData();
  }
};

const createEmptyChartData = () => {
  const emptyData = months.map((month, index) => {
    const baseData = { name: month, month: `${year}-${String(index + 1).padStart(2, '0')}`, hasData: false };
    if (scope === "scope1") {
      baseData.mobile = 0;
      baseData.stationary = 0;
      baseData.refrigerants = 0;
      baseData.fugitive = 0;
    } else {
      baseData.electricityLocation = 0;
      baseData.electricityMarket = 0;
      baseData.heating = 0;
    }
    return baseData;
  });
  setChartData(applyMissingPlaceholders(emptyData));
};

  const transformChartData = (data) => {
    const transformed = months.map((month, index) => {
      const monthNum = index + 1;
      const monthStr = `${year}-${String(monthNum).padStart(2, '0')}`;
      const monthData = data.find(d => d.month === monthStr) || {};
      
      const result = {
        name: month,
        month: monthStr,
        hasData: monthData.hasData || false,
      };
      
      if (scope === "scope1") {
        result.mobile = (monthData.mobileKg || 0) / KG_TO_TONNES;
        result.stationary = (monthData.stationaryKg || 0) / KG_TO_TONNES;
        result.refrigerants = (monthData.refrigerantsKg || 0) / KG_TO_TONNES;
        result.fugitive = (monthData.fugitiveKg || 0) / KG_TO_TONNES;
      } else {
        result.electricityLocation = (monthData.electricityLocationKg || 0) / KG_TO_TONNES;
        result.electricityMarket = (monthData.electricityMarketKg || 0) / KG_TO_TONNES;
        result.heating = (monthData.heatingKg || 0) / KG_TO_TONNES;
      }
      
      return result;
    });
    
    setChartData(applyMissingPlaceholders(transformed));
  };

  const applyMissingPlaceholders = (rows) => {
    const maxKnownTotal = rows.reduce((max, row) => {
      const total = scope === "scope1"
        ? (row.mobile || 0) + (row.stationary || 0) + (row.refrigerants || 0) + (row.fugitive || 0)
        : (row.electricityLocation || 0) + (row.electricityMarket || 0) + (row.heating || 0);
      return Math.max(max, total);
    }, 0);
    const placeholder = maxKnownTotal > 0 ? Math.max(maxKnownTotal * 0.08, 0.05) : 0.05;
    return rows.map((row) => ({
      ...row,
      missingPlaceholder: row.hasData ? 0 : placeholder,
    }));
  };

  useEffect(() => {
    fetchMonthlyBreakdown();
  }, [token, year, scope, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="custom-tooltip">
          <div className="tooltip-title">{label} {year}</div>
          {data.hasData ? (
            <>
              {scope === "scope1" ? (
                <>
                  <div className="tooltip-item">
                    <span className="tooltip-color" style={{ background: "#3B82F6" }}></span>
                    <span className="tooltip-label">Mobile Combustion:</span>
                    <span className="tooltip-value">{data.mobile.toFixed(2)} tCO₂e</span>
                  </div>
                  <div className="tooltip-item">
                    <span className="tooltip-color" style={{ background: "#F59E0B" }}></span>
                    <span className="tooltip-label">Stationary Combustion:</span>
                    <span className="tooltip-value">{data.stationary.toFixed(2)} tCO₂e</span>
                  </div>
                  <div className="tooltip-item">
                    <span className="tooltip-color" style={{ background: "#06B6D4" }}></span>
                    <span className="tooltip-label">Refrigerants:</span>
                    <span className="tooltip-value">{data.refrigerants.toFixed(2)} tCO₂e</span>
                  </div>
                  <div className="tooltip-item">
                    <span className="tooltip-color" style={{ background: "#EF4444" }}></span>
                    <span className="tooltip-label">Fugitive Emissions:</span>
                    <span className="tooltip-value">{data.fugitive.toFixed(2)} tCO₂e</span>
                  </div>
                  <div className="tooltip-item total">
                    <span className="tooltip-label">Total:</span>
                    <span className="tooltip-value">
                      {(data.mobile + data.stationary + data.refrigerants + data.fugitive).toFixed(2)} tCO₂e
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="tooltip-item">
                    <span className="tooltip-color" style={{ background: "#8B5CF6" }}></span>
                    <span className="tooltip-label">Electricity (Location):</span>
                    <span className="tooltip-value">{data.electricityLocation.toFixed(2)} tCO₂e</span>
                  </div>
                  <div className="tooltip-item">
                    <span className="tooltip-color" style={{ background: "#A78BFA" }}></span>
                    <span className="tooltip-label">Electricity (Market):</span>
                    <span className="tooltip-value">{data.electricityMarket.toFixed(2)} tCO₂e</span>
                  </div>
                  <div className="tooltip-item">
                    <span className="tooltip-color" style={{ background: "#F97316" }}></span>
                    <span className="tooltip-label">Heating & Cooling:</span>
                    <span className="tooltip-value">{data.heating.toFixed(2)} tCO₂e</span>
                  </div>
                  <div className="tooltip-item total">
                    <span className="tooltip-label">Total:</span>
                    <span className="tooltip-value">
                      {(data.electricityLocation + data.heating).toFixed(2)} tCO₂e
                    </span>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="tooltip-no-data">
              <span>No data submitted for this month</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="chart-loading">
        <div className="loading-spinner"></div>
        <span>Loading chart data...</span>
      </div>
    );
  }

  if (error && !chartData.length) {
    return (
      <div className="chart-error">
        <FiRefreshCw size={24} />
        <p>Unable to load chart data</p>
        <button onClick={handleRetry} className="retry-btn">Retry</button>
      </div>
    );
  }

  // Get the appropriate bars based on scope
  const getBars = () => {
    if (scope === "scope1") {
      return scope1Categories.map(cat => (
        <Bar key={cat.key} dataKey={cat.key} name={cat.name} stackId="stack" fill={cat.color} radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell 
              key={`cell-${cat.key}-${index}`}
              fill={entry.hasData ? cat.color : "#E5E7EB"}
              fillOpacity={entry.hasData ? 1 : 0.5}
            />
          ))}
        </Bar>
      ));
    } else {
      return scope2Categories.map(cat => (
        <Bar key={cat.key} dataKey={cat.key} name={cat.name} stackId="stack" fill={cat.color} radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell 
              key={`cell-${cat.key}-${index}`}
              fill={entry.hasData ? cat.color : "#E5E7EB"}
              fillOpacity={entry.hasData ? 1 : 0.5}
            />
          ))}
        </Bar>
      ));
    }
  };

  const totalHasData = chartData.some(d => d.hasData);

  return (
    <div className="stacked-chart-container">
      {/* Toggle Buttons */}
      <div className="chart-toggle">
        <button
          className={`toggle-btn ${scope === "scope1" ? "active" : ""}`}
          onClick={() => setScope("scope1")}
        >
          <FiBarChart2 size={14} />
          Scope 1
        </button>
        <button
          className={`toggle-btn ${scope === "scope2" ? "active" : ""}`}
          onClick={() => setScope("scope2")}
        >
          <FiLayers size={14} />
          Scope 2
        </button>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          barGap={0}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12, fill: "#6B7280" }}
            axisLine={{ stroke: "#E5E7EB" }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: "#6B7280" }}
            axisLine={{ stroke: "#E5E7EB" }}
            label={{ 
              value: "tCO₂e", 
              angle: -90, 
              position: "insideLeft",
              style: { fontSize: 12, fill: "#6B7280" }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
            formatter={(value) => <span style={{ color: "#374151" }}>{value}</span>}
          />
          <Bar dataKey="missingPlaceholder" stackId="placeholder" fill="#E5E7EB" legendType="none" />
          {getBars()}
        </BarChart>
      </ResponsiveContainer>
      
      <div className="chart-note">
        {!totalHasData ? (
          <span className="no-data-note">
            No emission data submitted for {year}. Submit data to see the chart.
          </span>
        ) : (
          <span className="missing-note">
            <span className="gray-dot"></span>
            Gray bars indicate months with no data submitted
          </span>
        )}
      </div>

      <style jsx>{`
        .stacked-chart-container {
          width: 100%;
          min-height: 420px;
        }
        
        .chart-toggle {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          justify-content: flex-end;
        }
        
        .toggle-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          background: #F3F4F6;
          border: 1px solid #E5E7EB;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          color: #6B7280;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .toggle-btn:hover {
          background: #E5E7EB;
          border-color: #2E7D64;
        }
        
        .toggle-btn.active {
          background: #2E7D64;
          border-color: #2E7D64;
          color: white;
        }
        
        .chart-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: #6B7280;
        }
        
        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #E5E7EB;
          border-top-color: #2E7D64;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 12px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .chart-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: #DC2626;
          text-align: center;
          gap: 12px;
        }
        
        .retry-btn {
          padding: 6px 12px;
          background: #F3F4F6;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
        }
        
        .retry-btn:hover {
          background: #E5E7EB;
        }
        
        .chart-note {
          margin-top: 12px;
          padding: 8px 12px;
          background: #F9FAFB;
          border-radius: 6px;
          font-size: 11px;
          color: #6B7280;
          text-align: center;
        }
        
        .missing-note, .no-data-note {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        
        .gray-dot {
          width: 10px;
          height: 10px;
          background: #E5E7EB;
          border-radius: 2px;
          display: inline-block;
        }
        
        .custom-tooltip {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 10px 14px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          min-width: 200px;
        }
        
        .tooltip-title {
          font-weight: 600;
          color: #1B4D3E;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid #E5E7EB;
        }
        
        .tooltip-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 12px;
        }
        
        .tooltip-color {
          width: 10px;
          height: 10px;
          border-radius: 2px;
          margin-right: 8px;
        }
        
        .tooltip-label {
          color: #6B7280;
          flex: 1;
        }
        
        .tooltip-value {
          font-weight: 600;
          color: #1F2937;
        }
        
        .tooltip-item.total {
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid #E5E7EB;
        }
        
        .tooltip-item.total .tooltip-label {
          font-weight: 600;
          color: #1B4D3E;
        }
        
        .tooltip-no-data {
          color: #9CA3AF;
          font-size: 12px;
          text-align: center;
          padding: 4px 0;
        }
      `}</style>
    </div>
  );
}