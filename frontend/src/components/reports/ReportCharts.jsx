// src/components/reports/ReportCharts.jsx
import React from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Area, ComposedChart, Area as RechartsArea
} from "recharts";

// Color palette
const COLORS = {
  scope1: "#3B82F6",
  scope2: "#F97316",
  mobile: "#3B82F6",
  stationary: "#F59E0B",
  refrigerant: "#06B6D4",
  fugitive: "#EF4444",
  electricity: "#8B5CF6",
  heating: "#F97316",
  target: "#10B981",
  actual: "#6B7280"
};

export default function ReportCharts({ charts }) {
  if (!charts) {
    return (
      <div className="charts-placeholder">
        <p>No chart data available</p>
        <style jsx>{`
          .charts-placeholder {
            text-align: center;
            padding: 40px;
            color: #9CA3AF;
            background: #F9FAFB;
            border-radius: 12px;
          }
        `}</style>
      </div>
    );
  }

  // 1. Donut Chart: Scope 1 vs Scope 2
  const DonutChart = () => {
    const data = charts.scope_share_pie || [];
    if (data.length === 0) return null;

    return (
      <div className="chart-container">
        <h4>Emissions by Scope</h4>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.name === "Scope 1 — Direct" ? COLORS.scope1 : COLORS.scope2} 
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => [`${value} tCO₂e`, "Emissions"]}
              contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // 2. Bar Chart: Category breakdown
  const BarChartComponent = () => {
    const data = charts.category_bar || [];
    if (data.length === 0) return null;

    // Color mapping by category
    const getBarColor = (category) => {
      const colorMap = {
        "Mobile Combustion": COLORS.mobile,
        "Stationary Combustion": COLORS.stationary,
        "Refrigerant Leakage": COLORS.refrigerant,
        "Fugitive Emissions": COLORS.fugitive,
        "Electricity": COLORS.electricity,
        "Heating & Cooling": COLORS.heating
      };
      return colorMap[category] || "#6B7280";
    };

    return (
      <div className="chart-container">
        <h4>Emissions by Category</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" tickFormatter={(value) => `${value} t`} />
            <YAxis 
              type="category" 
              dataKey="category" 
              width={120}
              tick={{ fontSize: 11 }}
            />
            <Tooltip 
              formatter={(value) => [`${value} tCO₂e`, "Emissions"]}
              contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB" }}
            />
            <Bar 
              dataKey="tCO2e" 
              fill="#2E7D64"
              radius={[0, 4, 4, 0]}
              barSize={20}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.category)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // 3. Line Chart: Trend with target pathway
  const TrendChart = () => {
    const data = charts.trend_line || [];
    if (data.length === 0) return null;

    // Separate actual and projected data
    const actualData = data.filter(d => d.actual_tCO2e !== null && d.actual_tCO2e !== undefined);
    const projectedData = data.filter(d => d.target_tCO2e !== null && d.target_tCO2e !== undefined);

    return (
      <div className="chart-container">
        <h4>Emissions Trend & Reduction Pathway</h4>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="year" 
              tick={{ fontSize: 11 }}
              interval={2}
            />
            <YAxis 
              tickFormatter={(value) => `${value} t`}
              label={{ value: "tCO₂e", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
            />
            <Tooltip 
              formatter={(value, name) => {
                if (name === "actual_tCO2e") return [`${value} tCO₂e`, "Actual"];
                if (name === "target_tCO2e") return [`${value} tCO₂e`, "Target"];
                return [value, name];
              }}
              contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB" }}
            />
            <Legend verticalAlign="top" height={36} />
            
            {/* Actual emissions line */}
            <Line
              type="monotone"
              dataKey="actual_tCO2e"
              stroke={COLORS.actual}
              strokeWidth={2}
              dot={{ r: 4, fill: COLORS.actual }}
              name="Actual Emissions"
              connectNulls={false}
            />
            
            {/* Target pathway (dashed) */}
            <Line
              type="monotone"
              dataKey="target_tCO2e"
              stroke={COLORS.target}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: COLORS.target }}
              name="SBTi Target Pathway"
              connectNulls={true}
            />
            
            {/* Area for target projection */}
            <RechartsArea
              type="monotone"
              dataKey="target_tCO2e"
              fill={COLORS.target}
              fillOpacity={0.1}
              stroke="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="chart-note">
          <span>🔵 Actual emissions</span>
          <span>🟢 Dashed line: 42% reduction by 2030, 90% by 2050 (SBTi 1.5°C aligned)</span>
        </div>
      </div>
    );
  };

  return (
    <div className="report-charts">
      <div className="charts-grid">
        <DonutChart />
        <BarChartComponent />
      </div>
      <TrendChart />
      
      <style jsx>{`
        .report-charts {
          margin-bottom: 24px;
        }
        
        .charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }
        
        .chart-container {
          background: white;
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #E5E7EB;
        }
        
        .chart-container h4 {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 16px;
          text-align: center;
        }
        
        .chart-note {
          margin-top: 12px;
          padding: 8px 12px;
          background: #F8FAF8;
          border-radius: 6px;
          font-size: 11px;
          color: #6B7280;
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        @media (max-width: 768px) {
          .charts-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
}