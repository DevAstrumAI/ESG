// src/components/reports/ReportsOverview.jsx
import React, { useState } from "react";
import Card from "../ui/Card";
import StatusBadge from "../ui/StatusBadge";
import ProgressBar from "../ui/ProgressBar";
import { FiDownload, FiEye, FiMoreVertical, FiCalendar, FiTrendingUp } from "react-icons/fi";
import { BiLeaf } from "react-icons/bi";

export default function ReportsOverview({ selectedCity = "all" }) {
  const [expandedReport, setExpandedReport] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // "list" or "trend"

  // Sample data for demonstration - in real app, this would come from API
  const reports = [
    {
      id: 1,
      title: "Monthly Emissions Report",
      period: "January 2026",
      date: "2026-01-31",
      scope1: 120,
      scope2: 80,
      total: 200,
      unit: "tCO₂e",
      completion: 60,
      status: "Complete",
      trend: -5.2,
      dataPoints: 31,
      lastUpdated: "2026-02-01",
      city: "Dubai",
    },
    {
      id: 2,
      title: "Quarterly Emissions Report",
      period: "Q4 2025",
      date: "2025-12-31",
      scope1: 450,
      scope2: 300,
      total: 750,
      unit: "tCO₂e",
      completion: 80,
      status: "Reliable",
      trend: 2.1,
      dataPoints: 92,
      lastUpdated: "2026-01-15",
      city: "Abu Dhabi",
    },
    {
      id: 3,
      title: "Annual Sustainability Report",
      period: "2025",
      date: "2025-12-31",
      scope1: 1650,
      scope2: 1100,
      total: 2750,
      unit: "tCO₂e",
      completion: 95,
      status: "Complete",
      trend: -8.4,
      dataPoints: 365,
      lastUpdated: "2026-01-10",
      city: "Dubai",
    },
  ];

  // Filter reports based on selected city
  const filteredReports = selectedCity === "all" 
    ? reports 
    : reports.filter(report => report.city === selectedCity);

  const getStatusColor = (status) => {
    const colors = {
      "Complete": "success",
      "Reliable": "success",
      "Pending": "warning",
      "Draft": "info",
    };
    return colors[status] || "default";
  };

  return (
    <div className="reports-overview">
      {/* Section Header */}
      <div className="section-header">
        <h2>Generated Reports {selectedCity !== "all" && `- ${selectedCity}`}</h2>
        <div className="header-actions">
          <button 
            className={`view-toggle ${viewMode === 'trend' ? 'active' : ''}`}
            onClick={() => setViewMode(viewMode === 'list' ? 'trend' : 'list')}
          >
            <FiTrendingUp /> {viewMode === 'list' ? 'Trend View' : 'List View'}
          </button>
        </div>
      </div>

      {/* Conditional Rendering based on viewMode */}
      {viewMode === 'list' ? (
        /* List View - Reports List */
        <div className="reports-list">
          {filteredReports.map((report) => (
            <Card key={report.id} className="report-card">
              {/* Card Header */}
              <div className="report-header">
                <div className="header-left">
                  <div className="report-icon">
                    <BiLeaf />
                  </div>
                  <div>
                    <h3>{report.title}</h3>
                    <div className="report-meta">
                      <span className="meta-item">
                        <FiCalendar /> {report.period}
                      </span>
                      <span className="meta-divider">•</span>
                      <span className="meta-item">
                        {report.dataPoints} data points
                      </span>
                      {report.city && (
                        <>
                          <span className="meta-divider">•</span>
                          <span className="meta-item">
                            📍 {report.city}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="header-right">
                  <StatusBadge status={report.status} className={getStatusColor(report.status)} />
                  <button 
                    className="expand-btn"
                    onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                  >
                    <FiMoreVertical />
                  </button>
                </div>
              </div>

              {/* Main Stats */}
              <div className="stats-grid">
                <div className="stat-box">
                  <span className="stat-label">Scope 1</span>
                  <span className="stat-value">{report.scope1}</span>
                  <span className="stat-unit">{report.unit}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">Scope 2</span>
                  <span className="stat-value">{report.scope2}</span>
                  <span className="stat-unit">{report.unit}</span>
                </div>
                <div className="stat-box highlight">
                  <span className="stat-label">Total CO₂e</span>
                  <span className="stat-value">{report.total}</span>
                  <span className="stat-unit">{report.unit}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">vs Previous</span>
                  <span className={`trend-value ${report.trend >= 0 ? 'up' : 'down'}`}>
                    {report.trend > 0 ? '+' : ''}{report.trend}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="progress-section">
                <div className="progress-header">
                  <span className="progress-label">Data Completion</span>
                  <span className="progress-value">{report.completion}%</span>
                </div>
                <ProgressBar value={report.completion} />
                <div className="progress-footer">
                  <span>Last updated: {report.lastUpdated}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="action-buttons">
                <button className="action-btn view">
                  <FiEye /> Preview
                </button>
                <button className="action-btn download">
                  <FiDownload /> Download PDF
                </button>
                <button className="action-btn export">
                  Export CSV
                </button>
              </div>

              {/* Expanded Details (shown when expanded) */}
              {expandedReport === report.id && (
                <div className="expanded-details">
                  <h4>Detailed Breakdown</h4>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span>Mobile Combustion</span>
                      <span>85 tCO₂e</span>
                    </div>
                    <div className="detail-item">
                      <span>Stationary Combustion</span>
                      <span>35 tCO₂e</span>
                    </div>
                    <div className="detail-item">
                      <span>Electricity</span>
                      <span>60 tCO₂e</span>
                    </div>
                    <div className="detail-item">
                      <span>Heating</span>
                      <span>20 tCO₂e</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}

          {/* Empty State (when no reports) */}
          {filteredReports.length === 0 && (
            <Card className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>No Reports Found</h3>
              <p>{selectedCity === "all" ? "Generate your first report using the templates above" : `No reports available for ${selectedCity}`}</p>
              <button className="generate-first-btn">Generate Report</button>
            </Card>
          )}
        </div>
      ) : (
        /* Trend View */
        <div className="trend-view">
          <Card className="trend-card">
            <h3>Emissions Trend Analysis</h3>
            <p className="trend-subtitle">
              {selectedCity !== "all" ? `Showing trends for ${selectedCity}` : "Showing trends for all cities"}
            </p>
            
            {/* Placeholder Chart */}
            <div className="trend-chart-placeholder">
              <div className="chart-bars">
                <div className="bar" style={{ height: '120px' }}></div>
                <div className="bar" style={{ height: '180px' }}></div>
                <div className="bar" style={{ height: '150px' }}></div>
                <div className="bar" style={{ height: '200px' }}></div>
                <div className="bar" style={{ height: '170px' }}></div>
                <div className="bar" style={{ height: '220px' }}></div>
                <div className="bar" style={{ height: '190px' }}></div>
                <div className="bar" style={{ height: '210px' }}></div>
                <div className="bar" style={{ height: '160px' }}></div>
                <div className="bar" style={{ height: '140px' }}></div>
                <div className="bar" style={{ height: '200px' }}></div>
                <div className="bar" style={{ height: '180px' }}></div>
              </div>
              <div className="chart-labels">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
                <span>Sep</span>
                <span>Oct</span>
                <span>Nov</span>
                <span>Dec</span>
              </div>
            </div>

            <div className="trend-stats">
              <div className="trend-stat-item">
                <span className="trend-stat-label">Average Emissions</span>
                <span className="trend-stat-value">184 tCO₂e</span>
              </div>
              <div className="trend-stat-item">
                <span className="trend-stat-label">Peak Month</span>
                <span className="trend-stat-value">June (220 tCO₂e)</span>
              </div>
              <div className="trend-stat-item">
                <span className="trend-stat-label">Overall Trend</span>
                <span className="trend-stat-value trend-down">↓ 8.2%</span>
              </div>
            </div>

            <p className="trend-note">
              📊 Interactive chart coming soon with detailed emission trends, 
              scope breakdowns, and year-over-year comparisons.
            </p>
          </Card>
        </div>
      )}

      <style jsx>{`
        .reports-overview {
          width: 100%;
        }

        /* Section Header */
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .section-header h2 {
          font-size: 18px;
          font-weight: 600;
          color: #14532D;
          margin: 0;
        }

        .view-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: white;
          border: 1px solid rgba(34, 197, 94, 0.2);
          border-radius: 30px;
          color: #374151;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-toggle:hover {
          border-color: #22C55E;
          background: #F0FDF4;
        }

        .view-toggle.active {
          background: #22C55E;
          color: white;
          border-color: #22C55E;
        }

        /* Reports List */
        .reports-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .report-card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          border: 1px solid rgba(34, 197, 94, 0.1);
          transition: all 0.3s ease;
        }

        .report-card:hover {
          box-shadow: 0 10px 30px rgba(34, 197, 94, 0.1);
        }

        /* Report Header */
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .report-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #22C55E20, #15803D20);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: #22C55E;
        }

        .report-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #14532D;
          margin: 0 0 4px;
        }

        .report-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #6B7280;
          flex-wrap: wrap;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .expand-btn {
          background: none;
          border: none;
          color: #9CA3AF;
          cursor: pointer;
          padding: 4px;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 20px;
          padding: 16px;
          background: #F9FAFB;
          border-radius: 16px;
        }

        .stat-box {
          text-align: center;
        }

        .stat-box.highlight {
          background: linear-gradient(135deg, #22C55E20, #15803D20);
          border-radius: 12px;
          padding: 8px;
        }

        .stat-label {
          display: block;
          font-size: 12px;
          color: #6B7280;
          margin-bottom: 4px;
        }

        .stat-value {
          display: inline-block;
          font-size: 20px;
          font-weight: 700;
          color: #14532D;
          margin-right: 4px;
        }

        .stat-unit {
          font-size: 12px;
          color: #9CA3AF;
        }

        .trend-value {
          font-size: 18px;
          font-weight: 600;
        }

        .trend-value.down {
          color: #10B981;
        }

        .trend-value.up {
          color: #EF4444;
        }

        /* Progress Section */
        .progress-section {
          margin-bottom: 20px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .progress-label {
          font-size: 13px;
          color: #4B5563;
        }

        .progress-value {
          font-weight: 600;
          color: #14532D;
        }

        .progress-footer {
          font-size: 12px;
          color: #9CA3AF;
          margin-top: 8px;
          text-align: right;
        }

        /* Action Buttons */
        .action-buttons {
          display: flex;
          gap: 12px;
          border-top: 1px solid rgba(34, 197, 94, 0.1);
          padding-top: 20px;
        }

        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn.view {
          background: #F3F4F6;
          border: 1px solid #E5E7EB;
          color: #374151;
        }

        .action-btn.view:hover {
          background: #E5E7EB;
        }

        .action-btn.download {
          background: linear-gradient(135deg, #15803D, #22C55E);
          border: none;
          color: white;
        }

        .action-btn.download:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(34, 197, 94, 0.3);
        }

        .action-btn.export {
          background: white;
          border: 2px solid #22C55E;
          color: #15803D;
        }

        .action-btn.export:hover {
          background: #F0FDF4;
        }

        /* Expanded Details */
        .expanded-details {
          margin-top: 20px;
          padding: 20px;
          background: #F9FAFB;
          border-radius: 16px;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .expanded-details h4 {
          font-size: 15px;
          font-weight: 600;
          color: #14532D;
          margin: 0 0 16px;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 12px;
          background: white;
          border-radius: 8px;
          font-size: 13px;
        }

        .detail-item span:first-child {
          color: #4B5563;
        }

        .detail-item span:last-child {
          font-weight: 600;
          color: #14532D;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 24px;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 20px;
          opacity: 0.5;
        }

        .empty-state h3 {
          font-size: 18px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 8px;
        }

        .empty-state p {
          color: #6B7280;
          margin: 0 0 20px;
        }

        .generate-first-btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #15803D, #22C55E);
          color: white;
          border: none;
          border-radius: 30px;
          font-weight: 600;
          cursor: pointer;
        }

        /* Trend View Styles */
        .trend-view {
          margin-top: 20px;
        }

        .trend-card {
          padding: 32px;
          text-align: center;
        }

        .trend-card h3 {
          font-size: 20px;
          font-weight: 700;
          color: #14532D;
          margin: 0 0 8px;
        }

        .trend-subtitle {
          color: #6B7280;
          margin-bottom: 32px;
        }

        .trend-chart-placeholder {
          margin: 32px 0;
          padding: 20px;
          background: #F9FAFB;
          border-radius: 16px;
        }

        .chart-bars {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 8px;
          height: 240px;
          margin-bottom: 12px;
        }

        .bar {
          flex: 1;
          background: linear-gradient(180deg, #22C55E, #15803D);
          border-radius: 8px 8px 0 0;
          transition: height 0.3s ease;
          min-width: 20px;
        }

        .chart-labels {
          display: flex;
          justify-content: space-between;
          color: #6B7280;
          font-size: 11px;
        }

        .trend-stats {
          display: flex;
          justify-content: space-around;
          margin: 32px 0;
          padding: 20px;
          background: #F0FDF4;
          border-radius: 16px;
        }

        .trend-stat-item {
          text-align: center;
        }

        .trend-stat-label {
          display: block;
          font-size: 12px;
          color: #6B7280;
          margin-bottom: 4px;
        }

        .trend-stat-value {
          display: block;
          font-size: 18px;
          font-weight: 700;
          color: #14532D;
        }

        .trend-stat-value.trend-down {
          color: #10B981;
        }

        .trend-note {
          color: #6B7280;
          font-size: 13px;
          font-style: italic;
          padding: 16px;
          background: #F9FAFB;
          border-radius: 12px;
          border-left: 4px solid #22C55E;
          text-align: left;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .action-buttons {
            flex-direction: column;
          }

          .report-header {
            flex-direction: column;
            gap: 12px;
          }

          .header-right {
            width: 100%;
            justify-content: space-between;
          }

          .details-grid {
            grid-template-columns: 1fr;
          }

          .trend-stats {
            flex-direction: column;
            gap: 16px;
          }

          .chart-labels {
            font-size: 9px;
          }
        }
      `}</style>
    </div>
  );
}