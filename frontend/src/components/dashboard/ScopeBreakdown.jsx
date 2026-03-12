// src/components/dashboard/ScopeBreakdown.jsx
import React from "react";
import Card from "../ui/Card";
import { FiPieChart } from "react-icons/fi";

const ScopeBreakdown = ({ title, items }) => {
  // Calculate total to ensure percentages sum to 100
  const total = items.reduce((sum, item) => sum + item.value, 0);
  
  // If total is not 100, adjust values proportionally
  const normalizedItems = total !== 100 
    ? items.map(item => ({ ...item, value: (item.value / total) * 100 }))
    : items;

  return (
    <Card className="breakdown-card">
      <div className="breakdown-header">
        <div className="header-left">
          <FiPieChart className="header-icon" />
          <h3>{title}</h3>
        </div>
        <span className="total-badge">
          {items.length} {items.length === 1 ? 'source' : 'sources'}
        </span>
      </div>

      <div className="breakdown-list">
        {normalizedItems.map((item, idx) => (
          <div key={idx} className="breakdown-item">
            <div className="item-header">
              <div className="item-title">
                <span className="item-icon">{item.icon || '📊'}</span>
                <span className="item-label">{item.label}</span>
              </div>
              <span className="item-value">{item.value.toFixed(1)}%</span>
            </div>
            
            <div className="progress-bar">
              <div 
                className={`progress-fill ${item.color}`}
                style={{ width: `${item.value}%` }}
              />
            </div>

            <div className="item-footer">
              <span className="emission-value">
                {((item.value / 100) * 1000).toFixed(0)} tCO₂e
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="breakdown-footer">
        <div className="footer-stat">
          <span className="stat-label">Total</span>
          <span className="stat-value">{total.toFixed(1)}%</span>
        </div>
        <div className="footer-stat">
          <span className="stat-label">Intensity</span>
          <span className="stat-value">0.24 t/£k</span>
        </div>
      </div>

      <style jsx>{`
        .breakdown-card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          border: 1px solid rgba(34, 197, 94, 0.1);
        }

        .breakdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .header-icon {
          color: #22C55E;
          font-size: 20px;
        }

        .breakdown-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #14532D;
          margin: 0;
        }

        .total-badge {
          background: #F0FDF4;
          color: #15803D;
          padding: 4px 12px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 500;
        }

        .breakdown-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 20px;
        }

        .breakdown-item {
          width: 100%;
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .item-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .item-icon {
          font-size: 16px;
        }

        .item-label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .item-value {
          font-size: 14px;
          font-weight: 600;
          color: #14532D;
        }

        .progress-bar {
          height: 8px;
          background: #E5E7EB;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 6px;
        }

        .progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease;
        }

        .progress-fill.bg-blue-500 {
          background: linear-gradient(90deg, #3B82F6, #2563EB);
        }

        .progress-fill.bg-green-500 {
          background: linear-gradient(90deg, #22C55E, #16A34A);
        }

        .progress-fill.bg-orange-500 {
          background: linear-gradient(90deg, #F97316, #EA580C);
        }

        .progress-fill.bg-purple-500 {
          background: linear-gradient(90deg, #A855F7, #9333EA);
        }

        .progress-fill.bg-yellow-500 {
          background: linear-gradient(90deg, #EAB308, #CA8A04);
        }

        .item-footer {
          display: flex;
          justify-content: flex-end;
        }

        .emission-value {
          font-size: 12px;
          color: #6B7280;
        }

        .breakdown-footer {
          display: flex;
          justify-content: space-between;
          padding-top: 16px;
          border-top: 1px solid rgba(34, 197, 94, 0.1);
        }

        .footer-stat {
          text-align: center;
          flex: 1;
        }

        .footer-stat:first-child {
          border-right: 1px solid rgba(34, 197, 94, 0.1);
        }

        .stat-label {
          display: block;
          font-size: 11px;
          color: #6B7280;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .stat-value {
          display: block;
          font-size: 16px;
          font-weight: 600;
          color: #14532D;
        }
      `}</style>
    </Card>
  );
};

export default ScopeBreakdown;