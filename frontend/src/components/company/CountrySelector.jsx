// src/components/company/CountrySelector.jsx
import SelectDropdown from "../ui/SelectDropdown";
import { FiMapPin } from "react-icons/fi";

export default function CountrySelector({ data, updateField }) {
  // Countries by region
  const countriesByRegion = {
    "middle-east": [
      { label: "🇦🇪 United Arab Emirates", value: "uae" },
      { label: "🇶🇦 Qatar", value: "qatar" },
      { label: "🇸🇦 Saudi Arabia", value: "saudi" },
    ],
    "eu": [
      { label: "🇩🇪 Germany", value: "germany" },
      { label: "🇫🇷 France", value: "france" },
      { label: "🇮🇹 Italy", value: "italy" },
      { label: "🇪🇸 Spain", value: "spain" },
    ],
    "uk": [{ label: "🇬🇧 United Kingdom", value: "uk" }],
    "us": [{ label: "🇺🇸 United States", value: "us" }],
    "in": [{ label: "🇮🇳 India", value: "india" }],
    "cn": [{ label: "🇨🇳 China", value: "china" }],
    "other": [{ label: "🌍 Other", value: "other" }],
  };

  const availableCountries = countriesByRegion[data.region] || [];

  if (!data.region || data.region === "other") {
    return null;
  }

  return (
    <div className="country-selector">
      <div className="step-subheader">
        <FiMapPin className="subheader-icon" />
        <h4>Select Country</h4>
      </div>

      <p className="sub-description">
        Choose the country where your facilities are located.
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
          border-top: 1px solid rgba(34, 197, 94, 0.2);
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
          color: #22C55E;
        }

        .step-subheader h4 {
          font-size: 16px;
          font-weight: 600;
          color: #14532D;
          margin: 0;
        }

        .sub-description {
          color: #4B5563;
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