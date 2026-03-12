// src/components/dashboard/DashboardCharts/TotalEmissionsPie.jsx
import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useEmissionStore } from '../../../store/emissionStore';

const COLORS = {
  scope1: "#3B82F6",
  scope2: "#F59E0B"
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function TotalEmissionsPie() {
  const scope1Total = useEmissionStore((s) => s.scope1Total || 0);
  const scope2Total = useEmissionStore((s) => s.scope2Total || 0);

  const data = [
    { name: "Scope 1", value: scope1Total },
    { name: "Scope 2", value: scope2Total },
  ].filter(item => item.value > 0); // Only show non-zero values

  // If no data, show empty state
  if (data.length === 0) {
    return (
      <div className="empty-chart">
        <p>No emissions data yet</p>
        <style jsx>{`
          .empty-chart {
            height: 250px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #9CA3AF;
            font-size: 14px;
            background: #F9FAFB;
            border-radius: 12px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="pie-chart-container">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={index === 0 ? COLORS.scope1 : COLORS.scope2}
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '12px'
            }}
            formatter={(value) => [`${value.toFixed(1)} tCO₂e`, '']}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value) => <span style={{ color: '#374151', fontSize: '12px' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>

      <style jsx>{`
        .pie-chart-container {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}