// src/components/dashboard/ScopeBreakdown.jsx
import React from "react";
import { useCompanyStore } from "../../store/companyStore";

export default function ScopeBreakdown({ title, items, totalEmissions }) {
  const { company } = useCompanyStore();
  const hasData = items.some(item => item.value > 0);

  // Calculate emissions intensity (tCO₂e per thousand currency)
  const revenue = company?.basicInfo?.revenue || 0;
  const totalEmissionsTonnes = totalEmissions || 0;
  
  // Intensity = total emissions (tonnes) / revenue (in thousands)
  const revenueInThousands = revenue / 1000;
  const intensity = revenueInThousands > 0 
    ? (totalEmissionsTonnes / revenueInThousands).toFixed(2) 
    : 0;

  // Get currency symbol
  const currency = company?.basicInfo?.currency || "USD";
  const currencySymbol = currency === "USD" ? "$" : 
                         currency === "EUR" ? "€" : 
                         currency === "GBP" ? "£" : 
                         currency === "AED" ? "د.إ" : "$";

  return (
    <div className="scope-breakdown">
      <h3>{title}</h3>
      {!hasData ? (
        <div className="empty-breakdown">
          <p>No data available</p>
          <span>Submit emissions data to see breakdown</span>
        </div>
      ) : (
        <>
          <div className="breakdown-list">
            {items.map((item, index) => (
              <div key={index} className="breakdown-item">
                <div className="breakdown-header">
                  <div className="breakdown-title">
                    <span className="breakdown-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <span className="breakdown-percentage">{item.value}%</span>
                </div>
                <div className="breakdown-bar">
                  <div 
                    className="breakdown-fill" 
                    style={{ width: `${item.value}%`, backgroundColor: item.color }}
                  />
                </div>
                <div className="breakdown-value">
                  {item.kgCO2e ? (item.kgCO2e / 1000).toFixed(1) : 0} tCO₂e
                </div>
              </div>
            ))}
          </div>
          
          {/* Intensity Footer */}
          <div className="intensity-footer">
            <div className="intensity-item">
              <span className="intensity-label">TOTAL</span>
              <span className="intensity-value">{totalEmissionsTonnes.toFixed(1)} tCO₂e</span>
            </div>
            <div className="intensity-divider"></div>
            <div className="intensity-item">
              <span className="intensity-label">INTENSITY</span>
              <span className="intensity-value">{intensity} t/{currencySymbol}k</span>
            </div>
          </div>
        </>
      )}
      
      <style jsx>{`
        .scope-breakdown {
          background: white;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #E5E7EB;
        }

        .scope-breakdown h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1B4D3E;
          margin: 0 0 16px;
        }

        .empty-breakdown {
          text-align: center;
          padding: 32px 20px;
          color: #9CA3AF;
        }

        .empty-breakdown p {
          margin: 0 0 4px;
          font-size: 14px;
        }

        .empty-breakdown span {
          font-size: 12px;
        }

        .breakdown-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 20px;
        }

        .breakdown-item {
          width: 100%;
        }

        .breakdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .breakdown-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
        }

        .breakdown-icon {
          display: inline-flex;
          align-items: center;
          color: #2E7D64;
        }

        .breakdown-percentage {
          font-size: 12px;
          font-weight: 600;
          color: #6B7280;
        }

        .breakdown-bar {
          height: 6px;
          background: #E5E7EB;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 6px;
        }

        .breakdown-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .breakdown-value {
          font-size: 12px;
          font-weight: 600;
          color: #1B4D3E;
          text-align: right;
        }

        .intensity-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          padding-top: 16px;
          margin-top: 8px;
          border-top: 1px solid #E5E7EB;
        }

        .intensity-item {
          text-align: center;
        }

        .intensity-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .intensity-value {
          display: block;
          font-size: 18px;
          font-weight: 700;
          color: #1B4D3E;
        }

        .intensity-divider {
          width: 1px;
          height: 30px;
          background: #E5E7EB;
        }
      `}</style>
    </div>
  );
}