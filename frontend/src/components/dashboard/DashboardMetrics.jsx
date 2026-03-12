// src/components/dashboard/DashboardMetrics.jsx
import React from "react";
import Card from "../ui/Card";
import { useEmissionStore } from "../../store/emissionStore";
import { FiArrowUp, FiArrowDown } from "react-icons/fi";

const MetricCard = ({ title, value, change, color, icon, breakdown }) => (
  <Card className="metric-card">
    <div className="metric-header">
      <span className="metric-title">{title}</span>
      <span className="metric-icon" style={{ background: `${color}20`, color }}>{icon}</span>
    </div>
    <div className="metric-value">
      {value > 0 ? value.toFixed(2) : "—"}
      <span className="metric-unit"> tCO₂e</span>
    </div>
    {breakdown && value > 0 && (
      <div className="metric-breakdown">
        {breakdown.map((item, i) => (
          <div key={i} className="breakdown-row">
            <span className="breakdown-label">{item.icon} {item.label}</span>
            <span className="breakdown-value">{(item.kg / 1000).toFixed(2)}t</span>
          </div>
        ))}
      </div>
    )}
    {value === 0 && (
      <div className="metric-empty">No data submitted yet</div>
    )}
    <div className="metric-footer">
      <span className={`trend ${change >= 0 ? "up" : "down"}`}>
        {change >= 0 ? <FiArrowUp /> : <FiArrowDown />}
        {Math.abs(change)}%
      </span>
      <span className="trend-label">vs last month</span>
    </div>
  </Card>
);

const DashboardMetrics = () => {
  const scope1Results = useEmissionStore((s) => s.scope1Results);
  const scope2Results = useEmissionStore((s) => s.scope2Results);

  const scope1Kg = scope1Results?.total?.kgCO2e || 0;
  const scope2Kg = scope2Results?.total?.kgCO2e || 0;
  const totalKg = scope1Kg + scope2Kg;

  const scope1Tonnes = scope1Kg / 1000;
  const scope2Tonnes = scope2Kg / 1000;
  const totalTonnes = totalKg / 1000;

  const scope1Breakdown = [
    { label: "Mobile", icon: "🚗", kg: scope1Results?.mobile?.kgCO2e || 0 },
    { label: "Stationary", icon: "🏭", kg: scope1Results?.stationary?.kgCO2e || 0 },
    { label: "Refrigerants", icon: "❄️", kg: scope1Results?.refrigerants?.kgCO2e || 0 },
    { label: "Fugitive", icon: "💨", kg: scope1Results?.fugitive?.kgCO2e || 0 },
  ].filter((item) => item.kg > 0);

  const scope2Breakdown = [
    { label: "Electricity", icon: "⚡", kg: scope2Results?.electricity?.kgCO2e || 0 },
    { label: "Heating", icon: "🔥", kg: scope2Results?.heating?.kgCO2e || 0 },
    { label: "Renewables", icon: "🌱", kg: scope2Results?.renewables?.kgCO2e || 0 },
  ].filter((item) => item.kg > 0);

  // static for now — wire to real comparison once backend supports it
  const changes = { scope1: -5.2, scope2: +2.1, total: -3.4 };

  return (
    <div className="metrics-grid">
      <MetricCard
        title="Scope 1 Emissions"
        value={scope1Tonnes}
        change={changes.scope1}
        color="#3B82F6"
        icon="🏭"
        breakdown={scope1Breakdown}
      />
      <MetricCard
        title="Scope 2 Emissions"
        value={scope2Tonnes}
        change={changes.scope2}
        color="#F59E0B"
        icon="⚡"
        breakdown={scope2Breakdown}
      />
      <MetricCard
        title="Total Emissions"
        value={totalTonnes}
        change={changes.total}
        color="#10B981"
        icon="🌍"
      />

      <style jsx>{`
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }

        .metric-card {
          background: white;
          border-radius: 20px;
          padding: 20px;
          border: 1px solid rgba(34, 197, 94, 0.1);
          transition: all 0.3s ease;
        }

        .metric-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(34, 197, 94, 0.15);
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .metric-title {
          font-size: 14px;
          font-weight: 500;
          color: #6b7280;
        }

        .metric-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        .metric-value {
          font-size: 32px;
          font-weight: 700;
          color: #14532d;
          margin-bottom: 12px;
        }

        .metric-unit {
          font-size: 14px;
          font-weight: 400;
          color: #9ca3af;
        }

        .metric-breakdown {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
          padding: 10px 12px;
          background: #f8faf8;
          border-radius: 10px;
          border: 1px solid rgba(34, 197, 94, 0.1);
        }

        .breakdown-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }

        .breakdown-label {
          color: #6b7280;
        }

        .breakdown-value {
          font-weight: 600;
          color: #14532d;
        }

        .metric-empty {
          font-size: 12px;
          color: #9ca3af;
          margin-bottom: 12px;
          font-style: italic;
        }

        .metric-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }

        .trend {
          display: flex;
          align-items: center;
          gap: 2px;
          font-weight: 600;
        }

        .trend.up {
          color: #ef4444;
        }

        .trend.down {
          color: #10b981;
        }

        .trend-label {
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardMetrics;