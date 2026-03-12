// src/pages/UserGuide.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  FiTruck, 
  FiZap, 
  FiHome, 
  FiSettings, 
  FiFileText, 
  FiArrowRight,
  FiCheckCircle,
  FiAlertCircle,
  FiDownload,
  FiSearch,
  FiFilter,
  FiBarChart2
} from "react-icons/fi";
import { BiLeaf, BiRecycle } from "react-icons/bi";
import { GiEarthAmerica, GiFactory, GiSolarPower } from "react-icons/gi";

export default function UserGuide() {
  const [activeSection, setActiveSection] = useState("getting-started");

  const sections = [
    { id: "getting-started", label: "Getting Started", icon: <FiHome /> },
    { id: "scope1", label: "Scope 1 Emissions", icon: <FiTruck /> },
    { id: "scope2", label: "Scope 2 Emissions", icon: <FiZap /> },
    { id: "company-setup", label: "Company Setup", icon: <FiSettings /> },
    { id: "reports", label: "Reports & Analytics", icon: <FiFileText /> },
    { id: "best-practices", label: "Best Practices", icon: <BiLeaf /> },
  ];

  return (
    <div className="guide-container">
      {/* Header */}
      <div className="guide-header">
        <div className="header-content">
          <BiLeaf className="header-leaf" />
          <h1>User Guide</h1>
          <p>Everything you need to know about using ESG Calculator</p>
        </div>
      </div>

      <div className="guide-layout">
        {/* Sidebar Navigation */}
        <div className="guide-sidebar">
          <h3>Guide Sections</h3>
          <ul>
            {sections.map((section) => (
              <li key={section.id}>
                <button
                  onClick={() => setActiveSection(section.id)}
                  className={`section-btn ${activeSection === section.id ? 'active' : ''}`}
                >
                  <span className="section-icon">{section.icon}</span>
                  {section.label}
                </button>
              </li>
            ))}
          </ul>
          
          <div className="guide-help">
            <FiAlertCircle />
            <p>Need additional help? <Link to="/help">Contact support</Link></p>
          </div>
        </div>

        {/* Main Content */}
        <div className="guide-content">
          {activeSection === "getting-started" && (
            <div className="content-section">
              <h2>Getting Started with ESG Calculator</h2>
              
              <div className="welcome-card">
                <GiEarthAmerica className="welcome-icon" />
                <div>
                  <h3>Welcome to your sustainability journey!</h3>
                  <p>ESG Calculator helps you track, manage, and reduce your company's carbon emissions across all scopes.</p>
                </div>
              </div>

              <div className="steps-grid">
                <div className="step-card">
                  <div className="step-number">1</div>
                  <h4>Complete Company Setup</h4>
                  <p>Add your company details, industry, and baseline year</p>
                </div>
                <div className="step-card">
                  <div className="step-number">2</div>
                  <h4>Enter Scope 1 Data</h4>
                  <p>Record direct emissions from owned sources</p>
                </div>
                <div className="step-card">
                  <div className="step-number">3</div>
                  <h4>Enter Scope 2 Data</h4>
                  <p>Track indirect emissions from purchased energy</p>
                </div>
                <div className="step-card">
                  <div className="step-number">4</div>
                  <h4>Generate Reports</h4>
                  <p>Analyze trends and export sustainability reports</p>
                </div>
              </div>

              <div className="tip-box">
                <FiCheckCircle className="tip-icon" />
                <div>
                  <strong>Pro Tip:</strong> Start with your most accessible data. You can always add more details later!
                </div>
              </div>
            </div>
          )}

          {activeSection === "scope1" && (
            <div className="content-section">
              <h2>Scope 1: Direct Emissions</h2>
              
              <div className="scope-overview">
                <GiFactory className="scope-icon" />
                <p>Scope 1 covers direct emissions from sources you own or control.</p>
              </div>

              <div className="category-grid">
                <div className="category-card">
                  <FiTruck className="category-icon" />
                  <h4>Mobile Combustion</h4>
                  <ul>
                    <li>Company vehicles</li>
                    <li>Fleet operations</li>
                    <li>Transport equipment</li>
                  </ul>
                </div>

                <div className="category-card">
                  <GiFactory className="category-icon" />
                  <h4>Stationary Combustion</h4>
                  <ul>
                    <li>Boilers & furnaces</li>
                    <li>Generators</li>
                    <li>On-site equipment</li>
                  </ul>
                </div>

                <div className="category-card">
                  <BiRecycle className="category-icon" />
                  <h4>Refrigerants</h4>
                  <ul>
                    <li>HVAC systems</li>
                    <li>Refrigeration units</li>
                    <li>Leakage events</li>
                  </ul>
                </div>

                <div className="category-card">
                  <FiAlertCircle className="category-icon" />
                  <h4>Fugitive Emissions</h4>
                  <ul>
                    <li>Gas leaks</li>
                    <li>Methane emissions</li>
                    <li>Industrial processes</li>
                  </ul>
                </div>
              </div>

              <div className="instruction-steps">
                <h3>How to enter Scope 1 data:</h3>
                <ol>
                  <li>Navigate to the <strong>Scope 1</strong> tab</li>
                  <li>Select the emission category (Mobile, Stationary, etc.)</li>
                  <li>Enter fuel type and consumption amount</li>
                  <li>Click "Add Entry" to save</li>
                  <li>Repeat for all emission sources</li>
                </ol>
              </div>
            </div>
          )}

          {activeSection === "scope2" && (
            <div className="content-section">
              <h2>Scope 2: Indirect Emissions</h2>
              
              <div className="scope-overview">
                <FiZap className="scope-icon" />
                <p>Scope 2 covers indirect emissions from purchased energy.</p>
              </div>

              <div className="category-grid">
                <div className="category-card">
                  <FiZap className="category-icon" />
                  <h4>Purchased Electricity</h4>
                  <ul>
                    <li>Grid electricity</li>
                    <li>Supplier-specific</li>
                    <li>With REC certificates</li>
                  </ul>
                </div>

                <div className="category-card">
                  <GiSolarPower className="category-icon" />
                  <h4>Heating & Cooling</h4>
                  <ul>
                    <li>District heating</li>
                    <li>Steam purchases</li>
                    <li>Cooling services</li>
                  </ul>
                </div>

                <div className="category-card">
                  <BiRecycle className="category-icon" />
                  <h4>Renewable Energy</h4>
                  <ul>
                    <li>On-site generation</li>
                    <li>Solar panels</li>
                    <li>Wind turbines</li>
                  </ul>
                </div>
              </div>

              <div className="method-box">
                <h4>Calculation Methods:</h4>
                <div className="method-row">
                  <span className="method-badge">Location-based</span>
                  <p>Uses average grid emission factors</p>
                </div>
                <div className="method-row">
                  <span className="method-badge">Market-based</span>
                  <p>Uses supplier-specific factors and RECs</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === "company-setup" && (
            <div className="content-section">
              <h2>Company Setup</h2>
              
              <div className="setup-wizard">
                <div className="setup-step">
                  <div className="setup-step-number">1</div>
                  <div className="setup-step-content">
                    <h4>Basic Information</h4>
                    <p>Company name, industry, location, and size</p>
                  </div>
                </div>

                <div className="setup-step">
                  <div className="setup-step-number">2</div>
                  <div className="setup-step-content">
                    <h4>Reporting Period</h4>
                    <p>Set your fiscal year and baseline year</p>
                  </div>
                </div>

                <div className="setup-step">
                  <div className="setup-step-number">3</div>
                  <div className="setup-step-content">
                    <h4>Emission Factors</h4>
                    <p>Choose default factors or upload custom</p>
                  </div>
                </div>

                <div className="setup-step">
                  <div className="setup-step-number">4</div>
                  <div className="setup-step-content">
                    <h4>Team Members</h4>
                    <p>Add colleagues and set permissions</p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeSection === "reports" && (
            <div className="content-section">
              <h2>Reports & Analytics</h2>
              
              <div className="reports-overview">
                <div className="report-feature">
                  <FiBarChart2 />
                  <div>
                    <h4>Emission Trends</h4>
                    <p>Track changes over time with interactive charts</p>
                  </div>
                </div>

                <div className="report-feature">
                  <FiFilter />
                  <div>
                    <h4>Data Filtering</h4>
                    <p>Filter by scope, category, date range</p>
                  </div>
                </div>

                <div className="report-feature">
                  <FiSearch />
                  <div>
                    <h4>Drill-down Analysis</h4>
                    <p>Click through to see detailed breakdowns</p>
                  </div>
                </div>

                <div className="report-feature">
                  <FiDownload />
                  <div>
                    <h4>Export Options</h4>
                    <p>Download as PDF, Excel, or CSV</p>
                  </div>
                </div>
              </div>

              <div className="report-types">
                <h3>Available Reports:</h3>
                <ul>
                  <li>Monthly Emissions Summary</li>
                  <li>Year-over-Year Comparison</li>
                  <li>Scope Breakdown Analysis</li>
                  <li>Custom Date Range Reports</li>
                  <li>ESG Disclosure Ready Format</li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === "best-practices" && (
            <div className="content-section">
              <h2>Best Practices</h2>
              
              <div className="practices-list">
                <div className="practice-item">
                  <FiCheckCircle className="practice-icon" />
                  <div>
                    <h4>Update Monthly</h4>
                    <p>Regular updates ensure accurate tracking and early detection of anomalies</p>
                  </div>
                </div>

                <div className="practice-item">
                  <FiCheckCircle className="practice-icon" />
                  <div>
                    <h4>Verify Data Sources</h4>
                    <p>Double-check utility bills and fuel receipts for accuracy</p>
                  </div>
                </div>

                <div className="practice-item">
                  <FiCheckCircle className="practice-icon" />
                  <div>
                    <h4>Document Assumptions</h4>
                    <p>Keep notes on calculation methods for audit readiness</p>
                  </div>
                </div>

                <div className="practice-item">
                  <FiCheckCircle className="practice-icon" />
                  <div>
                    <h4>Review Annually</h4>
                    <p>Conduct annual reviews of emission factors and methodology</p>
                  </div>
                </div>
              </div>

              <div className="quote-box">
                <BiLeaf />
                <p>"What gets measured gets managed. Regular tracking is key to reduction."</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .guide-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
        }

        .guide-header {
          background: linear-gradient(135deg, #14532D 0%, #166534 100%);
          color: white;
          padding: 40px 24px;
          text-align: center;
        }

        .header-content {
          max-width: 800px;
          margin: 0 auto;
        }

        .header-leaf {
          font-size: 48px;
          margin-bottom: 16px;
          color: rgba(255,255,255,0.2);
        }

        .header-content h1 {
          font-size: 36px;
          margin: 0 0 8px;
        }

        .header-content p {
          font-size: 16px;
          opacity: 0.9;
        }

        .guide-layout {
          display: flex;
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 24px;
          gap: 32px;
        }

        /* Sidebar */
        .guide-sidebar {
          width: 260px;
          flex-shrink: 0;
        }

        .guide-sidebar h3 {
          color: #14532D;
          margin-bottom: 20px;
          font-size: 18px;
        }

        .guide-sidebar ul {
          list-style: none;
          padding: 0;
          margin: 0 0 24px;
        }

        .section-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border: none;
          background: none;
          border-radius: 12px;
          color: #4B5563;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .section-btn:hover {
          background: rgba(34, 197, 94, 0.1);
          color: #15803D;
        }

        .section-btn.active {
          background: #15803D;
          color: white;
        }

        .section-icon {
          font-size: 18px;
        }

        .guide-help {
          background: white;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid rgba(34, 197, 94, 0.2);
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
        }

        .guide-help a {
          color: #15803D;
          text-decoration: none;
          font-weight: 600;
        }

        /* Main Content */
        .guide-content {
          flex: 1;
          background: white;
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 10px 30px rgba(0,40,0,0.1);
        }

        .content-section h2 {
          color: #14532D;
          font-size: 28px;
          margin: 0 0 24px;
        }

        /* Welcome Card */
        .welcome-card {
          display: flex;
          align-items: center;
          gap: 20px;
          background: #F0FDF4;
          padding: 24px;
          border-radius: 20px;
          margin-bottom: 32px;
        }

        .welcome-icon {
          font-size: 48px;
          color: #22C55E;
        }

        /* Steps Grid */
        .steps-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }

        .step-card {
          background: #F9FAFB;
          padding: 24px;
          border-radius: 16px;
          position: relative;
          border: 1px solid rgba(34, 197, 94, 0.1);
        }

        .step-number {
          width: 32px;
          height: 32px;
          background: #22C55E;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          margin-bottom: 16px;
        }

        /* Tip Box */
        .tip-box {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #FEF3C7;
          padding: 16px 24px;
          border-radius: 16px;
          color: #92400E;
        }

        .tip-icon {
          color: #F59E0B;
          font-size: 24px;
        }

        /* Scope Overview */
        .scope-overview {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #F0FDF4;
          padding: 20px;
          border-radius: 16px;
          margin-bottom: 32px;
        }

        .scope-icon {
          font-size: 32px;
          color: #22C55E;
        }

        /* Category Grid */
        .category-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }

        .category-card {
          background: white;
          padding: 24px;
          border-radius: 16px;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .category-icon {
          font-size: 28px;
          color: #22C55E;
          margin-bottom: 16px;
        }

        .category-card h4 {
          color: #14532D;
          margin: 0 0 12px;
        }

        .category-card ul {
          margin: 0;
          padding-left: 20px;
          color: #4B5563;
        }

        .category-card li {
          margin-bottom: 4px;
        }

        /* Instruction Steps */
        .instruction-steps {
          background: #F9FAFB;
          padding: 24px;
          border-radius: 16px;
        }

        .instruction-steps ol {
          margin: 16px 0 0;
          padding-left: 20px;
          color: #4B5563;
        }

        .instruction-steps li {
          margin-bottom: 8px;
        }

        /* Method Box */
        .method-box {
          background: #F0FDF4;
          padding: 24px;
          border-radius: 16px;
        }

        .method-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 12px;
        }

        .method-badge {
          background: #22C55E;
          color: white;
          padding: 4px 12px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 600;
        }

        /* Setup Wizard */
        .setup-wizard {
          margin: 32px 0;
        }

        .setup-step {
          display: flex;
          gap: 20px;
          margin-bottom: 24px;
        }

        .setup-step-number {
          width: 40px;
          height: 40px;
          background: #22C55E;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
        }

        .file-upload-note {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #F3F4F6;
          border-radius: 12px;
          color: #4B5563;
        }

        /* Reports */
        .reports-overview {
          display: grid;
          gap: 20px;
          margin-bottom: 32px;
        }

        .report-feature {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: #F9FAFB;
          border-radius: 16px;
        }

        .report-feature svg {
          font-size: 24px;
          color: #22C55E;
        }

        .report-types {
          background: #F0FDF4;
          padding: 24px;
          border-radius: 16px;
        }

        .report-types ul {
          margin: 16px 0 0;
          columns: 2;
          color: #4B5563;
        }

        /* Best Practices */
        .practices-list {
          display: grid;
          gap: 20px;
          margin-bottom: 32px;
        }

        .practice-item {
          display: flex;
          gap: 16px;
          padding: 20px;
          background: #F9FAFB;
          border-radius: 16px;
        }

        .practice-icon {
          color: #22C55E;
          font-size: 24px;
          flex-shrink: 0;
        }

        .quote-box {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 24px;
          background: #14532D;
          color: white;
          border-radius: 16px;
          font-style: italic;
        }

        .quote-box svg {
          font-size: 32px;
          opacity: 0.5;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .guide-layout {
            flex-direction: column;
          }

          .guide-sidebar {
            width: 100%;
          }

          .steps-grid,
          .category-grid {
            grid-template-columns: 1fr;
          }

          .report-types ul {
            columns: 1;
          }
        }
      `}</style>
    </div>
  );
}