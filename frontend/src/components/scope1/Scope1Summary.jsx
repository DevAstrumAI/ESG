import React, { useEffect } from "react";
import { useEmissionStore } from "../../store/emissionStore";
import Card from "../ui/Card";

export default function Scope1Summary() {
  const vehicles = useEmissionStore((s) => s.scope1Vehicles);
  const stationary = useEmissionStore((s) => s.scope1Stationary);
  const refrigerants = useEmissionStore((s) => s.scope1Refrigerants);
  const fugitive = useEmissionStore((s) => s.scope1Fugitive);

  // Calculate totals using EmissionCalculator
  const scope1Results = useEmissionStore((s) => s.scope1Results);
  console.log("scope1Results:", scope1Results);

  // Use backend results if available, otherwise show 0
  const totals = scope1Results ? {
    vehicles: scope1Results.mobile?.kgCO2e || 0,
    stationary: scope1Results.stationary?.kgCO2e || 0,
    refrigerants: scope1Results.refrigerants?.kgCO2e || 0,
    fugitive: scope1Results.fugitive?.kgCO2e || 0,
    co2e: scope1Results.total?.kgCO2e || 0,
    biogenic: scope1Results.biogenic?.totalKgCO2e || 0, // Add biogenic total
  } : { 
    vehicles: 0, 
    stationary: 0, 
    refrigerants: 0, 
    fugitive: 0, 
    co2e: 0,
    biogenic: 0 
  };

  // Check if any data exists
  const hasData = vehicles.length > 0 || stationary.length > 0 || refrigerants.length > 0 || fugitive.length > 0;

  // Check if there are biogenic entries
  const hasBiogenic = totals.biogenic > 0;

  // Format large numbers with commas
  const formatNumber = (num) => {
    return (num ?? 0).toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  // Calculate percentages for each category (excluding biogenic)
  const total = totals.co2e ?? 0;
  const getPercentage = (value) => {
    if (total === 0) return 0;
    return ((value ?? 0) / total * 100).toFixed(1);
  };

  // Get category icon
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

  // Debug overflow (remove in production)
  useEffect(() => {
    const elements = document.querySelectorAll('.summary-card, .breakdown-grid, .summary-footer, .breakdown-item');
    elements.forEach(el => {
      if (el.scrollWidth > el.clientWidth) {
        console.log('Overflow element:', el, 'scrollWidth:', el.scrollWidth, 'clientWidth:', el.clientWidth);
      }
    });
  }, [hasData, totals]);

  return (
    <div className="summary-wrapper">
      {/* Main Summary Card */}
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
            <div style={{
              margin: "16px 24px",
              padding: "12px 16px",
              background: "#FEF9C3",
              borderRadius: "12px",
              border: "1px solid #FDE047",
              fontSize: "14px",
              color: "#854D0E"
            }}>
              ⚠️ Click "Submit Scope 1" below to calculate your CO₂e emissions.
            </div>
          )}
            {/* Total Emissions Banner */}
            <div className="total-banner">
              <div className="total-label">Total CO₂e Emissions</div>
              <div className="total-value">{formatNumber(total)} kg</div>
              <div className="total-equivalent">
                ≈ {(total / 1000).toFixed(2)} tonnes CO₂e
              </div>
            </div>

            {/* Biogenic Banner (if present) */}
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
                <div className="biogenic-note">Per GHG Protocol, biogenic CO₂ from biomass combustion is reported separately and not included in Scope 1 totals.</div>
              </div>
            )}

            {/* Category Breakdown Grid */}
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

              {/* Stationary - with biogenic indicator */}
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

            {/* Quick Stats Footer */}
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

            {/* Biogenic footnote */}
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
          clear: both;
          overflow-x: hidden;
        }

        .summary-card {
          border: 1px solid rgba(46, 125, 50, 0.2);
          overflow: hidden;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        /* Ensure all children respect boundaries */
        .summary-card * {
          box-sizing: border-box;
          max-width: 100%;
        }

        .summary-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 24px;
          background: linear-gradient(135deg, #f0f9f0 0%, #e6f3e6 100%);
          border-bottom: 1px solid rgba(46, 125, 50, 0.2);
          width: 100%;
        }

        .header-icon {
          font-size: 32px;
          flex-shrink: 0;
        }

        .header-title {
          flex: 1;
          min-width: 0;
        }

        .header-title h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
          font-weight: 700;
          color: #1B5E20;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .header-title p {
          margin: 0;
          font-size: 13px;
          color: #4B5563;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Empty State */
        .empty-summary {
          padding: 48px 24px;
          text-align: center;
          width: 100%;
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

        /* Total Banner */
        .total-banner {
          margin: 24px;
          padding: 24px;
          background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%);
          border-radius: 20px;
          text-align: center;
          color: white;
          box-shadow: 0 8px 20px rgba(46, 125, 50, 0.3);
          width: calc(100% - 48px);
          box-sizing: border-box;
        }

        .total-label {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.9;
          margin-bottom: 8px;
        }

        .total-value {
          font-size: 42px;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 8px;
          word-break: break-word;
        }

        .total-equivalent {
          font-size: 16px;
          opacity: 0.9;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
        }

        /* Biogenic Banner */
        .biogenic-banner {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 0 24px 24px;
          padding: 20px;
          background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
          border-radius: 16px;
          border: 1px solid #81C784;
          width: calc(100% - 48px);
          box-sizing: border-box;
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
          color: #2E7D32;
          margin-bottom: 4px;
        }

        .biogenic-value {
          font-size: 24px;
          font-weight: 700;
          color: #1B5E20;
          line-height: 1.2;
        }

        .biogenic-equivalent {
          font-size: 13px;
          color: #4B5563;
        }

        .biogenic-note {
          max-width: 300px;
          font-size: 12px;
          color: #4B5563;
          padding-left: 16px;
          border-left: 1px solid #81C784;
        }

        /* Breakdown Grid */
        .breakdown-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          padding: 0 24px 24px;
          width: 100%;
          box-sizing: border-box;
        }

        .breakdown-item {
          background: #f8faf8;
          border-radius: 16px;
          padding: 16px;
          border: 1px solid rgba(46, 125, 50, 0.1);
          transition: all 0.2s ease;
          width: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }

        .breakdown-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(46, 125, 50, 0.1);
          border-color: rgba(46, 125, 50, 0.3);
        }

        .item-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          width: 100%;
        }

        .item-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .item-title {
          flex: 1;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .item-percentage {
          font-size: 14px;
          font-weight: 700;
          color: #2E7D32;
          background: rgba(46, 125, 50, 0.1);
          padding: 2px 8px;
          border-radius: 20px;
          flex-shrink: 0;
        }

        .item-value {
          font-size: 20px;
          font-weight: 700;
          color: #1B5E20;
          margin-bottom: 8px;
          word-break: break-word;
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
          background: #E8F5E9;
          color: #2E7D32;
          border: 1px solid #81C784;
        }

        .progress-bar {
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
          width: 100%;
        }

        .progress-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .progress-fill.vehicles {
          background: linear-gradient(90deg, #3B82F6 0%, #2563EB 100%);
        }

        .progress-fill.stationary {
          background: linear-gradient(90deg, #F59E0B 0%, #D97706 100%);
        }

        .progress-fill.refrigerants {
          background: linear-gradient(90deg, #06b6d4 0%, #0891b2 100%);
        }

        .progress-fill.fugitive {
          background: linear-gradient(90deg, #8B5CF6 0%, #7C3AED 100%);
        }

        /* Summary Footer */
        .summary-footer {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: #e5e7eb;
          border-top: 1px solid #e5e7eb;
          width: 100%;
          box-sizing: border-box;
        }

        .stat-item {
          background: white;
          padding: 20px;
          text-align: center;
          width: 100%;
          box-sizing: border-box;
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
          color: #1B5E20;
          word-break: break-word;
        }

        .stat-number.highlight {
          color: #2E7D32;
          font-size: 28px;
        }

        /* Biogenic Footnote */
        .biogenic-footnote {
          margin: 16px 24px 24px;
          padding: 12px 16px;
          background: #F3F4F6;
          border-radius: 8px;
          font-size: 12px;
          color: #4B5563;
          text-align: center;
          border: 1px solid #E5E7EB;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .breakdown-grid {
            grid-template-columns: 1fr;
            padding: 0 16px 16px;
          }

          .total-banner {
            margin: 16px;
            padding: 20px;
            width: calc(100% - 32px);
          }

          .total-value {
            font-size: 32px;
          }

          .biogenic-banner {
            flex-direction: column;
            text-align: center;
            margin: 0 16px 16px;
            width: calc(100% - 32px);
          }

          .biogenic-note {
            padding-left: 0;
            padding-top: 12px;
            border-left: none;
            border-top: 1px solid #81C784;
            max-width: 100%;
          }

          .summary-footer {
            grid-template-columns: 1fr;
          }

          .stat-number {
            font-size: 20px;
          }

          .stat-number.highlight {
            font-size: 24px;
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
            width: calc(100% - 24px);
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