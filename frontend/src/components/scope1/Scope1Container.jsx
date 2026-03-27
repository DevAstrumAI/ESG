// src/components/scope1/Scope1Container.jsx
import React from "react";
import Scope1Wizard from "./Scope1Wizard";

export default function Scope1Container() {
  return (
    <div className="scope1-container">
      <div className="calculator-header">
        <div className="header-left">
          <h1>Scope 1 Emissions</h1>
          <p>Direct GHG emissions from owned or controlled sources</p>
          <div className="model-status">
            <span className="status-dot"></span>
            Real-time calculation
          </div>
        </div>
        <div className="ghg-protocol-badge">GHG Protocol</div>
      </div>

      <Scope1Wizard />

      <style jsx>{`
        .scope1-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
          width: 100%;
          box-sizing: border-box;
        }

        .calculator-header {
          background: #F8FAF8;
          border-radius: 12px;
          padding: 28px 32px;
          margin-bottom: 24px;
          border: 1px solid #E5E7EB;
          border-left: 4px solid #2E7D64;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .header-left h1 {
          margin: 0 0 8px 0;
          font-size: 28px;
          font-weight: 700;
          color: #1B4D3E;
        }

        .header-left p {
          margin: 0 0 16px 0;
          font-size: 15px;
          color: #4A5568;
        }

        .model-status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: white;
          border-radius: 30px;
          font-size: 13px;
          color: #2E7D64;
          border: 1px solid #E5E7EB;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: #2E7D64;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .ghg-protocol-badge {
          padding: 8px 16px;
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #1B4D3E;
          white-space: nowrap;
        }

        @media (max-width: 768px) {
          .scope1-container { padding: 16px; }
          .calculator-header {
            padding: 20px;
            flex-direction: column;
            gap: 16px;
          }
          .header-left h1 { font-size: 22px; }
        }
      `}</style>
    </div>
  );
}