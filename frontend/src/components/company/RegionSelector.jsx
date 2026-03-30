// src/components/company/RegionSelector.jsx
import { FiGlobe } from "react-icons/fi";

export default function RegionSelector({ data, updateField }) {
  const regions = [
    { label: "🌍 Middle East", value: "middle-east" },
    { label: "🌏 Asia Pacific", value: "asia-pacific" },
  ];

  const selectedRegion = regions.find(r => r.value === data.region);

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
        <div className="field-group">
          <label className="field-label">
            Region <span className="required">*</span>
          </label>
          <select
            className="field-select"
            value={data.region}
            onChange={(e) => {
              updateField("region", e.target.value);
              updateField("country", "");
              updateField("locations", []);
            }}
          >
            <option value="">Choose your primary operating region</option>
            {regions.map((region) => (
              <option key={region.value} value={region.value}>
                {region.label}
              </option>
            ))}
          </select>
        </div>
        
        {data.region && selectedRegion && (
          <div className="region-info">
            <FiGlobe />
            <span>Emission factors will be based on {selectedRegion.label}</span>
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

        .region-grid {
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

        .region-info {
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