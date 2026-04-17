// src/components/company/CountrySelector.jsx
import SelectDropdown from "../ui/SelectDropdown";
import { FiMapPin } from "react-icons/fi";

export default function CountrySelector({ data, updateField }) {
  // Countries by region
  const countriesByRegion = {
    "middle-east": [
      { label: "🇦🇪 United Arab Emirates", value: "uae" },
      { label: "🇸🇦 Saudi Arabia", value: "saudi-arabia" },
    ],
    "asia-pacific": [
      { label: "🇸🇬 Singapore", value: "singapore" },
    ],
    "eu": [],
    "uk": [],
    "us": [],
    "in": [],
    "cn": [],
    "other": [],
  };

  const availableCountries = countriesByRegion[data.region] || [];

  if (!data.region || data.region === "other" || availableCountries.length === 0) {
    return null;
  }

  return (
    <div className="country-selector">
      <div className="step-subheader">
        <FiMapPin className="subheader-icon" />
        <h4>Select Country</h4>
      </div>

      <p className="sub-description">
        Choose the country where your cities are located.
      </p>

      <div className="country-grid">
        <SelectDropdown
          label="Country"
          value={data.country || ""}
          onChange={(e) => {
            updateField("country", e.target.value);
            // Reset locations when country changes
            updateField("locations", []);
          }}
          options={availableCountries}
          placeholder="Select a country"
          required
        />
      </div>

      <style jsx>{`
        .country-selector {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #E5E7EB;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .step-subheader {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .subheader-icon {
          font-size: 18px;
          color: #2E7D64;
        }

        .step-subheader h4 {
          font-size: 16px;
          font-weight: 600;
          color: #1B4D3E;
          margin: 0;
        }

        .sub-description {
          color: #4A5568;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .country-grid {
          max-width: 400px;
        }
      `}</style>
    </div>
  );
}