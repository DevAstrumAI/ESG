// src/components/dashboard/DashboardCharts/TwelveMonthTrendChart.jsx
import React, { useState, useEffect, useCallback } from "react";
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
import { FiAlertCircle, FiRefreshCw } from "react-icons/fi";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

export default function TwelveMonthTrendChart({ year, onDataLoad }) {
  const token = useAuthStore((s) => s.token);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const fetchMonthlyData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError("Authentication required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/emissions/monthly-breakdown?year=${year}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Endpoint not found - use fallback
          await fetchFallbackData();
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform data into chart format
      const transformedData = months.map((month, index) => {
        const monthNum = index + 1;
        const monthStr = `${year}-${String(monthNum).padStart(2, '0')}`;
        const existingData = data.find(d => d.month === monthStr);
        
        return {
          name: month,
          month: monthStr,
          scope1: existingData?.scope1Kg || 0,
          scope2: existingData?.scope2Kg || 0,
          total: (existingData?.scope1Kg || 0) + (existingData?.scope2Kg || 0),
          hasData: existingData?.hasData || false,
        };
      });
      
      setChartData(transformedData);
      if (onDataLoad) onDataLoad(transformedData);
      
    } catch (err) {
      console.error("Error fetching monthly data:", err);
      setError(err.message);
      await fetchFallbackData();
    } finally {
      setLoading(false);
    }
  }, [token, year, onDataLoad]);

  const fetchFallbackData = async () => {
    // Fallback: Use summary endpoint to get total and distribute
    try {
      const response = await fetch(`${API_URL}/api/emissions/summary?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        const totalScope1 = data.scope1?.totalKgCO2e || 0;
        const totalScope2 = data.scope2?.locationBasedKgCO2e || 0;
        const hasAnyData = totalScope1 > 0 || totalScope2 > 0;
        
        // Try to find which months have data from predictions endpoint
        let monthsWithData = [];
        try {
          const predResponse = await fetch(`${API_URL}/api/predictions?year=${year}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (predResponse.ok) {
            const predData = await predResponse.json();
            monthsWithData = predData.series?.monthly?.map(m => m.month) || [];
          }
        } catch (e) {
          // Ignore prediction errors
        }
        
        const transformedData = months.map((month, index) => {
          const monthNum = index + 1;
          const monthStr = `${year}-${String(monthNum).padStart(2, '0')}`;
          const hasMonthData = monthsWithData.includes(monthStr);
          
          // Distribute totals to months that have data
          let scope1Value = 0;
          let scope2Value = 0;
          
          if (hasMonthData && monthsWithData.length > 0) {
            // Evenly distribute if multiple months have data
            scope1Value = totalScope1 / monthsWithData.length;
            scope2Value = totalScope2 / monthsWithData.length;
          } else if (hasAnyData && !hasMonthData && index === new Date().getMonth()) {
            // Put all data in current month as fallback
            scope1Value = totalScope1;
            scope2Value = totalScope2;
          }
          
          return {
            name: month,
            month: monthStr,
            scope1: scope1Value,
            scope2: scope2Value,
            total: scope1Value + scope2Value,
            hasData: hasMonthData || (hasAnyData && !monthsWithData.length && index === new Date().getMonth()),
          };
        });
        
        setChartData(transformedData);
        if (onDataLoad) onDataLoad(transformedData);
      } else {
        // No data at all - show empty chart
        const emptyData = months.map((month, index) => ({
          name: month,
          month: `${year}-${String(index + 1).padStart(2, '0')}`,
          scope1: 0,
          scope2: 0,
          total: 0,
          hasData: false,
        }));
        setChartData(emptyData);
        if (onDataLoad) onDataLoad(emptyData);
      }
    } catch (err) {
      console.error("Fallback also failed:", err);
      const emptyData = months.map((month, index) => ({
        name: month,
        month: `${year}-${String(index + 1).padStart(2, '0')}`,
        scope1: 0,
        scope2: 0,
        total: 0,
        hasData: false,
      }));
      setChartData(emptyData);
      if (onDataLoad) onDataLoad(emptyData);
    }
  };

  useEffect(() => {
    fetchMonthlyData();
  }, [fetchMonthlyData, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const scope1Value = data.scope1 / 1000;
      const scope2Value = data.scope2 / 1000;
      const totalValue = (data.scope1 + data.scope2) / 1000;
      
      return (
        <div className="custom-tooltip">
          <div className="tooltip-title">{label} {year}</div>
          {data.hasData ? (
            <>
              <div className="tooltip-item scope1">
                <span className="tooltip-color"></span>
                <span className="tooltip-label">Scope 1:</span>
                <span className="tooltip-value">{scope1Value.toFixed(2)} tCO₂e</span>
              </div>
              <div className="tooltip-item scope2">
                <span className="tooltip-color"></span>
                <span className="tooltip-label">Scope 2:</span>
                <span className="tooltip-value">{scope2Value.toFixed(2)} tCO₂e</span>
              </div>
              <div className="tooltip-item total">
                <span className="tooltip-label">Total:</span>
                <span className="tooltip-value">{totalValue.toFixed(2)} tCO₂e</span>
              </div>
            </>
          ) : (
            <div className="tooltip-no-data">
              <FiAlertCircle size={14} />
              <span>No data submitted</span>
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
        <span>Loading monthly data...</span>
      </div>
    );
  }

  if (error && !chartData.length) {
    return (
      <div className="chart-error">
        <FiAlertCircle size={24} />
        <p>Unable to load chart data</p>
        <button onClick={handleRetry} className="retry-btn">
          <FiRefreshCw /> Retry
        </button>
      </div>
    );
  }

  const hasAnyData = chartData.some(d => d.hasData);

  return (
    <div className="twelve-month-chart">
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
          <Bar dataKey="scope1" name="Scope 1" stackId="stack" fill="#14B8A6" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-scope1-${index}`}
                fill={entry.hasData ? "#14B8A6" : "#E5E7EB"}
                fillOpacity={entry.hasData ? 1 : 0.5}
              />
            ))}
          </Bar>
          <Bar dataKey="scope2" name="Scope 2" stackId="stack" fill="#3B82F6" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-scope2-${index}`}
                fill={entry.hasData ? "#3B82F6" : "#E5E7EB"}
                fillOpacity={entry.hasData ? 1 : 0.5}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      <div className="chart-note">
        {!hasAnyData ? (
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
        .twelve-month-chart {
          width: 100%;
          min-height: 400px;
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
        }
        
        .retry-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
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
          min-width: 160px;
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
        
        .tooltip-item.scope1 .tooltip-color {
          background: #14B8A6;
        }
        
        .tooltip-item.scope2 .tooltip-color {
          background: #3B82F6;
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
          display: flex;
          align-items: center;
          gap: 8px;
          color: #9CA3AF;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}