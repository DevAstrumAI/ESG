// src/components/dashboard/DashboardCharts/EmissionsTrendLine.jsx
import React, { useState, useMemo } from "react";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, Legend,
  CartesianGrid, ResponsiveContainer
} from "recharts";
import { useEmissionStore } from "../../../store/emissionStore";

const MONTH_LABELS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec"
];

export default function EmissionsTrendLine() {
  const [chartType, setChartType] = useState("line");

  const scope1Results = useEmissionStore((s) => s.scope1Results);
  const scope2Results = useEmissionStore((s) => s.scope2Results);
  const selectedYear  = useEmissionStore((s) => s.selectedYear);

  // Build one data point per month using what the store has.
  // The summary endpoint returns annual aggregates, not monthly breakdowns,
  // so we build a single "current total" point and pad the rest as 0
  // until monthly-level history is available from the backend.
  const chartData = useMemo(() => {
    const scope1Tonnes = (scope1Results?.total?.kgCO2e || 0) / 1000;
    const scope2Tonnes = (scope2Results?.total?.kgCO2e || 0) / 1000;

    const currentMonth = new Date().getMonth(); // 0-indexed

    return MONTH_LABELS.map((month, index) => {
      const isPast    = index < currentMonth;
      const isCurrent = index === currentMonth;

      return {
        month,
        Scope1: isCurrent ? parseFloat(scope1Tonnes.toFixed(2)) : isPast ? 0 : null,
        Scope2: isCurrent ? parseFloat(scope2Tonnes.toFixed(2)) : isPast ? 0 : null,
      };
    }).filter((d) => d.Scope1 !== null);
  }, [scope1Results, scope2Results]);

  const hasData = chartData.some(
    (d) => (d.Scope1 || 0) > 0 || (d.Scope2 || 0) > 0
  );

  const totalScope1 = chartData.reduce((sum, d) => sum + (d.Scope1 || 0), 0);
  const totalScope2 = chartData.reduce((sum, d) => sum + (d.Scope2 || 0), 0);
  const monthlyAvg  = chartData.length > 0
    ? ((totalScope1 + totalScope2) / chartData.length).toFixed(2)
    : 0;

  const peakMonth = chartData.reduce(
    (max, d) =>
      (d.Scope1 || 0) + (d.Scope2 || 0) > (max.Scope1 || 0) + (max.Scope2 || 0)
        ? d : max,
    chartData[0] || {}
  );
  const peakTotal = peakMonth
    ? ((peakMonth.Scope1 || 0) + (peakMonth.Scope2 || 0)).toFixed(2)
    : 0;

  if (!hasData) {
    return (
      <div className="trend-empty">
        <p>No trend data yet</p>
        <span>Submit Scope 1 and Scope 2 data to see your emissions trend</span>
        <style jsx>{`
          .trend-empty {
            height: 300px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #9CA3AF;
            text-align: center;
          }
          .trend-empty p { font-size: 14px; margin: 0 0 4px; color: #6B7280; }
          .trend-empty span { font-size: 12px; }
        `}</style>
      </div>
    );
  }

  const commonProps = {
    data: chartData,
    margin: { top: 20, right: 30, left: 20, bottom: 10 },
  };

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: "white",
      border: "1px solid #E5E7EB",
      borderRadius: "8px",
      padding: "8px 12px",
      fontSize: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    },
    formatter: (value) => [`${value} tCO₂e`, ""],
  };

  const axisProps = {
    xAxis: (
      <XAxis
        dataKey="month"
        tick={{ fill: "#6B7280", fontSize: 12 }}
        axisLine={{ stroke: "#E5E7EB" }}
      />
    ),
    yAxis: (
      <YAxis
        tick={{ fill: "#6B7280", fontSize: 12 }}
        axisLine={{ stroke: "#E5E7EB" }}
        label={{
          value: "tCO₂e",
          angle: -90,
          position: "insideLeft",
          fill: "#6B7280",
          fontSize: 12,
        }}
      />
    ),
    grid: <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />,
    legend: (
      <Legend
        verticalAlign="top"
        height={36}
        formatter={(value) => (
          <span style={{ color: "#374151", fontSize: "12px", fontWeight: 500 }}>
            {value}
          </span>
        )}
      />
    ),
  };

  return (
    <div className="trend-chart-container">
      {/* Controls */}
      <div className="chart-controls">
        <div className="year-label">{selectedYear}</div>
        <div className="chart-type-toggle">
          <button
            className={`type-btn ${chartType === "line" ? "active" : ""}`}
            onClick={() => setChartType("line")}
          >
            Line
          </button>
          <button
            className={`type-btn ${chartType === "area" ? "active" : ""}`}
            onClick={() => setChartType("area")}
          >
            Area
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          {chartType === "line" ? (
            <LineChart {...commonProps}>
              {axisProps.grid}
              {axisProps.xAxis}
              {axisProps.yAxis}
              <Tooltip {...tooltipStyle} />
              {axisProps.legend}
              <Line
                type="monotone"
                dataKey="Scope1"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: "#3B82F6", r: 4 }}
                activeDot={{ r: 6, fill: "#3B82F6", stroke: "white", strokeWidth: 2 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="Scope2"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={{ fill: "#F59E0B", r: 4 }}
                activeDot={{ r: 6, fill: "#F59E0B", stroke: "white", strokeWidth: 2 }}
                connectNulls
              />
            </LineChart>
          ) : (
            <AreaChart {...commonProps}>
              {axisProps.grid}
              {axisProps.xAxis}
              {axisProps.yAxis}
              <Tooltip {...tooltipStyle} />
              {axisProps.legend}
              <Area
                type="monotone"
                dataKey="Scope1"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.15}
                strokeWidth={2}
                connectNulls
              />
              <Area
                type="monotone"
                dataKey="Scope2"
                stroke="#F59E0B"
                fill="#F59E0B"
                fillOpacity={0.15}
                strokeWidth={2}
                connectNulls
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="chart-footer">
        <div className="insight-badge">
          <span className="insight-dot" />
          {peakTotal > 0
            ? `Peak: ${peakMonth.month} (${peakTotal} tCO₂e)`
            : "Tracking emissions this year"}
        </div>
        <div className="average-display">
          <span className="avg-label">Monthly Avg:</span>
          <span className="avg-value">{monthlyAvg} tCO₂e</span>
        </div>
      </div>

      <style jsx>{`
        .trend-chart-container { width: 100%; }

        .chart-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .year-label {
          font-size: 13px;
          font-weight: 600;
          color: #6B7280;
          padding: 6px 14px;
          background: #F3F4F6;
          border-radius: 30px;
        }

        .chart-type-toggle {
          display: flex;
          gap: 4px;
          background: #F3F4F6;
          padding: 4px;
          border-radius: 30px;
        }

        .type-btn {
          padding: 6px 16px;
          border: none;
          background: transparent;
          border-radius: 30px;
          font-size: 13px;
          font-weight: 500;
          color: #6B7280;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .type-btn.active {
          background: white;
          color: #1B4D3E;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }

        .chart-wrapper {
          width: 100%;
          height: 300px;
          margin-bottom: 12px;
        }

        .chart-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid #E5E7EB;
        }

        .insight-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #F8FAF8;
          padding: 7px 14px;
          border-radius: 30px;
          font-size: 13px;
          color: #2E7D64;
          border: 1px solid #E5E7EB;
        }

        .insight-dot {
          width: 7px;
          height: 7px;
          background: #2E7D64;
          border-radius: 50%;
          flex-shrink: 0;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .average-display { font-size: 13px; }
        .avg-label { color: #6B7280; margin-right: 4px; }
        .avg-value { font-weight: 600; color: #1B4D3E; }

        @media (max-width: 768px) {
          .chart-footer { flex-direction: column; gap: 10px; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}