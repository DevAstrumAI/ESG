// src/components/company/RegionSelector.jsx
import SelectDropdown from "../ui/SelectDropdown";
import { FiGlobe } from "react-icons/fi";

export default function RegionSelector({ data, updateField }) {
  const regions = [
    { label: "🌍 Middle East", value: "middle-east", flag: "🌍" },
    { label: "🇪🇺 Europe (EU)", value: "eu", flag: "🇪🇺" },
    { label: "🇬🇧 United Kingdom (UK)", value: "uk", flag: "🇬🇧" },
    { label: "🇺🇸 United States (US)", value: "us", flag: "🇺🇸" },
    { label: "🇮🇳 India", value: "in", flag: "🇮🇳" },
    { label: "🇨🇳 China", value: "cn", flag: "🇨🇳" },
    { label: "🌍 Other", value: "other", flag: "🌍" },
  ];

  return (
    <div className="form-step">
      <div className="step-header">
        <span className="step-icon">🌍</span>
        <h3>Select Region</h3>
      </div>

      <p className="step-description">
        Your region determines default emission factors and reporting standards.
      </p>

      <div className="region-grid">
        <SelectDropdown
          label="Region"
          value={data.region}
          onChange={(e) => {
            updateField("region", e.target.value);
            // Reset country and locations when region changes
            updateField("country", "");
            updateField("locations", []);
          }}
          options={regions}
          placeholder="Choose your primary operating region"
          required
        />
        
        {data.region && (
          <div className="region-info">
            <FiGlobe />
            <span>Emission factors will be based on {regions.find(r => r.value === data.region)?.label}</span>
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

        .region-grid {
          max-width: 400px;
        }

        .region-info {
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