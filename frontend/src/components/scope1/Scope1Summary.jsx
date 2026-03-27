// src/components/scope1/Scope1Summary.jsx
import React, { useEffect } from "react";
import { useEmissionStore } from "../../store/emissionStore";
import Card from "../ui/Card";

export default function Scope1Summary() {
  const vehicles = useEmissionStore((s) => s.scope1Vehicles);
  const stationary = useEmissionStore((s) => s.scope1Stationary);
  const refrigerants = useEmissionStore((s) => s.scope1Refrigerants);
  const fugitive = useEmissionStore((s) => s.scope1Fugitive);

  const scope1Results = useEmissionStore((s) => s.scope1Results);

  const totals = scope1Results ? {
    vehicles: scope1Results.mobile?.kgCO2e || 0,
    stationary: scope1Results.stationary?.kgCO2e || 0,
    refrigerants: scope1Results.refrigerants?.kgCO2e || 0,
    fugitive: scope1Results.fugitive?.kgCO2e || 0,
    co2e: scope1Results.total?.kgCO2e || 0,
    biogenic: scope1Results.biogenic?.totalKgCO2e || 0,
  } : { 
    vehicles: 0, 
    stationary: 0, 
    refrigerants: 0, 
    fugitive: 0, 
    co2e: 0,
    biogenic: 0 
  };

  const hasData = vehicles.length > 0 || stationary.length > 0 || refrigerants.length > 0 || fugitive.length > 0;
  const hasBiogenic = totals.biogenic > 0;

  const formatNumber = (num) => {
    return (num ?? 0).toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  const total = totals.co2e ?? 0;
  const getPercentage = (value) => {
    if (total === 0) return 0;
    return ((value ?? 0) / total * 100).toFixed(1);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      vehicles: "🚗",
      stationary: "🏭",
      refrigerants: "❄️",
      fugitive: "💨",
      biogenic: "🌿"
    };
    return icons[category] || "📊";
  };

  return (
    <div className="summary-wrapper">
      <Card className="summary-card">
        <div className="summary-header">
          <div className="header-icon">📊</div>
          <div className="header-title">
            <h3>Scope 1 Emissions Summary</h3>
            <p>Direct emissions from owned or controlled sources</p>
          </div>
        </div>

        {!hasData ? (
          <div className="empty-summary">
            <div className="empty-icon">📈</div>
            <h4>No emissions data yet</h4>
            <p>Add entries in each category to see your Scope 1 totals</p>
          </div>
        ) : (
          <>
            {hasData && !scope1Results && (
              <div className="warning-banner">
                ⚠️ Click "Submit Scope 1" below to calculate your CO₂e emissions.
              </div>
            )}

            <div className="total-banner">
              <div className="total-label">Total CO₂e Emissions</div>
              <div className="total-value">{formatNumber(total)} kg</div>
              <div className="total-equivalent">
                ≈ {(total / 1000).toFixed(2)} tonnes CO₂e
              </div>
            </div>

            {hasBiogenic && (
              <div className="biogenic-banner">
                <div className="biogenic-icon">🌿</div>
                <div className="biogenic-content">
                  <div className="biogenic-label">Biogenic CO₂ (reported separately)</div>
                  <div className="biogenic-value">{formatNumber(totals.biogenic)} kg</div>
                  <div className="biogenic-equivalent">
                    ≈ {(totals.biogenic / 1000).toFixed(2)} tonnes CO₂e
                  </div>
                </div>
                <div className="biogenic-note">
                  Per GHG Protocol, biogenic CO₂ from biomass combustion is reported separately and not included in Scope 1 totals.
                </div>
              </div>
            )}

            <div className="breakdown-grid">
              {/* Vehicles */}
              <div className="breakdown-item">
                <div className="item-header">
                  <span className="item-icon">{getCategoryIcon('vehicles')}</span>
                  <span className="item-title">Mobile Combustion</span>
                  <span className="item-percentage">{getPercentage(totals.vehicles)}%</span>
                </div>
                <div className="item-value">{formatNumber(totals.vehicles)} kg</div>
                <div className="item-stats">
                  <span className="stat">{vehicles.length} vehicles</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill vehicles" 
                    style={{ width: `${getPercentage(totals.vehicles)}%` }}
                  ></div>
                </div>
              </div>

              {/* Stationary */}
              <div className="breakdown-item">
                <div className="item-header">
                  <span className="item-icon">{getCategoryIcon('stationary')}</span>
                  <span className="item-title">Stationary Combustion</span>
                  <span className="item-percentage">{getPercentage(totals.stationary)}%</span>
                </div>
                <div className="item-value">{formatNumber(totals.stationary)} kg</div>
                <div className="item-stats">
                  <span className="stat">{stationary.length} sources</span>
                  {scope1Results?.stationary?.entries?.some(e => e.isBiogenic) && (
                    <span className="stat biogenic-badge">🌿 includes biogenic</span>
                  )}
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill stationary" 
                    style={{ width: `${getPercentage(totals.stationary)}%` }}
                  ></div>
                </div>
              </div>

              {/* Refrigerants */}
              <div className="breakdown-item">
                <div className="item-header">
                  <span className="item-icon">{getCategoryIcon('refrigerants')}</span>
                  <span className="item-title">Refrigerants</span>
                  <span className="item-percentage">{getPercentage(totals.refrigerants)}%</span>
                </div>
                <div className="item-value">{formatNumber(totals.refrigerants)} kg</div>
                <div className="item-stats">
                  <span className="stat">{refrigerants.length} entries</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill refrigerants" 
                    style={{ width: `${getPercentage(totals.refrigerants)}%` }}
                  ></div>
                </div>
              </div>

              {/* Fugitive */}
              <div className="breakdown-item">
                <div className="item-header">
                  <span className="item-icon">{getCategoryIcon('fugitive')}</span>
                  <span className="item-title">Fugitive Emissions</span>
                  <span className="item-percentage">{getPercentage(totals.fugitive)}%</span>
                </div>
                <div className="item-value">{formatNumber(totals.fugitive)} kg</div>
                <div className="item-stats">
                  <span className="stat">{fugitive.length} sources</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill fugitive" 
                    style={{ width: `${getPercentage(totals.fugitive)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="summary-footer">
              <div className="stat-item">
                <span className="stat-label">Data Sources</span>
                <span className="stat-number">
                  {vehicles.length + stationary.length + refrigerants.length + fugitive.length}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Categories</span>
                <span className="stat-number">
                  {[
                    vehicles.length > 0, 
                    stationary.length > 0, 
                    refrigerants.length > 0, 
                    fugitive.length > 0
                  ].filter(Boolean).length}/4
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total tCO₂e</span>
                <span className="stat-number highlight">{(total / 1000).toFixed(2)}</span>
              </div>
            </div>

            {hasBiogenic && (
              <div className="biogenic-footnote">
                <span>🌿 Biogenic CO₂ from biomass combustion is reported separately per GHG Protocol and not included in Scope 1 totals.</span>
              </div>
            )}
          </>
        )}
      </Card>

      <style jsx>{`
        .summary-wrapper {
          width: 100%;
          max-width: 100%;
          margin-top: 32px;
          overflow-x: hidden;
        }

        .summary-card {
          border: 1px solid #E5E7EB !important;
          border-radius: 12px !important;
          overflow: hidden;
          width: 100%;
          box-sizing: border-box;
        }

        .summary-card * {
          box-sizing: border-box;
        }

        .summary-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 24px;
          background: #F8FAF8;
          border-bottom: 1px solid #E5E7EB;
        }

        .header-icon {
          font-size: 32px;
          flex-shrink: 0;
        }

        .header-title {
          flex: 1;
        }

        .header-title h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
          font-weight: 600;
          color: #1B4D3E;
        }

        .header-title p {
          margin: 0;
          font-size: 13px;
          color: #6B7280;
        }

        .empty-summary {
          padding: 48px 24px;
          text-align: center;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-summary h4 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
          color: #374151;
        }

        .empty-summary p {
          margin: 0;
          font-size: 14px;
          color: #6B7280;
        }

        .warning-banner {
          margin: 20px 24px;
          padding: 12px 16px;
          background: #FEF3C7;
          border-radius: 8px;
          border: 1px solid #FCD34D;
          font-size: 14px;
          color: #92400E;
        }

        .total-banner {
          margin: 24px;
          padding: 24px;
          background: #1B4D3E;
          border-radius: 12px;
          text-align: center;
          color: white;
        }

        .total-label {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.8;
          margin-bottom: 8px;
        }

        .total-value {
          font-size: 42px;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 8px;
        }

        .total-equivalent {
          font-size: 16px;
          opacity: 0.8;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
        }

        .biogenic-banner {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 0 24px 24px;
          padding: 20px;
          background: #F0FDF4;
          border-radius: 12px;
          border: 1px solid #86EFAC;
        }

        .biogenic-icon {
          font-size: 32px;
          flex-shrink: 0;
        }

        .biogenic-content {
          flex: 1;
        }

        .biogenic-label {
          font-size: 14px;
          font-weight: 600;
          color: #166534;
          margin-bottom: 4px;
        }

        .biogenic-value {
          font-size: 24px;
          font-weight: 700;
          color: #15803D;
        }

        .biogenic-equivalent {
          font-size: 13px;
          color: #4A5568;
        }

        .biogenic-note {
          max-width: 300px;
          font-size: 12px;
          color: #4A5568;
          padding-left: 16px;
          border-left: 1px solid #86EFAC;
        }

        .breakdown-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          padding: 0 24px 24px;
        }

        .breakdown-item {
          background: #F9FAFB;
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #E5E7EB;
          transition: all 0.2s ease;
        }

        .breakdown-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border-color: #2E7D64;
        }

        .item-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .item-icon {
          font-size: 20px;
        }

        .item-title {
          flex: 1;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .item-percentage {
          font-size: 14px;
          font-weight: 700;
          color: #2E7D64;
          background: #E8F0EA;
          padding: 2px 8px;
          border-radius: 20px;
        }

        .item-value {
          font-size: 20px;
          font-weight: 700;
          color: #1B4D3E;
          margin-bottom: 8px;
        }

        .item-stats {
          margin-bottom: 12px;
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .stat {
          font-size: 12px;
          color: #6B7280;
          background: white;
          padding: 4px 8px;
          border-radius: 12px;
          display: inline-block;
        }

        .biogenic-badge {
          background: #E8F0EA;
          color: #2E7D64;
          border: 1px solid #C6E0C8;
        }

        .progress-bar {
          height: 6px;
          background: #E5E7EB;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .progress-fill.vehicles {
          background: #3B82F6;
        }

        .progress-fill.stationary {
          background: #F59E0B;
        }

        .progress-fill.refrigerants {
          background: #06B6D4;
        }

        .progress-fill.fugitive {
          background: #8B5CF6;
        }

        .summary-footer {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: #E5E7EB;
          border-top: 1px solid #E5E7EB;
        }

        .stat-item {
          background: white;
          padding: 20px;
          text-align: center;
        }

        .stat-label {
          display: block;
          font-size: 13px;
          color: #6B7280;
          margin-bottom: 8px;
        }

        .stat-number {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: #1B4D3E;
        }

        .stat-number.highlight {
          color: #2E7D64;
          font-size: 28px;
        }

        .biogenic-footnote {
          margin: 16px 24px 24px;
          padding: 12px 16px;
          background: #F9FAFB;
          border-radius: 8px;
          font-size: 12px;
          color: #6B7280;
          text-align: center;
          border: 1px solid #E5E7EB;
        }

        @media (max-width: 768px) {
          .breakdown-grid {
            grid-template-columns: 1fr;
            padding: 0 16px 16px;
          }

          .total-banner {
            margin: 16px;
            padding: 20px;
          }

          .total-value {
            font-size: 32px;
          }

          .biogenic-banner {
            flex-direction: column;
            text-align: center;
            margin: 0 16px 16px;
          }

          .biogenic-note {
            padding-left: 0;
            padding-top: 12px;
            border-left: none;
            border-top: 1px solid #86EFAC;
            max-width: 100%;
          }

          .summary-footer {
            grid-template-columns: 1fr;
          }

          .header-title h3,
          .header-title p {
            white-space: normal;
          }
        }

        @media (max-width: 480px) {
          .summary-header {
            flex-direction: column;
            text-align: center;
            padding: 16px;
          }

          .total-banner {
            margin: 12px;
            padding: 16px;
          }

          .total-value {
            font-size: 28px;
          }

          .breakdown-grid {
            padding: 0 12px 12px;
            gap: 12px;
          }

          .breakdown-item {
            padding: 12px;
          }

          .stat-item {
            padding: 16px;
          }

          .biogenic-value {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
}