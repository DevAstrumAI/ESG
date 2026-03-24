import React from "react";
import { useEmissionStore } from "../../store/emissionStore";
import Card from "../ui/Card";

export default function Scope2Summary() {
  const electricity = useEmissionStore((s) => s.scope2Electricity);
  const heating = useEmissionStore((s) => s.scope2Heating);
  const renewable = useEmissionStore((s) => s.scope2Renewable);
  const scope2Results = useEmissionStore((s) => s.scope2Results);
  const scope2Total = useEmissionStore((s) => s.scope2Total);

  // Use backend results after submission, otherwise show live estimates from entries
  const totals = scope2Results ? {
    electricity: scope2Results.electricity?.kgCO2e || 0,
    heating: scope2Results.heating?.kgCO2e || 0,
    renewable: scope2Results.renewables?.kgCO2e || 0,
    // For backward compatibility
    co2e: scope2Results.total?.kgCO2e || scope2Results.locationBasedKgCO2e || 0,
    // New dual-method fields
    locationBased: scope2Results.locationBasedKgCO2e || 0,
    marketBased: scope2Results.marketBasedKgCO2e || 0,
  } : {
    electricity: electricity.reduce((sum, e) => sum + Number(e.consumption || 0), 0),
    heating: heating.reduce((sum, h) => sum + Number(h.consumption || 0), 0),
    renewable: renewable.reduce((sum, r) => sum + Number(r.consumption || 0), 0),
    co2e: scope2Total,
    locationBased: 0,
    marketBased: 0,
  };

  // Check if any data exists
  const hasData = electricity.length > 0 || heating.length > 0 || renewable.length > 0;

  // Format large numbers with commas
  const formatNumber = (num) => {
    return (num ?? 0).toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  // Calculate percentages for each category
  const total = totals.co2e ?? 0;
  const getPercentage = (value) => {
    if (total === 0) return 0;
    return ((value ?? 0) / total * 100).toFixed(1);
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    const icons = {
      electricity: "⚡",
      heating: "🔥",
      renewable: "🌱"
    };
    return icons[category] || "📊";
  };

  return (
    <div className="summary-wrapper">
      {/* Main Summary Card */}
      <Card className="summary-card">
        <div className="summary-header">
          <div className="header-icon">📊</div>
          <div className="header-title">
            <h3>Scope 2 Emissions Summary</h3>
            <p>Indirect emissions from purchased energy</p>
          </div>
        </div>

        {!hasData ? (
          <div className="empty-summary">
            <div className="empty-icon">⚡</div>
            <h4>No emissions data yet</h4>
            <p>Add entries in each category to see your Scope 2 totals</p>
          </div>
        ) : (
          <>
            {/* Dual-Method Totals Banner */}
            <div className="dual-method-banner">
              <div className="method-card location">
                <div className="method-label">📍 Location-Based</div>
                <div className="method-value">{formatNumber(totals.locationBased)} kg</div>
                <div className="method-equivalent">
                  ≈ {(totals.locationBased / 1000).toFixed(2)} tCO₂e
                </div>
                <div className="method-note">Grid average emission factors</div>
              </div>
              <div className="method-card market">
                <div className="method-label">📈 Market-Based</div>
                <div className="method-value">{formatNumber(totals.marketBased)} kg</div>
                <div className="method-equivalent">
                  ≈ {(totals.marketBased / 1000).toFixed(2)} tCO₂e
                </div>
                <div className="method-note">Supplier-specific & RECs/PPAs</div>
              </div>
            </div>

            {/* Category Breakdown Grid */}
            <div className="breakdown-grid">
              {/* Electricity */}
              <div className="breakdown-item">
                <div className="item-header">
                  <span className="item-icon">{getCategoryIcon('electricity')}</span>
                  <span className="item-title">Purchased Electricity</span>
                  <span className="item-percentage">{getPercentage(totals.electricity)}%</span>
                </div>
                <div className="item-value">{formatNumber(totals.electricity)} kg</div>
                <div className="item-stats">
                  <span className="stat">{electricity.length} entries</span>
                </div>
                {scope2Results?.electricity && (
                  <div className="method-breakdown">
                    <div className="method-row">
                      <span className="method-name">Location:</span>
                      <span className="method-amount">{formatNumber(scope2Results.electricity.locationBasedKgCO2e || 0)} kg</span>
                    </div>
                    <div className="method-row">
                      <span className="method-name">Market:</span>
                      <span className="method-amount">{formatNumber(scope2Results.electricity.marketBasedKgCO2e || 0)} kg</span>
                    </div>
                  </div>
                )}
                <div className="progress-bar">
                  <div 
                    className="progress-fill electricity" 
                    style={{ width: `${getPercentage(totals.electricity)}%` }}
                  ></div>
                </div>
              </div>

              {/* Heating */}
              <div className="breakdown-item">
                <div className="item-header">
                  <span className="item-icon">{getCategoryIcon('heating')}</span>
                  <span className="item-title">Heating & Cooling</span>
                  <span className="item-percentage">{getPercentage(totals.heating)}%</span>
                </div>
                <div className="item-value">{formatNumber(totals.heating)} kg</div>
                <div className="item-stats">
                  <span className="stat">{heating.length} entries</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill heating" 
                    style={{ width: `${getPercentage(totals.heating)}%` }}
                  ></div>
                </div>
              </div>

              {/* Renewable */}
              <div className="breakdown-item renewable-item">
                <div className="item-header">
                  <span className="item-icon">{getCategoryIcon('renewable')}</span>
                  <span className="item-title">Renewable Generation</span>
                  <span className="item-percentage">{getPercentage(totals.renewable)}%</span>
                </div>
                <div className="item-value">{formatNumber(totals.renewable)} kg</div>
                <div className="item-stats">
                  <span className="stat">{renewable.length} entries</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill renewable" 
                    style={{ width: `${getPercentage(totals.renewable)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Quick Stats Footer */}
            <div className="summary-footer">
              <div className="stat-item">
                <span className="stat-label">Data Sources</span>
                <span className="stat-number">
                  {electricity.length + heating.length + renewable.length}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Categories</span>
                <span className="stat-number">
                  {[
                    electricity.length > 0, 
                    heating.length > 0, 
                    renewable.length > 0
                  ].filter(Boolean).length}/3
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Reporting Method</span>
                <span className="stat-number highlight">Dual</span>
              </div>
            </div>

            {/* Renewable Info Note */}
            {renewable.length > 0 && (
              <div className="renewable-note">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="#2E7D32" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 14V10M10 6H10.01" stroke="#2E7D32" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>
                  <strong>Renewable generation:</strong> Reported separately per GHG Protocol — does not reduce Scope 2 totals.
                  {scope2Results?.marketBasedKgCO2e < scope2Results?.locationBasedKgCO2e && (
                    <span className="renewable-impact"> Renewables are lowering your market-based total.</span>
                  )}
                </span>
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
        }

        .header-title p {
          margin: 0;
          font-size: 13px;
          color: #4B5563;
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

        /* Dual-Method Banner */
        .dual-method-banner {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin: 24px;
          width: calc(100% - 48px);
        }

        .method-card {
          padding: 20px;
          border-radius: 16px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .method-card.location {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: white;
        }

        .method-card.market {
          background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
          color: white;
        }

        .method-label {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.9;
          margin-bottom: 8px;
        }

        .method-value {
          font-size: 32px;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 4px;
        }

        .method-equivalent {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 8px;
        }

        .method-note {
          font-size: 12px;
          opacity: 0.8;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
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
          box-shadow: 0 8px 16px rgba(37, 99, 235, 0.1);
          border-color: rgba(37, 99, 235, 0.3);
        }

        .renewable-item {
          grid-column: span 2;
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
          color: #2563EB;
          background: rgba(37, 99, 235, 0.1);
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

        .method-breakdown {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 12px;
          padding: 8px;
          background: white;
          border-radius: 8px;
          border: 1px solid rgba(37, 99, 235, 0.1);
        }

        .method-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }

        .method-name {
          color: #6B7280;
        }

        .method-amount {
          font-weight: 600;
          color: #1B5E20;
        }

        .item-stats {
          margin-bottom: 12px;
        }

        .stat {
          font-size: 12px;
          color: #6B7280;
          background: white;
          padding: 4px 8px;
          border-radius: 12px;
          display: inline-block;
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

        .progress-fill.electricity {
          background: linear-gradient(90deg, #3B82F6 0%, #2563EB 100%);
        }

        .progress-fill.heating {
          background: linear-gradient(90deg, #F59E0B 0%, #D97706 100%);
        }

        .progress-fill.renewable {
          background: linear-gradient(90deg, #10B981 0%, #059669 100%);
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
          color: #2563EB;
          font-size: 28px;
        }

        /* Renewable Note */
        .renewable-note {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin: 16px 24px 24px;
          padding: 16px 20px;
          background: #E3F2E3;
          border-radius: 12px;
          border: 1px solid rgba(46, 125, 50, 0.2);
        }

        .renewable-note svg {
          flex-shrink: 0;
        }

        .renewable-note span {
          font-size: 14px;
          color: #1B5E20;
          line-height: 1.5;
        }

        .renewable-impact {
          color: #2563EB;
          font-weight: 500;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .dual-method-banner {
            grid-template-columns: 1fr;
            gap: 12px;
            margin: 16px;
            width: calc(100% - 32px);
          }

          .breakdown-grid {
            grid-template-columns: 1fr;
            padding: 0 16px 16px;
          }

          .renewable-item {
            grid-column: span 1;
          }

          .total-banner {
            margin: 16px;
            padding: 20px;
            width: calc(100% - 32px);
          }

          .total-value {
            font-size: 32px;
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
        }

        @media (max-width: 480px) {
          .summary-header {
            flex-direction: column;
            text-align: center;
            padding: 16px;
          }

          .method-value {
            font-size: 24px;
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

          .renewable-note {
            margin: 12px 16px 16px;
            padding: 12px;
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}