// src/components/reports/ReportsOverview.jsx
import React from "react";
import Card from "../ui/Card";
import { FiFileText, FiClock, FiCheckCircle } from "react-icons/fi";

export default function ReportsOverview({ selectedCity = "all", company }) {
  const cityText = selectedCity === "all" ? "all locations" : selectedCity;
  return (
    <div className="reports-overview">
      <div className="section-header">
        <h2>Generated Reports {selectedCity !== "all" && `- ${selectedCity}`}</h2>
      </div>

      <Card className="generated-reports-empty-card">
        <div className="empty-icon-wrap">
          <FiFileText className="empty-icon" />
        </div>
        <h3>No Generated Reports Yet</h3>
        <p>
          Generated reports will appear here once you run report generation.
          {` `}Current filter: <strong>{cityText}</strong>.
        </p>
        <div className="info-row">
          <div className="info-item">
            <FiClock />
            <span>Most recent reports will be shown first</span>
          </div>
          <div className="info-item">
            <FiCheckCircle />
            <span>Only finalized reports will be listed</span>
          </div>
        </div>
      </Card>

      <style jsx>{`
        .reports-overview {
          width: 100%;
        }

        .section-header { margin-bottom: 16px; }

        .section-header h2 {
          font-size: 18px;
          font-weight: 600;
          color: #1B4D3E;
          margin: 0;
        }

        .generated-reports-empty-card {
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          background: #FFFFFF;
          padding: 28px;
        }
        .empty-icon-wrap {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: #F8FAF8;
          border: 1px solid #E5E7EB;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }
        .empty-icon {
          font-size: 26px;
          color: #2E7D64;
        }
        .generated-reports-empty-card h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          color: #1B4D3E;
        }
        .generated-reports-empty-card p {
          margin: 0;
          font-size: 14px;
          color: #4B5563;
          line-height: 1.6;
        }
        .info-row {
          margin-top: 18px;
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          padding-top: 14px;
          border-top: 1px solid #E5E7EB;
        }
        .info-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #6B7280;
        }
        .info-item svg {
          color: #2E7D64;
        }

        @media (max-width: 768px) {
          .generated-reports-empty-card {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}