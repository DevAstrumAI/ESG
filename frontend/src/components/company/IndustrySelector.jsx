// src/components/company/IndustrySelector.jsx
import SelectDropdown from "../ui/SelectDropdown";
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
        <SelectDropdown
          label="Industry"
          value={data.industry}
          onChange={(e) => updateField("industry", e.target.value)}
          options={industries}
          placeholder="Choose your primary industry"
          required
        />
        
        {data.industry && (
          <div className="industry-badge">
            <FiBriefcase />
            <span>Selected: {industries.find(i => i.value === data.industry)?.label.replace(/[🏭💻🏥📚🛍️🚚🏨🌾⚡🏗️📞🎨📊⚙️]/g, '')}</span>
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
          color: #14532D;
          margin: 0;
        }

        .step-description {
          color: #4B5563;
          margin-bottom: 32px;
          font-size: 15px;
          line-height: 1.6;
        }

        .industry-grid {
          max-width: 400px;
        }

        .industry-badge {
          margin-top: 16px;
          padding: 12px 16px;
          background: #F0FDF4;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #15803D;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }
      `}</style>
    </div>
  );
}