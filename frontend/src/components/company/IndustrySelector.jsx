// src/components/company/IndustrySelector.jsx
import { FiBriefcase } from "react-icons/fi";

export default function IndustrySelector({ data, updateField }) {
  const industries = [
    { label: "🏭 Manufacturing", value: "manufacturing" },
    { label: "💻 IT / Software", value: "it" },
    { label: "🏥 Healthcare", value: "healthcare" },
    { label: "📚 Education", value: "education" },
    { label: "🛍️ Retail", value: "retail" },
    { label: "🚚 Logistics", value: "logistics" },
    { label: "🏨 Hospitality", value: "hospitality" },
    { label: "🌾 Agriculture", value: "agriculture" },
    { label: "⚡ Energy", value: "energy" },
    { label: "🏗️ Construction", value: "construction" },
    { label: "📞 Telecommunications", value: "telecom" },
    { label: "🎨 Creative / Design", value: "creative" },
    { label: "📊 Financial Services", value: "finance" },
    { label: "⚙️ Other", value: "other" },
  ];

  const selectedIndustry = industries.find(i => i.value === data.industry);

  return (
    <div className="form-step">
      <div className="step-header">
        <span className="step-icon">🏭</span>
        <h3>Select Industry</h3>
      </div>

      <p className="step-description">
        Your industry helps us provide relevant benchmarks and emission factors.
      </p>

      <div className="industry-grid">
        <div className="field-group">
          <label className="field-label">
            Industry <span className="required">*</span>
          </label>
          <select
            className="field-select"
            value={data.industry}
            onChange={(e) => updateField("industry", e.target.value)}
          >
            <option value="">Choose your primary industry</option>
            {industries.map((industry) => (
              <option key={industry.value} value={industry.value}>
                {industry.label}
              </option>
            ))}
          </select>
        </div>
        
        {data.industry && selectedIndustry && (
          <div className="industry-badge">
            <FiBriefcase />
            <span>Selected: {selectedIndustry.label.replace(/[🏭💻🏥📚🛍️🚚🏨🌾⚡🏗️📞🎨📊⚙️]/g, '')}</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .form-step {
          animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .step-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .step-icon {
          font-size: 32px;
        }

        .step-header h3 {
          font-size: 22px;
          font-weight: 700;
          color: #1B4D3E;
          margin: 0;
        }

        .step-description {
          color: #4A5568;
          margin-bottom: 32px;
          font-size: 15px;
          line-height: 1.6;
        }

        .industry-grid {
          max-width: 400px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .required {
          color: #DC2626;
        }

        .field-select {
          padding: 12px 16px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s ease;
          background: white;
          cursor: pointer;
        }

        .field-select:focus {
          outline: none;
          border-color: #2E7D64;
        }

        .industry-badge {
          margin-top: 16px;
          padding: 12px 16px;
          background: #F8FAF8;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #2E7D64;
          border: 1px solid #E5E7EB;
        }
      `}</style>
    </div>
  );
}