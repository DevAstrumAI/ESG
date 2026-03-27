// src/pages/SettingsPage.jsx
import React, { useState, useEffect } from "react";
import Card from "../components/ui/Card";
import PrimaryButton from "../components/ui/PrimaryButton";
import SelectDropdown from "../components/ui/SelectDropdown";
import { 
  FiSave, 
  FiRefreshCw, 
  FiGlobe, 
  FiDollarSign, 
  FiCalendar,
  FiMapPin,
  FiZap,
  FiThermometer,
  FiAlertCircle,
  FiCheckCircle,
  FiTrash2
} from "react-icons/fi";
import { BiLeaf, BiWorld, BiGasPump, BiBuilding } from "react-icons/bi";
import { useSettingsStore } from "../store/settingsStore";
import { useAuthStore } from "../store/authStore";
import { useCompanyStore } from "../store/companyStore";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  const token = useAuthStore((s) => s.token);
  const { company, fetchCompany } = useCompanyStore();

  const {
    reportingYear,
    currency,
    distanceUnit,
    fuelUnit,
    electricityUnit,
    heatUnit,
    factorSource,
    updateSetting,
    resetSettings,
    fetchSettings,
    saveSettings,
  } = useSettingsStore();

  // Helper function to convert region codes to readable names
  const getRegionDisplay = (regionCode) => {
    const regions = {
      'middle-east': 'Middle East',
      'asia-pacific': 'Asia Pacific',
      'eu': 'Europe (EU)',
      'uk': 'United Kingdom',
      'us': 'United States',
      'in': 'India',
      'cn': 'China',
      'other': 'Other',
    };
    return regions[regionCode] || regionCode || '—';
  };

  const getRegionFromCompany = (company) => {
    if (!company) return null;
    
    // Try basicInfo.region first
    if (company.basicInfo?.region) return company.basicInfo.region;
    
    // Try to infer region from country
    if (company.locations?.[0]?.country) {
      const country = company.locations[0].country;
      // Map country to region
      if (country === 'uae' || country === 'qatar' || country === 'saudi-arabia') {
        return 'middle-east';
      }
      if (country === 'singapore') {
        return 'asia-pacific';
      }
    }
    
    // If all else fails, return null
    return null;
  };

  // Fetch company data on mount
  useEffect(() => {
    if (token && !company) {
      fetchCompany(token);
    }
  }, [token, company, fetchCompany]);

  // Populate company info when available
  useEffect(() => {
    if (company) {
      setCompanyName(company.basicInfo?.name || "");
      setIndustry(company.basicInfo?.industry || "");
      const primaryLocation = company.locations?.[0];
      if (primaryLocation) {
        setCountry(primaryLocation.country || "");
        setCity(primaryLocation.city || "");
      }
    }
  }, [company]);

  // Fetch settings on mount
  useEffect(() => {
    if (token) {
      fetchSettings(token);
    }
  }, [token, fetchSettings]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    const result = await saveSettings(token, {
      reportingYear,
      currency,
      region: getRegionFromCompany(company) || "",  // add this line
      distanceUnit,
      fuelUnit,
      electricityUnit,
      heatUnit,
      factorSource,
    });
    setLoading(false);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(result.error || "Failed to save settings");
    }
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all settings to default?")) {
      resetSettings();
    }
  };

  const getCountryDisplay = (code) => {
    const countries = {
      'uae': 'UAE',
      'qatar': 'Qatar',
      'saudi-arabia': 'Saudi Arabia',
      'singapore': 'Singapore',
    };
    return countries[code] || code || '—';
  };

  const getIndustryDisplay = (value) => {
    const industries = {
      'manufacturing': 'Manufacturing',
      'it': 'IT / Software',
      'healthcare': 'Healthcare',
      'education': 'Education',
      'retail': 'Retail',
      'logistics': 'Logistics',
      'hospitality': 'Hospitality',
      'agriculture': 'Agriculture',
      'energy': 'Energy',
      'construction': 'Construction',
      'telecom': 'Telecommunications',
      'creative': 'Creative / Design',
      'finance': 'Financial Services',
      'other': 'Other',
    };
    return industries[value] || value || '—';
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your company profile and reporting configuration</p>
        </div>
        <div className="header-actions">
          {saved && (
            <span className="save-success">
              <FiCheckCircle /> Settings saved
            </span>
          )}
          {error && (
            <span className="save-error">
              <FiAlertCircle /> {error}
            </span>
          )}
          <PrimaryButton onClick={handleSave} disabled={loading} className="save-btn">
            {loading ? <FiRefreshCw className="spin" /> : <FiSave />}
            {loading ? "Saving..." : "Save Settings"}
          </PrimaryButton>
        </div>
      </div>

      <div className="settings-grid">
        {/* Company Profile Card */}
        <Card className="settings-card">
          <div className="card-header">
            <div className="header-icon"><BiBuilding /></div>
            <div>
              <h2>Company Profile</h2>
              <p>Basic information about your organization</p>
            </div>
          </div>

          <div className="settings-form">
            <div className="info-row">
              <span className="info-label">Company Name</span>
              <span className="info-value">{companyName || "—"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Industry</span>
              <span className="info-value">{getIndustryDisplay(industry)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Region</span>
              <span className="info-value">
              {getRegionDisplay(
                company?.basicInfo?.region ||
                getRegionFromCompany(company)
              )}
            </span>            </div>
          </div>
        </Card>

        {/* Primary Location Card */}
        <Card className="settings-card">
          <div className="card-header">
            <div className="header-icon"><FiMapPin /></div>
            <div>
              <h2>Primary Location</h2>
              <p>Determines which emission factors are applied to your calculations</p>
            </div>
          </div>

          <div className="settings-form">
            <div className="info-row">
              <span className="info-label">Country</span>
              <span className="info-value">{getCountryDisplay(country)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">City</span>
              <span className="info-value">{city || "—"}</span>
            </div>
          </div>
        </Card>

        {/* Reporting Configuration Card */}
        <Card className="settings-card full-width">
          <div className="card-header">
            <div className="header-icon"><FiCalendar /></div>
            <div>
              <h2>Reporting Configuration</h2>
              <p>Units and preferences for emission calculations</p>
            </div>
          </div>

          <div className="settings-form two-columns">
            <div className="form-group">
              <label><FiCalendar className="label-icon" />Reporting Year</label>
              <SelectDropdown
                value={reportingYear}
                onChange={(e) => updateSetting("reportingYear", Number(e.target.value))}
                options={[
                  { label: "2024", value: "2024" },
                  { label: "2025", value: "2025" },
                  { label: "2026", value: "2026" },
                ]}
              />
            </div>

            <div className="form-group">
              <label><FiDollarSign className="label-icon" />Currency</label>
              <SelectDropdown
                value={currency}
                onChange={(e) => updateSetting("currency", e.target.value)}
                options={[
                  { label: "USD ($)", value: "USD" },
                  { label: "EUR (€)", value: "EUR" },
                  { label: "GBP (£)", value: "GBP" },
                  { label: "AED (د.إ)", value: "AED" },
                  { label: "PKR (₨)", value: "PKR" },
                ]}
              />
            </div>

            <div className="form-group">
              <label><BiWorld className="label-icon" />Factor Source</label>
              <SelectDropdown
                value={factorSource}
                onChange={(e) => updateSetting("factorSource", e.target.value)}
                options={[
                  { label: "Regional Default", value: "Regional Default" },
                  { label: "UAE MoCCaE", value: "UAE MoCCaE" },
                  { label: "DEFRA (UK)", value: "DEFRA" },
                  { label: "EPA (US)", value: "EPA" },
                  { label: "EEA (Europe)", value: "EEA" },
                  { label: "Custom", value: "Custom" },
                ]}
              />
            </div>

            <div className="form-group">
              <label><FiMapPin className="label-icon" />Distance Unit</label>
              <SelectDropdown
                value={distanceUnit}
                onChange={(e) => updateSetting("distanceUnit", e.target.value)}
                options={[
                  { label: "Kilometres (km)", value: "km" },
                  { label: "Miles", value: "miles" },
                ]}
              />
            </div>

            <div className="form-group">
              <label><BiGasPump className="label-icon" />Fuel Unit</label>
              <SelectDropdown
                value={fuelUnit}
                onChange={(e) => updateSetting("fuelUnit", e.target.value)}
                options={[
                  { label: "Litres (L)", value: "litres" },
                  { label: "Gallons (gal)", value: "gallons" },
                ]}
              />
            </div>

            <div className="form-group">
              <label><FiZap className="label-icon" />Electricity Unit</label>
              <SelectDropdown
                value={electricityUnit}
                onChange={(e) => updateSetting("electricityUnit", e.target.value)}
                options={[
                  { label: "kWh", value: "kWh" },
                  { label: "MWh", value: "MWh" },
                ]}
              />
            </div>

            <div className="form-group">
              <label><FiThermometer className="label-icon" />Heat Unit</label>
              <SelectDropdown
                value={heatUnit}
                onChange={(e) => updateSetting("heatUnit", e.target.value)}
                options={[
                  { label: "kWh", value: "kWh" },
                  { label: "MJ", value: "MJ" },
                  { label: "GJ", value: "GJ" },
                ]}
              />
            </div>
          </div>

          <div className="factor-info">
            <FiAlertCircle className="info-icon" />
            <p>
              <strong>Emission Factor Sources:</strong> UAE: MoCCaE 2023, DEWA 2023 · 
              Singapore: NEA/SEFR 2024, EMA 2024 · 
              Saudi Arabia: IEA 2023, DEFRA 2024 · 
              All regions: IPCC AR5 GWP100 for refrigerants
            </p>
          </div>
        </Card>

        {/* Data Management Card */}
        <Card className="settings-card full-width">
          <div className="card-header">
            <div className="header-icon"><FiRefreshCw /></div>
            <div>
              <h2>Data Management</h2>
              <p>Reset preferences or export your data</p>
            </div>
          </div>

          <div className="settings-form horizontal-buttons">
            <button onClick={handleReset} className="reset-btn">
              <FiRefreshCw /> Reset to Default
            </button>
            <button className="export-btn">
              Export Data
            </button>
            <button
              className="delete-btn"
              onClick={() => {
                if (window.confirm("This will permanently delete all your emission data. Are you sure?")) {
                  alert("Delete functionality coming soon.");
                }
              }}
            >
              <FiTrash2 /> Delete All Data
            </button>
          </div>
        </Card>
      </div>

      <style jsx>{`
        .settings-container {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .settings-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #1B4D3E;
          margin: 0 0 4px;
        }

        .settings-header p {
          color: #4A5568;
          margin: 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .save-success {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #10B981;
          font-size: 14px;
          font-weight: 500;
        }

        .save-error {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #DC2626;
          font-size: 14px;
          font-weight: 500;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        .save-btn {
          display: flex !important;
          align-items: center;
          gap: 8px !important;
          padding: 10px 24px !important;
          background: #2E7D64 !important;
        }

        .save-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .settings-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #E5E7EB;
          transition: all 0.2s ease;
        }

        .settings-card:hover {
          border-color: #2E7D64;
        }

        .full-width {
          grid-column: span 2;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #E5E7EB;
        }

        .header-icon {
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
          flex-shrink: 0;
        }

        .card-header h2 {
          font-size: 18px;
          font-weight: 600;
          color: #1B4D3E;
          margin: 0 0 4px;
        }

        .card-header p {
          font-size: 13px;
          color: #6B7280;
          margin: 0;
        }

        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .two-columns {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .horizontal-buttons {
          display: flex;
          flex-direction: row;
          gap: 12px;
          align-items: center;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #F3F4F6;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          font-size: 14px;
          font-weight: 500;
          color: #6B7280;
        }

        .info-value {
          font-size: 14px;
          font-weight: 600;
          color: #1B4D3E;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #4A5568;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .label-icon {
          color: #2E7D64;
          font-size: 14px;
        }

        .factor-info {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: #F8FAF8;
          padding: 16px;
          border-radius: 8px;
          margin-top: 20px;
          border: 1px solid #E5E7EB;
        }

        .info-icon {
          color: #2E7D64;
          font-size: 18px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .factor-info p {
          margin: 0;
          font-size: 13px;
          color: #4A5568;
          line-height: 1.5;
        }

        .reset-btn, .export-btn, .delete-btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .reset-btn {
          background: #F8FAF8;
          border: 1px solid #E5E7EB;
          color: #374151;
        }

        .reset-btn:hover {
          border-color: #2E7D64;
          background: white;
        }

        .export-btn {
          background: white;
          border: 1px solid #2E7D64;
          color: #2E7D64;
        }

        .export-btn:hover {
          background: #F8FAF8;
        }

        .delete-btn {
          background: white;
          border: 1px solid #FEE2E2;
          color: #DC2626;
        }

        .delete-btn:hover {
          background: #FEF2F2;
          border-color: #DC2626;
        }

        @media (max-width: 768px) {
          .settings-container { padding: 16px; }
          .settings-grid { grid-template-columns: 1fr; }
          .full-width { grid-column: span 1; }
          .two-columns { grid-template-columns: 1fr; }
          .horizontal-buttons { flex-direction: column; }
          .reset-btn, .export-btn, .delete-btn { width: 100%; justify-content: center; }
          .settings-header { flex-direction: column; align-items: flex-start; }
          .header-actions { width: 100%; }
          .save-btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}