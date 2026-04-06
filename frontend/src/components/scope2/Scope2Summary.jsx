// src/components/scope2/Scope2Summary.jsx
import React from "react";
import { useEmissionStore } from "../../store/emissionStore";

export default function Scope2Summary() {
  const electricity = useEmissionStore((s) => s.scope2Electricity || []);
  const heating = useEmissionStore((s) => s.scope2Heating || []);
  const renewable = useEmissionStore((s) => s.scope2Renewable || []);
  const scope2Results = useEmissionStore((s) => s.scope2Results);

  // Use backend results after submission
  const totals = scope2Results ? {
    electricityLocation: scope2Results.electricity?.locationBasedKgCO2e || 0,
    electricityMarket: scope2Results.electricity?.marketBasedKgCO2e || 0,
    heating: scope2Results.heating?.kgCO2e || 0,
    renewable: scope2Results.renewables?.kgCO2e || 0,
    locationBased: scope2Results.locationBasedKgCO2e || 0,
    marketBased: scope2Results.marketBasedKgCO2e || 0,
  } : {
    // Live estimates before submission
    electricityLocation: electricity.reduce((sum, e) => {
      const factor = 0.428;
      return sum + (Number(e.consumption) * factor);
    }, 0),
    electricityMarket: electricity.reduce((sum, e) => {
      // Market-based: 0 for renewable certificates, grid factor for grid average
      const factor = e.certificateType === "grid_average" ? 0.428 : 0;
      return sum + (Number(e.consumption) * factor);
    }, 0),
    heating: heating.reduce((sum, h) => sum + Number(h.consumption || 0) * 0.2, 0),
    renewable: renewable.reduce((sum, r) => sum + Number(r.consumption || 0) * 0.428, 0),
    locationBased: 0,
    marketBased: 0,
  };

  const hasData = electricity.length > 0 || heating.length > 0 || renewable.length > 0;

  const formatNumber = (num) => {
    return (num ?? 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const fmt = formatNumber;

  const getLocationPercentage = (value) => {
    const locationTotal = totals.locationBased ?? 0;
    if (locationTotal === 0) return 0;
    return ((value ?? 0) / locationTotal * 100).toFixed(1);
  };

  const getMarketPercentage = (value) => {
    const marketTotal = totals.marketBased ?? 0;
    if (marketTotal === 0) return 0;
    return ((value ?? 0) / marketTotal * 100).toFixed(1);
  };

  return (
    <div className="ss-wrap">
      <div className="ss-header">
        <div>
          <h3>Scope 2 Emissions Summary</h3>
          <p>Indirect emissions from purchased energy</p>
        </div>
      </div>

      {!hasData ? (
        <div className="ss-empty">
          <span className="ss-empty-icon">⚡</span>
          <h4>No emissions data yet</h4>
          <p>Add entries in each category to see your Scope 2 totals.</p>
        </div>
      ) : (
        <>
          {hasData && !scope2Results && (
            <div className="ss-warning">
              ⚠️ Submit data from each tab to calculate your CO₂e emissions.
            </div>
          )}

          {/* Dual-Method Totals Banner */}
          <div className="ss-dual-banner">
            <div className="dual-card location">
              <div className="dual-label">📍 Location-Based</div>
              <div className="dual-value">{fmt(totals.locationBased)} kg</div>
              <div className="dual-sub">≈ {(totals.locationBased / 1000).toFixed(2)} tCO₂e</div>
            </div>
            <div className="dual-card market">
              <div className="dual-label">📈 Market-Based</div>
              <div className="dual-value">{fmt(totals.marketBased)} kg</div>
              <div className="dual-sub">≈ {(totals.marketBased / 1000).toFixed(2)} tCO₂e</div>
            </div>
          </div>

          {/* Category Breakdown Grid */}
          <div className="ss-grid">
            {/* Electricity Card */}
            <div className="ss-card">
              <div className="ss-card-header">
                <span className="ss-card-icon">⚡</span>
                <span className="ss-card-title">Purchased Electricity</span>
                <span className="ss-card-pct">L: {getLocationPercentage(totals.electricityLocation)}%</span>
                <span className="ss-card-pct market">M: {getMarketPercentage(totals.electricityMarket)}%</span>
              </div>
              <div className="ss-card-value">{fmt(totals.electricityLocation)} kg</div>
              <div className="ss-card-count">{electricity.length} entries</div>
              
              {/* Electricity Dual Breakdown - Shows both location and market values */}
              <div className="dual-breakdown">
                <div className="dual-row">
                  <span className="dual-name">Location:</span>
                  <span className="dual-amount">{fmt(totals.electricityLocation)} kg</span>
                </div>
                <div className="dual-row">
                  <span className="dual-name">Market:</span>
                  <span className="dual-amount">{fmt(totals.electricityMarket)} kg</span>
                </div>
              </div>
              
              <div className="ss-bar-track">
                <div className="ss-bar-fill" style={{ width: `${getLocationPercentage(totals.electricityLocation)}%`, background: "#3B82F6" }} />
              </div>
            </div>

            {/* Heating Card */}
            <div className="ss-card">
              <div className="ss-card-header">
                <span className="ss-card-icon">🔥</span>
                <span className="ss-card-title">Heating & Cooling</span>
                <span className="ss-card-pct">L: {getLocationPercentage(totals.heating)}%</span>
                <span className="ss-card-pct market">M: {getMarketPercentage(totals.heating)}%</span>
              </div>
              <div className="ss-card-value">{fmt(totals.heating)} kg</div>
              <div className="ss-card-count">{heating.length} entries</div>
              <div className="ss-bar-track">
                <div className="ss-bar-fill" style={{ width: `${getLocationPercentage(totals.heating)}%`, background: "#F59E0B" }} />
              </div>
            </div>

            {/* Renewables Card */}
            <div className="ss-card renewable-card">
              <div className="ss-card-header">
                <span className="ss-card-icon">🌱</span>
                <span className="ss-card-title">Renewable Generation</span>
                <span className="ss-card-pct">L: {getLocationPercentage(totals.renewable)}%</span>
                <span className="ss-card-pct market">M: {getMarketPercentage(totals.renewable)}%</span>
              </div>
              <div className="ss-card-value">{fmt(totals.renewable)} kg</div>
              <div className="ss-card-count">{renewable.length} entries</div>
              <div className="ss-bar-track">
                <div className="ss-bar-fill" style={{ width: `${getLocationPercentage(totals.renewable)}%`, background: "#10B981" }} />
              </div>
            </div>
          </div>

          {/* Footer Stats */}
          <div className="ss-footer">
            <div className="ss-stat">
              <span className="ss-stat-label">Total Entries</span>
              <span className="ss-stat-value">{electricity.length + heating.length + renewable.length}</span>
            </div>
            <div className="ss-stat">
              <span className="ss-stat-label">Categories</span>
              <span className="ss-stat-value">{([electricity, heating, renewable].filter(a => a.length > 0).length)}/3</span>
            </div>
            <div className="ss-stat">
              <span className="ss-stat-label">Reporting Method</span>
              <span className="ss-stat-value highlight">Dual</span>
            </div>
          </div>

          {/* Renewable Note */}
          {renewable.length > 0 && (
            <div className="renewable-note">
              <span className="renewable-note-icon">🌱</span>
              <div className="renewable-note-content">
                <strong>Renewable generation:</strong> Reported separately per GHG Protocol — does not reduce Scope 2 totals.
                {totals.marketBased < totals.locationBased && (
                  <span className="renewable-impact"> Renewables are lowering your market-based total.</span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .ss-wrap {
          width: 100%;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          overflow: hidden;
          background: white;
        }

        .ss-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          background: #F8FAF8;
          border-bottom: 1px solid #E5E7EB;
        }
        .ss-header h3 {
          margin: 0 0 4px 0;
          font-size: 17px;
          font-weight: 600;
          color: #1B4D3E;
        }
        .ss-header p {
          margin: 0;
          font-size: 13px;
          color: #6B7280;
        }

        .ss-empty {
          padding: 48px 24px;
          text-align: center;
        }
        .ss-empty-icon { font-size: 40px; display: block; margin-bottom: 12px; opacity: 0.4; }
        .ss-empty h4 { margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #374151; }
        .ss-empty p  { margin: 0; font-size: 14px; color: #6B7280; }

        .ss-warning {
          margin: 20px 24px 0;
          padding: 12px 16px;
          background: #FEF3C7;
          border: 1px solid #FCD34D;
          border-radius: 8px;
          font-size: 13px;
          color: #92400E;
        }

        .ss-dual-banner {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin: 24px;
        }

        .dual-card {
          padding: 24px;
          border-radius: 10px;
          text-align: center;
          color: white;
        }
        .dual-card.location { background: #2563EB; }
        .dual-card.market { background: #7C3AED; }
        .dual-label {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.85;
          margin-bottom: 8px;
        }
        .dual-value {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .dual-sub {
          font-size: 13px;
          opacity: 0.85;
          padding-top: 8px;
          border-top: 1px solid rgba(255,255,255,0.2);
        }

        .ss-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          padding: 0 24px 24px;
        }

        .ss-card {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          padding: 16px;
          transition: all 0.15s;
        }
        .ss-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border-color: #2E7D64;
        }
        .renewable-card {
          grid-column: span 2;
        }

        .ss-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .ss-card-icon { font-size: 18px; }
        .ss-card-title { flex: 1; font-size: 13px; font-weight: 600; color: #374151; }
        .ss-card-pct {
          font-size: 12px; font-weight: 700; color: #2E7D64;
          background: #E8F0EA; padding: 2px 8px; border-radius: 20px;
        }
        .ss-card-pct.market {
          background: #EDE9FE;
          color: #7C3AED;
        }

        .ss-card-value { font-size: 18px; font-weight: 700; color: #1B4D3E; margin-bottom: 4px; }
        .ss-card-count { font-size: 12px; color: #6B7280; margin-bottom: 10px; }

        .dual-breakdown {
          background: white;
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 12px;
          border: 1px solid #E5E7EB;
        }
        .dual-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }
        .dual-name { color: #6B7280; }
        .dual-amount { font-weight: 500; color: #1B4D3E; }

        .ss-bar-track {
          height: 5px;
          background: #E5E7EB;
          border-radius: 3px;
          overflow: hidden;
        }
        .ss-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .ss-footer {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          border-top: 1px solid #E5E7EB;
        }
        .ss-stat {
          padding: 20px;
          text-align: center;
          border-right: 1px solid #E5E7EB;
        }
        .ss-stat:last-child { border-right: none; }
        .ss-stat-label { display: block; font-size: 12px; color: #6B7280; margin-bottom: 6px; }
        .ss-stat-value { display: block; font-size: 22px; font-weight: 700; color: #1B4D3E; }
        .ss-stat-value.highlight { color: #2E7D64; font-size: 26px; }

        .renewable-note {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin: 16px 24px 24px;
          padding: 16px 20px;
          background: #F0FDF4;
          border-radius: 10px;
          border: 1px solid #86EFAC;
        }
        .renewable-note-icon { font-size: 18px; }
        .renewable-note-content { font-size: 13px; color: #166534; line-height: 1.5; }
        .renewable-impact { color: #2563EB; font-weight: 500; }

        @media (max-width: 768px) {
          .ss-dual-banner {
            grid-template-columns: 1fr;
            gap: 12px;
            margin: 16px;
          }
          .dual-value { font-size: 26px; }
          .ss-grid { grid-template-columns: 1fr; padding: 0 16px 16px; }
          .renewable-card { grid-column: span 1; }
          .ss-footer { grid-template-columns: 1fr; }
          .ss-stat { border-right: none; border-bottom: 1px solid #E5E7EB; }
          .ss-stat:last-child { border-bottom: none; }
        }

        @media (max-width: 480px) {
          .ss-header { flex-direction: column; text-align: center; padding: 16px; }
          .dual-value { font-size: 22px; }
          .ss-card-value { font-size: 16px; }
          .ss-stat-value { font-size: 20px; }
          .ss-stat-value.highlight { font-size: 22px; }
          .ss-card-header { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}