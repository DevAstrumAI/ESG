// src/components/dashboard/DashboardCharts/EmissionsTrendLine.jsx
import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer, Area, AreaChart } from "recharts";
import { FiCalendar } from "react-icons/fi";

// Mock historical data - in real app, this would come from store
const mockData = [
  { month: "Jan", Scope1: 120, Scope2: 80, total: 200 },
  { month: "Feb", Scope1: 150, Scope2: 90, total: 240 },
  { month: "Mar", Scope1: 130, Scope2: 100, total: 230 },
  { month: "Apr", Scope1: 160, Scope2: 110, total: 270 },
  { month: "May", Scope1: 140, Scope2: 95, total: 235 },
  { month: "Jun", Scope1: 170, Scope2: 105, total: 275 },
];

export default function EmissionsTrendLine() {
  const [timeRange, setTimeRange] = useState("6m");
  const [chartType, setChartType] = useState("line");

  const timeRanges = [
    { label: "3M", value: "3m" },
    { label: "6M", value: "6m" },
    { label: "1Y", value: "1y" },
    { label: "YTD", value: "ytd" },
  ];

  return (
    <div className="trend-chart-container">
      <div className="chart-controls">
        <div className="range-selector">
          {timeRanges.map((range) => (
            <button
              key={range.value}
              className={`range-btn ${timeRange === range.value ? 'active' : ''}`}
              onClick={() => setTimeRange(range.value)}
            >
              {range.label}
            </button>
          ))}
        </div>
        <div className="chart-type-toggle">
          <button
            className={`type-btn ${chartType === 'line' ? 'active' : ''}`}
            onClick={() => setChartType('line')}
          >
            Line
          </button>
          <button
            className={`type-btn ${chartType === 'area' ? 'active' : ''}`}
            onClick={() => setChartType('area')}
          >
            Area
          </button>
        </div>
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          {chartType === 'line' ? (
            <LineChart data={mockData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: '#6B7280', fontSize: 12 }}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis 
                tick={{ fill: '#6B7280', fontSize: 12 }}
                axisLine={{ stroke: '#E5E7EB' }}
                label={{ value: 'tCO₂e', angle: -90, position: 'insideLeft', fill: '#6B7280', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                formatter={(value) => [`${value} tCO₂e`, '']}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                formatter={(value) => <span style={{ color: '#374151', fontSize: '12px', fontWeight: 500 }}>{value}</span>}
              />
              <Line 
                type="monotone" 
                dataKey="Scope1" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', r: 4 }}
                activeDot={{ r: 6, fill: '#3B82F6', stroke: 'white', strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="Scope2" 
                stroke="#F59E0B" 
                strokeWidth={2}
                dot={{ fill: '#F59E0B', r: 4 }}
                activeDot={{ r: 6, fill: '#F59E0B', stroke: 'white', strokeWidth: 2 }}
              />
            </LineChart>
          ) : (
            <AreaChart data={mockData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: '#6B7280', fontSize: 12 }}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis 
                tick={{ fill: '#6B7280', fontSize: 12 }}
                axisLine={{ stroke: '#E5E7EB' }}
                label={{ value: 'tCO₂e', angle: -90, position: 'insideLeft', fill: '#6B7280', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                formatter={(value) => [`${value} tCO₂e`, '']}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                formatter={(value) => <span style={{ color: '#374151', fontSize: '12px', fontWeight: 500 }}>{value}</span>}
              />
              <Area 
                type="monotone" 
                dataKey="Scope1" 
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="Scope2" 
                stroke="#F59E0B" 
                fill="#F59E0B" 
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="chart-footer">
        <div className="insight-badge">
          <span className="insight-dot"></span>
          <span>Peak emissions in April (270 tCO₂e)</span>
        </div>
        <div className="average-display">
          <span className="avg-label">Monthly Avg:</span>
          <span className="avg-value">242 tCO₂e</span>
        </div>
      </div>

      <style jsx>{`
        .trend-chart-container {
          background: white;
          border-radius: 16px;
          width: 100%;
        }

        .chart-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .range-selector {
          display: flex;
          gap: 8px;
          background: #F3F4F6;
          padding: 4px;
          border-radius: 30px;
        }

        .range-btn {
          padding: 6px 16px;
          border: none;
          background: transparent;
          border-radius: 30px;
          font-size: 13px;
          font-weight: 500;
          color: #6B7280;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .range-btn.active {
          background: white;
          color: #15803D;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .chart-type-toggle {
          display: flex;
          gap: 8px;
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
          transition: all 0.2s ease;
        }

        .type-btn.active {
          background: white;
          color: #15803D;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .chart-wrapper {
          width: 100%;
          height: 300px;
          margin-bottom: 16px;
        }

        .chart-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid rgba(34, 197, 94, 0.1);
        }

        .insight-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #F0FDF4;
          padding: 8px 16px;
          border-radius: 30px;
          font-size: 13px;
          color: #15803D;
        }

        .insight-dot {
          width: 8px;
          height: 8px;
          background: #22C55E;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .average-display {
          font-size: 13px;
        }

        .avg-label {
          color: #6B7280;
          margin-right: 4px;
        }

        .avg-value {
          font-weight: 600;
          color: #14532D;
        }

        @media (max-width: 768px) {
          .chart-controls {
            flex-direction: column;
            align-items: flex-start;
          }

          .chart-footer {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}