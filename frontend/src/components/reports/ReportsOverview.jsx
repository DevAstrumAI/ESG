// src/components/reports/ReportsOverview.jsx
import React, { useState } from "react";
import Card from "../ui/Card";
import StatusBadge from "../ui/StatusBadge";
import ProgressBar from "../ui/ProgressBar";
import { FiDownload, FiEye, FiMoreVertical, FiCalendar, FiTrendingUp, FiMapPin } from "react-icons/fi";
import { BiLeaf } from "react-icons/bi";
import { useEmissionStore } from "../../store/emissionStore";

export default function ReportsOverview({ selectedCity = "all", company }) {
  const [expandedReport, setExpandedReport] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  
  const scope1Results = useEmissionStore((s) => s.scope1Results);
  const scope2Results = useEmissionStore((s) => s.scope2Results);
  const selectedYear = useEmissionStore((s) => s.selectedYear);

  const scope1Kg = scope1Results?.total?.kgCO2e || 0;
  const scope2Kg = scope2Results?.total?.kgCO2e || 0;

  // Get company locations from store
  const companyLocations = company?.locations || [];

  // Generate reports based on actual data
  const generateReports = () => {
    const reports = [];
    
    // Current month report
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
    const currentYearNum = currentDate.getFullYear();
    
    reports.push({
      id: 1,
      title: "Monthly Emissions Report",
      period: `${currentMonth} ${currentYearNum}`,
      date: `${currentYearNum}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`,
      scope1: scope1Kg / 1000,
      scope2: scope2Kg / 1000,
      total: (scope1Kg + scope2Kg) / 1000,
      unit: "tCO₂e",
      completion: scope1Kg > 0 || scope2Kg > 0 ? 60 : 0,
      status: scope1Kg > 0 || scope2Kg > 0 ? "Complete" : "Pending",
      trend: -5.2,
      dataPoints: 31,
      lastUpdated: new Date().toISOString().split('T')[0],
      city: companyLocations[0]?.city || "Dubai",
    });

    // Quarterly report (Q1)
    reports.push({
      id: 2,
      title: "Quarterly Emissions Report",
      period: "Q1 2026",
      date: "2026-03-31",
      scope1: scope1Kg / 1000,
      scope2: scope2Kg / 1000,
      total: (scope1Kg + scope2Kg) / 1000,
      unit: "tCO₂e",
      completion: scope1Kg > 0 || scope2Kg > 0 ? 80 : 0,
      status: scope1Kg > 0 || scope2Kg > 0 ? "Reliable" : "Pending",
      trend: 2.1,
      dataPoints: 92,
      lastUpdated: "2026-04-15",
      city: companyLocations[0]?.city || "Dubai",
    });

    // Annual report
    reports.push({
      id: 3,
      title: "Annual Sustainability Report",
      period: `${currentYearNum}`,
      date: `${currentYearNum}-12-31`,
      scope1: scope1Kg / 1000,
      scope2: scope2Kg / 1000,
      total: (scope1Kg + scope2Kg) / 1000,
      unit: "tCO₂e",
      completion: scope1Kg > 0 || scope2Kg > 0 ? 95 : 0,
      status: scope1Kg > 0 || scope2Kg > 0 ? "Complete" : "Pending",
      trend: -8.4,
      dataPoints: 365,
      lastUpdated: new Date().toISOString().split('T')[0],
      city: companyLocations[0]?.city || "Dubai",
    });

    return reports;
  };

  const reports = generateReports();

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

      {viewMode === 'list' ? (
        <div className="reports-list">
          {filteredReports.map((report) => (
            <Card key={report.id} className="report-card">
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
                            <FiMapPin /> {report.city}
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

              <div className="stats-grid">
                <div className="stat-box">
                  <span className="stat-label">Scope 1</span>
                  <span className="stat-value">{report.scope1.toFixed(1)}</span>
                  <span className="stat-unit">{report.unit}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">Scope 2</span>
                  <span className="stat-value">{report.scope2.toFixed(1)}</span>
                  <span className="stat-unit">{report.unit}</span>
                </div>
                <div className="stat-box highlight">
                  <span className="stat-label">Total CO₂e</span>
                  <span className="stat-value">{report.total.toFixed(1)}</span>
                  <span className="stat-unit">{report.unit}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">vs Previous</span>
                  <span className={`trend-value ${report.trend >= 0 ? 'up' : 'down'}`}>
                    {report.trend > 0 ? '+' : ''}{report.trend}%
                  </span>
                </div>
              </div>

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

              {expandedReport === report.id && (
                <div className="expanded-details">
                  <h4>Detailed Breakdown</h4>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span>Mobile Combustion</span>
                      <span>{(report.scope1 * 0.4).toFixed(1)} tCO₂e</span>
                    </div>
                    <div className="detail-item">
                      <span>Stationary Combustion</span>
                      <span>{(report.scope1 * 0.3).toFixed(1)} tCO₂e</span>
                    </div>
                    <div className="detail-item">
                      <span>Electricity</span>
                      <span>{(report.scope2 * 0.7).toFixed(1)} tCO₂e</span>
                    </div>
                    <div className="detail-item">
                      <span>Heating/Cooling</span>
                      <span>{(report.scope2 * 0.3).toFixed(1)} tCO₂e</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}

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
        <div className="trend-view">
          <Card className="trend-card">
            <h3>Emissions Trend Analysis</h3>
            <p className="trend-subtitle">
              {selectedCity !== "all" ? `Showing trends for ${selectedCity}` : "Showing trends for all cities"}
            </p>
            
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

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .section-header h2 {
          font-size: 18px;
          font-weight: 600;
          color: #1B4D3E;
          margin: 0;
        }

        .view-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 30px;
          color: #374151;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-toggle:hover {
          border-color: #2E7D64;
          background: #F8FAF8;
        }

        .view-toggle.active {
          background: #2E7D64;
          color: white;
          border-color: #2E7D64;
        }

        .reports-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .report-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #E5E7EB;
          transition: all 0.3s ease;
        }

        .report-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border-color: #2E7D64;
        }

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
          background: #F8FAF8;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: #2E7D64;
          border: 1px solid #E5E7EB;
        }

        .report-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1B4D3E;
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

        .expand-btn:hover {
          color: #2E7D64;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 20px;
          padding: 16px;
          background: #F9FAFB;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
        }

        .stat-box {
          text-align: center;
        }

        .stat-box.highlight {
          background: #F8FAF8;
          border-radius: 12px;
          padding: 8px;
          border: 1px solid #E5E7EB;
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
          color: #1B4D3E;
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
          color: #4A5568;
        }

        .progress-value {
          font-weight: 600;
          color: #1B4D3E;
        }

        .progress-footer {
          font-size: 12px;
          color: #9CA3AF;
          margin-top: 8px;
          text-align: right;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          border-top: 1px solid #E5E7EB;
          padding-top: 20px;
        }

        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn.view {
          background: #F8FAF8;
          border: 1px solid #E5E7EB;
          color: #374151;
        }

        .action-btn.view:hover {
          background: #E5E7EB;
          border-color: #2E7D64;
        }

        .action-btn.download {
          background: #2E7D64;
          border: none;
          color: white;
        }

        .action-btn.download:hover {
          background: #1B4D3E;
        }

        .action-btn.export {
          background: white;
          border: 1px solid #2E7D64;
          color: #2E7D64;
        }

        .action-btn.export:hover {
          background: #F8FAF8;
        }

        .expanded-details {
          margin-top: 20px;
          padding: 20px;
          background: #F9FAFB;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .expanded-details h4 {
          font-size: 15px;
          font-weight: 600;
          color: #1B4D3E;
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
          border: 1px solid #E5E7EB;
        }

        .detail-item span:first-child {
          color: #4A5568;
        }

        .detail-item span:last-child {
          font-weight: 600;
          color: #1B4D3E;
        }

        .empty-state {
          text-align: center;
          padding: 60px 24px;
          border: 1px solid #E5E7EB;
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
          background: #2E7D64;
          color: white;
          border: none;
          border-radius: 30px;
          font-weight: 600;
          cursor: pointer;
        }

        .generate-first-btn:hover {
          background: #1B4D3E;
        }

        .trend-view {
          margin-top: 20px;
        }

        .trend-card {
          padding: 32px;
          text-align: center;
          border: 1px solid #E5E7EB;
        }

        .trend-card h3 {
          font-size: 20px;
          font-weight: 700;
          color: #1B4D3E;
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
          border-radius: 12px;
          border: 1px solid #E5E7EB;
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
          background: #2E7D64;
          border-radius: 4px 4px 0 0;
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
          background: #F8FAF8;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
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
          color: #1B4D3E;
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
          border-radius: 8px;
          border-left: 4px solid #2E7D64;
          text-align: left;
          border: 1px solid #E5E7EB;
        }

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