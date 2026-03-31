// src/components/dashboard/DashboardCharts/EmissionsTrendLine.jsx
import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useEmissionStore } from "../../../store/emissionStore";

export default function EmissionsTrendLine() {
  const scope1Results = useEmissionStore((s) => s.scope1Results);
  const scope2Results = useEmissionStore((s) => s.scope2Results);

  // Mock data for trend (replace with actual monthly data when available)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  // Use actual data if available, otherwise zeros
  const scope1Kg = scope1Results?.total?.kgCO2e || 0;
  const scope2Kg = scope2Results?.total?.kgCO2e || 0;
  
  // Distribute annual total across months (placeholder logic – replace with real monthly data)
  const monthlyData = months.map((month, index) => ({
    name: month,
    scope1: (scope1Kg / 12) * (index + 1) / 2, // placeholder
    scope2: (scope2Kg / 12) * (index + 1) / 2,
  }));

  const maxValue = Math.max(scope1Kg, scope2Kg) / 1000;

  return (
    <div style={{ width: "100%", minHeight: 350, padding: "0 10px" }}>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart
          data={monthlyData}
          margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 11, fill: "#6B7280" }}
            tickMargin={10}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: "#6B7280" }}
            tickMargin={8}
            label={{ value: "tCO₂e", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "#6B7280" } }}
          />
          <Tooltip 
            formatter={(value) => `${value.toFixed(1)} tCO₂e`}
            contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB", backgroundColor: "white", padding: "8px 12px", fontSize: "12px" }}
          />
          <Legend wrapperStyle={{ paddingTop: "16px", fontSize: "12px" }} />
          <Line type="monotone" dataKey="scope1" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="Scope 1" />
          <Line type="monotone" dataKey="scope2" stroke="#F97316" strokeWidth={2} dot={{ r: 3 }} name="Scope 2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}