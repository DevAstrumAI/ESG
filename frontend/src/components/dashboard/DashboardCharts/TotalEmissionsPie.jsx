// src/components/dashboard/DashboardCharts/TotalEmissionsPie.jsx
import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useEmissionStore } from "../../../store/emissionStore";
import { FiBarChart2 } from "react-icons/fi";

export default function TotalEmissionsPie({ data }) {
  // Always call hooks at the top level (unconditionally)
  const scope1Results = useEmissionStore((s) => s.scope1Results);
  const scope2Results = useEmissionStore((s) => s.scope2Results);
  
  // Determine which data to use
  let chartData = data;
  
  // If no data prop provided, use store data as fallback
  if (!chartData || chartData.length === 0) {
    const scope1Kg = scope1Results?.total?.kgCO2e || 0;
    const scope2Kg = scope2Results?.locationBasedKgCO2e || 0;
    
    if (scope1Kg === 0 && scope2Kg === 0) {
      chartData = [];
    } else {
      chartData = [
        { name: "Scope 1", value: scope1Kg / 1000, color: "#3B82F6" },
        { name: "Scope 2", value: scope2Kg / 1000, color: "#F97316" },
      ];
    }
  }

<<<<<<< Updated upstream
  if (totalKg === 0) {
=======
  // If no data, show empty state
  if (!chartData || chartData.length === 0 || chartData.every(d => d.value === 0)) {
>>>>>>> Stashed changes
    return (
      <div className="empty-chart" style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <FiBarChart2 size={48} style={{ opacity: 0.5 }} />
        <p>No emissions data yet</p>
        <span>Submit Scope 1 and Scope 2 data to see distribution</span>
      </div>
    );
  }

  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);
  
  const formatValue = (value) => `${value.toFixed(1)} tCO₂e`;

  // Calculate percentages
  const scope1Percent = ((scope1Kg / totalKg) * 100).toFixed(0);
  const scope2Percent = ((scope2Kg / totalKg) * 100).toFixed(0);

  return (
<<<<<<< Updated upstream
    <div style={{ width: "100%" }}>
      {/* Pie Chart */}
      <div style={{ width: "100%", height: 300, position: "relative" }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
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
              contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB", backgroundColor: "white", padding: "8px 12px", fontSize: "12px" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Custom Legend – outside the chart, fully flexible */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        marginTop: "16px",
        padding: "12px 16px",
        backgroundColor: "#F9FAFB",
        borderRadius: "8px",
        border: "1px solid #E5E7EB"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "12px", height: "12px", backgroundColor: "#3B82F6", borderRadius: "2px" }} />
            <span style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>Scope 1:</span>
            <span style={{ fontSize: "13px", color: "#1F2937" }}>{scope1Percent}% ({formatValue(scope1Kg)})</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "12px", height: "12px", backgroundColor: "#F97316", borderRadius: "2px" }} />
            <span style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>Scope 2:</span>
            <span style={{ fontSize: "13px", color: "#1F2937" }}>{scope2Percent}% ({formatValue(scope2Kg)})</span>
          </div>
        </div>
      </div>
=======
    <div style={{ width: "100%", height: "100%", minHeight: "280px" }}>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
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
              const item = chartData[index];
              const percent = ((item.value / totalValue) * 100).toFixed(1);
              return `${value}: ${percent}% (${formatValue(item.value)})`;
            }}
            wrapperStyle={{ 
              fontSize: "12px", 
              paddingTop: "16px"
            }}
          />
        </PieChart>
      </ResponsiveContainer>
>>>>>>> Stashed changes
    </div>
  );
}