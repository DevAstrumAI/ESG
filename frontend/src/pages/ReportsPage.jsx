// src/pages/ReportsPage.jsx
import React, { useState, useEffect } from "react";
import ReportsOverview from "../components/reports/ReportsOverview";
import { FiFileText, FiDownload, FiCalendar, FiFilter, FiBarChart2, FiMapPin } from "react-icons/fi";
import { BiLeaf } from "react-icons/bi";
import Card from "../components/ui/Card";
import { useEmissionStore } from "../store/emissionStore"; // Add this import

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedCity, setSelectedCity] = useState("all"); // Add city filter
  const [cities, setCities] = useState([]);

  // Get company data from store (you'll need to add this to your store)
  // For now, using sample data from company setup
  useEffect(() => {
    // This should come from your store/context
    // Example structure from company setup
    const companyLocations = [
      { id: 1, city: "Dubai", country: "UAE" },
      { id: 2, city: "Abu Dhabi", country: "UAE" },
      { id: 3, city: "Doha", country: "Qatar" },
      { id: 4, city: "Riyadh", country: "Saudi Arabia" },
    ];
    
    // Extract unique cities
    const uniqueCities = ["all", ...new Set(companyLocations.map(loc => loc.city))];
    setCities(uniqueCities);
  }, []);

  return (
    <div className="reports-page">
      {/* Header Section */}
      <div className="reports-header">
        <div className="header-left">
          <div className="header-icon">
            <FiFileText />
          </div>
          <div>
            <h1>Emissions Reports</h1>
            <p>Generate and download comprehensive emission reports</p>
          </div>
        </div>
        
        <div className="header-actions">
          <button className="export-all-btn">
            <FiDownload /> Export All Data
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="filters-card">
        <div className="filters-grid">
          {/* City Filter - New */}
          <div className="filter-group">
            <label>
              <FiMapPin className="filter-icon" />
              City
            </label>
            <select 
              value={selectedCity} 
              onChange={(e) => setSelectedCity(e.target.value)}
              className="filter-select"
            >
              {cities.map(city => (
                <option key={city} value={city}>
                  {city === 'all' ? 'All Cities' : city}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>
              <FiCalendar className="filter-icon" />
              Report Period
            </label>
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="filter-select"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div className="filter-group">
            <label>
              <FiBarChart2 className="filter-icon" />
              Year
            </label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="filter-select"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>

          <button className="filter-btn">
            <FiFilter /> Apply Filters
          </button>
        </div>

        <div className="quick-stats">
          <div className="quick-stat">
            <BiLeaf className="stat-icon" />
            <div>
              <span className="stat-label">Total Reports</span>
              <span className="stat-value">12</span>
            </div>
          </div>
          <div className="stat-divider"></div>
          <div className="quick-stat">
            <FiFileText className="stat-icon" />
            <div>
              <span className="stat-label">Generated</span>
              <span className="stat-value">8</span>
            </div>
          </div>
          <div className="stat-divider"></div>
          <div className="quick-stat">
            <FiDownload className="stat-icon" />
            <div>
              <span className="stat-label">Downloads</span>
              <span className="stat-value">24</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Reports Overview - Pass city filter as prop */}
      <ReportsOverview selectedCity={selectedCity} />

      {/* Report Templates Section */}
      <Card className="templates-card">
        <h3>Report Templates</h3>
        <p className="templates-subtitle">Quickly generate standardized reports</p>
        
        <div className="templates-grid">
          <div className="template-item">
            <div className="template-icon">📊</div>
            <div className="template-content">
              <h4>ESG Summary Report</h4>
              <p>High-level overview for stakeholders</p>
            </div>
            <button className="generate-btn">Generate</button>
          </div>

          <div className="template-item">
            <div className="template-icon">📈</div>
            <div className="template-content">
              <h4>Detailed Emissions Report</h4>
              <p>Scope-by-scope breakdown with trends</p>
            </div>
            <button className="generate-btn">Generate</button>
          </div>

          <div className="template-item">
            <div className="template-icon">🌍</div>
            <div className="template-content">
              <h4>Regulatory Compliance Report</h4>
              <p>Ready for submission to authorities</p>
            </div>
            <button className="generate-btn">Generate</button>
          </div>
        </div>
      </Card>

      <style jsx>{`
        .reports-page {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* Header */
        .reports-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-icon {
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

        .header-left h1 {
          font-size: 28px;
          font-weight: 700;
          color: #14532D;
          margin: 0 0 4px;
        }

        .header-left p {
          color: #4B5563;
          margin: 0;
        }

        .export-all-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #15803D, #22C55E);
          color: white;
          border: none;
          border-radius: 30px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .export-all-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(34, 197, 94, 0.3);
        }

        /* Filters Card */
        .filters-card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 24px;
          border: 1px solid rgba(34, 197, 94, 0.1);
        }

        .filters-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr auto;
          gap: 16px;
          margin-bottom: 20px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filter-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .filter-icon {
          color: #22C55E;
        }

        .filter-select {
          padding: 12px 16px;
          border: 2px solid #E5E7EB;
          border-radius: 12px;
          font-size: 14px;
          color: #1F2937;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-select:hover, .filter-select:focus {
          border-color: #22C55E;
          outline: none;
        }

        .filter-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: #F3F4F6;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          color: #374151;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          align-self: flex-end;
        }

        .filter-btn:hover {
          background: #E5E7EB;
        }

        /* Quick Stats */
        .quick-stats {
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding-top: 20px;
          border-top: 1px solid rgba(34, 197, 94, 0.1);
        }

        .quick-stat {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .stat-icon {
          font-size: 24px;
          color: #22C55E;
        }

        .stat-label {
          display: block;
          font-size: 12px;
          color: #6B7280;
          margin-bottom: 2px;
        }

        .stat-value {
          display: block;
          font-size: 20px;
          font-weight: 700;
          color: #14532D;
        }

        .stat-divider {
          width: 1px;
          height: 40px;
          background: rgba(34, 197, 94, 0.2);
        }

        /* Templates Card */
        .templates-card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          margin-top: 24px;
          border: 1px solid rgba(34, 197, 94, 0.1);
        }

        .templates-card h3 {
          font-size: 18px;
          font-weight: 600;
          color: #14532D;
          margin: 0 0 4px;
        }

        .templates-subtitle {
          color: #6B7280;
          font-size: 14px;
          margin: 0 0 20px;
        }

        .templates-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .template-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: #F9FAFB;
          border-radius: 16px;
          border: 1px solid rgba(34, 197, 94, 0.1);
          transition: all 0.2s ease;
        }

        .template-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(34, 197, 94, 0.1);
        }

        .template-icon {
          font-size: 32px;
        }

        .template-content {
          flex: 1;
        }

        .template-content h4 {
          font-size: 15px;
          font-weight: 600;
          color: #14532D;
          margin: 0 0 4px;
        }

        .template-content p {
          font-size: 12px;
          color: #6B7280;
          margin: 0;
        }

        .generate-btn {
          padding: 8px 16px;
          background: white;
          border: 2px solid #22C55E;
          border-radius: 30px;
          color: #15803D;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .generate-btn:hover {
          background: #22C55E;
          color: white;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .templates-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }

          .filter-btn {
            align-self: stretch;
          }

          .quick-stats {
            flex-direction: column;
            gap: 16px;
          }

          .stat-divider {
            width: 80%;
            height: 1px;
          }

          .templates-grid {
            grid-template-columns: 1fr;
          }

          .template-item {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}