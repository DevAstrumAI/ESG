// src/components/dashboard/DashboardCharts/TotalEmissionsPie.jsx
import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useEmissionStore } from "../../../store/emissionStore";
import { FiBarChart2 } from "react-icons/fi";

export default function TotalEmissionsPie() {
  const scope1Results = useEmissionStore((s) => s.scope1Results);
  const scope2Results = useEmissionStore((s) => s.scope2Results);

  const scope1Kg = scope1Results?.total?.kgCO2e || 0;
  const scope2Kg = scope2Results?.locationBasedKgCO2e || 0;
  const totalKg = scope1Kg + scope2Kg;

  // If no data, show empty state
  if (totalKg === 0) {
    return (
      <div className="empty-chart">
        <FiBarChart2 size={48} />
        <p>No emissions data yet</p>
        <span>Submit Scope 1 and Scope 2 data to see distribution</span>
        <style jsx>{`
          .empty-chart {
            text-align: center;
            color: #9CA3AF;
            padding: 40px 20px;
          }
          .empty-chart svg {
            margin-bottom: 12px;
            opacity: 0.5;
          }
          .empty-chart p {
            font-size: 14px;
            margin: 0 0 4px;
            color: #6B7280;
          }
          .empty-chart span {
            font-size: 12px;
            color: #9CA3AF;
          }
        `}</style>
      </div>
    );
  }

  const data = [
    { name: "Scope 1", value: scope1Kg, color: "#3B82F6" },
    { name: "Scope 2", value: scope2Kg, color: "#F97316" },
  ];

  const formatValue = (value) => `${(value / 1000).toFixed(1)} tCO₂e`;

  return (
    <div style={{ width: "100%", height: "100%", minHeight: "280px" }}>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={formatValue}
            contentStyle={{ 
              borderRadius: "8px", 
              border: "1px solid #E5E7EB",
              backgroundColor: "white",
              padding: "8px 12px",
              fontSize: "12px"
            }}
          />
          <Legend 
            layout="horizontal"
            align="center"
            verticalAlign="bottom"
            formatter={(value, entry, index) => {
              const item = data[index];
              const percent = ((item.value / totalKg) * 100).toFixed(0);
              return `${value}: ${percent}% (${formatValue(item.value)})`;
            }}
            wrapperStyle={{ 
              fontSize: "12px", 
              paddingTop: "16px"
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}