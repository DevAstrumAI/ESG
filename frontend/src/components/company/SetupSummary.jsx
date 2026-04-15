// src/components/company/SetupSummary.jsx
import { useState, useEffect } from "react";
import { FiCheckCircle, FiMapPin, FiUsers, FiGlobe, FiBriefcase, FiEdit2, FiSave, FiX, FiPlus, FiTrash2 } from "react-icons/fi";
import { BiBuilding } from "react-icons/bi";
import InputField from "../ui/InputField";
import SelectDropdown from "../ui/SelectDropdown";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";
import { 
  FiPackage, 
  FiMonitor, 
  FiHeart, 
  FiBookOpen, 
  FiShoppingBag, 
  FiTruck, 
  FiHome, 
  FiSun, 
  FiZap, 
  FiTool, 
  FiSmartphone, 
  FiPenTool, 
  FiDollarSign, 
  FiMoreHorizontal 
} from "react-icons/fi";

export default function SetupSummary({ data, updateField }) {
  const [editingSection, setEditingSection] = useState(null);
  const [editData, setEditData] = useState({
    name: data.name,
    description: data.description,
    region: data.region,
    industry: data.industry,
    employees: data.employees,
    revenue: data.revenue,
  });
  
  // Facilities editing state
  const [facilitiesEditData, setFacilitiesEditData] = useState({
    country: data.country || "",
    locations: [...(data.locations || [])]
  });
  const [selectedCity, setSelectedCity] = useState("");
  const [cities, setCities] = useState([]);

  const regions = [
    { label: " Middle East", value: "middle-east" },
    { label: " Asia Pacific", value: "asia-pacific" },
  ];

  const industries = [
    { label: "Manufacturing", value: "manufacturing", icon: <FiPackage size={16} /> },
    { label: "IT / Software", value: "it", icon: <FiMonitor size={16} /> },
    { label: "Healthcare", value: "healthcare", icon: <FiHeart size={16} /> },
    { label: "Education", value: "education", icon: <FiBookOpen size={16} /> },
    { label: "Retail", value: "retail", icon: <FiShoppingBag size={16} /> },
    { label: "Logistics", value: "logistics", icon: <FiTruck size={16} /> },
    { label: "Hospitality", value: "hospitality", icon: <FiHome size={16} /> },
    { label: "Agriculture", value: "agriculture", icon: <FiSun size={16} /> },
    { label: "Energy", value: "energy", icon: <FiZap size={16} /> },
    { label: "Construction", value: "construction", icon: <FiTool size={16} /> },
    { label: "Telecommunications", value: "telecom", icon: <FiSmartphone size={16} /> },
    { label: "Creative / Design", value: "creative", icon: <FiPenTool size={16} /> },
    { label: "Financial Services", value: "finance", icon: <FiDollarSign size={16} /> },
    { label: "Other", value: "other", icon: <FiMoreHorizontal size={16} /> },
  ];

  // Cities by country
  const citiesByCountry = {
    uae: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"],
    "saudi-arabia": ["Riyadh", "Jeddah", "Dammam", "Khobar", "Medina", "Mecca"],
    singapore: ["Singapore"],
  };

  const handleEdit = (section) => {
    setEditData({
      name: data.name,
      description: data.description,
      region: data.region,
      industry: data.industry,
      employees: data.employees,
      revenue: data.revenue,
    });
    
    if (section === 'facilities') {
      setFacilitiesEditData({
        country: data.country || "",
        locations: [...(data.locations || [])]
      });
      if (data.country) {
        setCities(citiesByCountry[data.country] || []);
      }
    }
    
    setEditingSection(section);
  };

  const handleSave = () => {
    Object.keys(editData).forEach(key => {
      if (editData[key] !== data[key]) {
        updateField(key, editData[key]);
      }
    });
    setEditingSection(null);
  };

  const handleFacilitiesSave = () => {
    updateField("country", facilitiesEditData.country);
    updateField("locations", facilitiesEditData.locations);
    setEditingSection(null);
  };

  const handleCancel = () => setEditingSection(null);

  const handleCountryChange = (country) => {
    setFacilitiesEditData(prev => ({ ...prev, country }));
    setCities(citiesByCountry[country] || []);
    setSelectedCity("");
  };

  const handleAddCity = () => {
    if (!selectedCity) return;
    const cityExists = facilitiesEditData.locations.some(loc => loc.city === selectedCity);
    if (cityExists) return;
    
    const newLocation = {
      id: Date.now(),
      country: facilitiesEditData.country,
      city: selectedCity,
    };
    
    setFacilitiesEditData(prev => ({
      ...prev,
      locations: [...prev.locations, newLocation]
    }));
    setSelectedCity("");
  };

  const handleRemoveCity = (id) => {
    setFacilitiesEditData(prev => ({
      ...prev,
      locations: prev.locations.filter(loc => loc.id !== id)
    }));
  };

  const getRegionLabel = (region) => regions.find(r => r.value === region)?.label || region;
  const getIndustryLabel = (industry) => industries.find(i => i.value === industry)?.label || industry;

  const getEmployeeSize = (count) => {
    if (!count) return "";
    if (count < 50) return "Small Business";
    if (count < 250) return "Medium Business";
    if (count < 1000) return "Large Business";
    return "Enterprise";
  };

  const formatRevenue = (value) => {
    if (!value) return "—";
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getCountryLabel = (country) => {
    const countries = {
      'uae': "UAE",
      'qatar': "Qatar",
      'saudi-arabia': "Saudi Arabia",
      'saudi': "Saudi Arabia",
      'singapore': "Singapore",
      'malaysia': "Malaysia",
      'indonesia': "Indonesia",
      'thailand': "Thailand",
      'germany': "Germany",
      'france': "France",
      'italy': "Italy",
      'spain': "Spain",
      'uk': "United Kingdom",
      'us': "United States",
      'india': "India",
      'china': "China",
    };
    return countries[country] || country;
  };

  const getLocationDisplay = (loc) => {
    const countryName = getCountryLabel(loc.country);
    return countryName ? `${loc.city}, ${countryName}` : loc.city;
  };

  return (
    <div className="summary-step">
      <div className="step-header">
        <span className="step-icon">📋</span>
        <h3>Review & Confirm</h3>
      </div>

      <p className="step-description">
        Please review your company information. Click the edit icon on any section to make changes.
      </p>

      <div className="summary-grid">
        {/* Company Info Card */}
        <div className="summary-card" key="company-card">
          <div className="card-header">
            <div className="card-title">
              <FiCheckCircle className="title-icon" />
              <h4>Company Information</h4>
            </div>
            {editingSection !== 'company' && (
              <button onClick={() => handleEdit('company')} className="edit-section-btn">
                <FiEdit2 /> Edit
              </button>
            )}
          </div>

          {editingSection === 'company' ? (
            <div className="edit-mode" key="company-edit">
              <InputField
                label="Company Name"
                value={editData.name}
                onChange={(e) => setEditData({...editData, name: e.target.value})}
                placeholder="Company name"
              />
              <InputField
                label="Description"
                value={editData.description}
                onChange={(e) => setEditData({...editData, description: e.target.value})}
                placeholder="Brief description"
                multiline
                rows={2}
              />
              <div className="edit-actions">
                <PrimaryButton onClick={handleSave} className="save-btn"><FiSave /> Save</PrimaryButton>
                <SecondaryButton onClick={handleCancel} className="cancel-btn"><FiX /> Cancel</SecondaryButton>
              </div>
            </div>
          ) : (
            <div className="summary-content">
              <div className="summary-row" key="company-name">
                <span className="row-label">Company Name:</span>
                <span className="row-value">{data.name || "—"}</span>
              </div>
              <div className="summary-row" key="company-desc">
                <span className="row-label">Description:</span>
                <span className="row-value">{data.description || "—"}</span>
              </div>
            </div>
          )}
        </div>

        {/* Region Card */}
        <div className="summary-card" key="region-card">
          <div className="card-header">
            <div className="card-title">
              <FiGlobe className="title-icon" />
              <h4>Region</h4>
            </div>
            {editingSection !== 'region' && (
              <button onClick={() => handleEdit('region')} className="edit-section-btn">
                <FiEdit2 /> Edit
              </button>
            )}
          </div>

          {editingSection === 'region' ? (
            <div className="edit-mode" key="region-edit">
              <SelectDropdown
                label="Region"
                value={editData.region}
                onChange={(e) => setEditData({...editData, region: e.target.value})}
                options={regions}
              />
              <div className="edit-actions">
                <PrimaryButton onClick={handleSave} className="save-btn"><FiSave /> Save</PrimaryButton>
                <SecondaryButton onClick={handleCancel} className="cancel-btn"><FiX /> Cancel</SecondaryButton>
              </div>
            </div>
          ) : (
            <div className="summary-content">
              <div className="summary-row" key="region-value">
                <span className="row-label">Region:</span>
                <span className="row-value">{getRegionLabel(data.region)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Industry Card */}
        <div className="summary-card" key="industry-card">
          <div className="card-header">
            <div className="card-title">
              <FiBriefcase className="title-icon" />
              <h4>Industry</h4>
            </div>
            {editingSection !== 'industry' && (
              <button onClick={() => handleEdit('industry')} className="edit-section-btn">
                <FiEdit2 /> Edit
              </button>
            )}
          </div>

          {editingSection === 'industry' ? (
            <div className="edit-mode" key="industry-edit">
              <SelectDropdown
                label="Industry"
                value={editData.industry}
                onChange={(e) => setEditData({...editData, industry: e.target.value})}
                options={industries}
              />
              <div className="edit-actions">
                <PrimaryButton onClick={handleSave} className="save-btn"><FiSave /> Save</PrimaryButton>
                <SecondaryButton onClick={handleCancel} className="cancel-btn"><FiX /> Cancel</SecondaryButton>
              </div>
            </div>
          ) : (
            <div className="summary-content">
              <div className="summary-row" key="industry-value">
                <span className="row-label">Industry:</span>
                <span className="row-value">{getIndustryLabel(data.industry)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Employees Card */}
        <div className="summary-card" key="employees-card">
          <div className="card-header">
            <div className="card-title">
              <FiUsers className="title-icon" />
              <h4>Employees</h4>
            </div>
            {editingSection !== 'employees' && (
              <button onClick={() => handleEdit('employees')} className="edit-section-btn">
                <FiEdit2 /> Edit
              </button>
            )}
          </div>

          {editingSection === 'employees' ? (
            <div className="edit-mode" key="employees-edit">
              <InputField
                label="Number of Employees"
                type="number"
                value={editData.employees}
                onChange={(e) => setEditData({...editData, employees: e.target.value})}
                placeholder="e.g., 250"
              />
              <div className="edit-actions">
                <PrimaryButton onClick={handleSave} className="save-btn"><FiSave /> Save</PrimaryButton>
                <SecondaryButton onClick={handleCancel} className="cancel-btn"><FiX /> Cancel</SecondaryButton>
              </div>
            </div>
          ) : (
            <div className="summary-content">
              <div className="summary-row" key="employees-value">
                <span className="row-label">Employees:</span>
                <div className="row-value">
                  {data.employees ? (
                    <>
                      {Number(data.employees).toLocaleString()}
                      <span className="size-badge">{getEmployeeSize(data.employees)}</span>
                    </>
                  ) : "—"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Revenue Card */}
        <div className="summary-card" key="revenue-card">
          <div className="card-header">
            <div className="card-title">
              <FiDollarSign className="title-icon" />
              <h4>Annual Revenue</h4>
            </div>
            {editingSection !== 'revenue' && (
              <button onClick={() => handleEdit('revenue')} className="edit-section-btn">
                <FiEdit2 /> Edit
              </button>
            )}
          </div>

          {editingSection === 'revenue' ? (
            <div className="edit-mode" key="revenue-edit">
              <InputField
                label="Annual Revenue (USD)"
                type="number"
                value={editData.revenue}
                onChange={(e) => setEditData({...editData, revenue: e.target.value})}
                placeholder="e.g., 5000000"
              />
              <div className="edit-actions">
                <PrimaryButton onClick={handleSave} className="save-btn"><FiSave /> Save</PrimaryButton>
                <SecondaryButton onClick={handleCancel} className="cancel-btn"><FiX /> Cancel</SecondaryButton>
              </div>
            </div>
          ) : (
            <div className="summary-content">
              <div className="summary-row" key="revenue-value">
                <span className="row-label">Annual Revenue:</span>
                <span className="row-value">{formatRevenue(data.revenue)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Facilities Card */}
        <div className="summary-card facilities-card" key="facilities-card">
          <div className="card-header">
            <div className="card-title">
              <BiBuilding className="title-icon" />
              <h4>Facilities ({data.locations?.length || 0})</h4>
            </div>
            {editingSection !== 'facilities' && (
              <button onClick={() => handleEdit('facilities')} className="edit-section-btn">
                <FiEdit2 /> Edit
              </button>
            )}
          </div>

          {editingSection === 'facilities' ? (
            <div className="edit-mode" key="facilities-edit">
              <div className="field-group">
                <label className="field-label">Country</label>
                <select
                  className="field-select"
                  value={facilitiesEditData.country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                >
                  <option value="">Select Country</option>
                  {Object.keys(citiesByCountry).map(country => (
                    <option key={country} value={country}>{getCountryLabel(country)}</option>
                  ))}
                </select>
              </div>

              {facilitiesEditData.country && (
                <div className="add-city-section">
                  <div className="field-group">
                    <label className="field-label">Add City</label>
                    <div className="city-input-group">
                      <select
                        className="field-select"
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                      >
                        <option value="">Select City</option>
                        {cities.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                      <button onClick={handleAddCity} className="add-city-btn" disabled={!selectedCity}>
                        <FiPlus /> Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {facilitiesEditData.locations.length > 0 && (
                <div className="locations-list">
                  <label className="field-label">Added Locations</label>
                  {facilitiesEditData.locations.map((loc) => (
                    <div key={loc.id} className="location-item">
                      <FiMapPin className="location-icon" />
                      <span>{getLocationDisplay(loc)}</span>
                      <button
                        onClick={() => handleRemoveCity(loc.id)}
                        className="remove-location-btn"
                        title="Remove"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {facilitiesEditData.locations.length === 0 && facilitiesEditData.country && (
                <div className="empty-locations">
                  <p>No cities added yet. Select a city above to add.</p>
                </div>
              )}

              {!facilitiesEditData.country && (
                <div className="empty-locations">
                  <p>Please select a country first.</p>
                </div>
              )}

              <div className="edit-actions">
                <PrimaryButton onClick={handleFacilitiesSave} className="save-btn">
                  <FiSave /> Save Facilities
                </PrimaryButton>
                <SecondaryButton onClick={handleCancel} className="cancel-btn">
                  <FiX /> Cancel
                </SecondaryButton>
              </div>
            </div>
          ) : (
            <div className="facilities-list">
              {!data.locations || data.locations.length === 0 ? (
                <p className="empty-facilities">No facilities added</p>
              ) : (
                data.locations.map((loc) => (
                  <div key={loc.id} className="facility-item">
                    <FiMapPin className="location-icon" />
                    <span>{getLocationDisplay(loc)}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="confirmation-note">
        <FiCheckCircle className="note-icon" />
        <p>All information is correct. Click "Complete Setup" to finish.</p>
      </div>

      <style jsx>{`
        .summary-step {
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

        .step-icon { font-size: 32px; }
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

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }

        .summary-card {
          background: #F9FAFB;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #E5E7EB;
          transition: all 0.2s ease;
        }

        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border-color: #2E7D64;
        }

        .facilities-card {
          grid-column: span 2;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #E5E7EB;
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .title-icon { font-size: 20px; color: #2E7D64; }
        .card-title h4 { margin: 0; font-size: 16px; font-weight: 600; color: #1B4D3E; }

        .edit-section-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 30px;
          color: #2E7D64;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .edit-section-btn:hover {
          background: #2E7D64;
          color: white;
          border-color: #2E7D64;
        }

        .summary-content { display: flex; flex-direction: column; gap: 12px; }
        .summary-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
        .row-label { font-size: 14px; color: #6B7280; font-weight: 500; }
        .row-value { font-size: 14px; font-weight: 600; color: #1B4D3E; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .size-badge { font-size: 11px; padding: 2px 8px; background: #F8FAF8; color: #2E7D64; border-radius: 30px; font-weight: 500; border: 1px solid #E5E7EB; }

        .edit-mode { display: flex; flex-direction: column; gap: 16px; }
        .field-group { display: flex; flex-direction: column; gap: 8px; }
        .field-label { font-size: 13px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.3px; }
        .field-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 14px;
          background: white;
        }
        .field-select:focus { outline: none; border-color: #2E7D64; }

        .add-city-section { margin-top: 8px; }
        .city-input-group {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .city-input-group .field-select { flex: 1; }
        .add-city-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: #2E7D64;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        }
        .add-city-btn:disabled {
          background: #9CA3AF;
          cursor: not-allowed;
        }

        .locations-list { margin-top: 8px; }
        .location-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: white;
          border-radius: 8px;
          border: 1px solid #E5E7EB;
          margin-bottom: 8px;
        }
        .location-icon { color: #2E7D64; font-size: 16px; }
        .location-item span { flex: 1; font-size: 14px; color: #374151; }
        .remove-location-btn {
          background: none;
          border: none;
          color: #DC2626;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
        }
        .remove-location-btn:hover { background: #FEE2E2; border-radius: 4px; }

        .empty-locations {
          text-align: center;
          padding: 20px;
          color: #9CA3AF;
          font-size: 13px;
          background: #F8FAF8;
          border-radius: 8px;
        }

        .edit-actions { display: flex; gap: 12px; margin-top: 8px; }
        .save-btn, .cancel-btn { flex: 1; padding: 10px !important; font-size: 14px !important; }

        .facilities-list { display: flex; flex-direction: column; gap: 12px; }
        .facility-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: white;
          border-radius: 8px;
          border: 1px solid #E5E7EB;
        }
        .location-icon { color: #2E7D64; font-size: 16px; flex-shrink: 0; }
        .facility-item span { font-size: 14px; color: #374151; }
        .empty-facilities { color: #9CA3AF; font-style: italic; text-align: center; padding: 20px; }

        .confirmation-note {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 24px;
          background: #F8FAF8;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
        }
        .note-icon { color: #2E7D64; font-size: 24px; flex-shrink: 0; }
        .confirmation-note p { margin: 0; color: #1B4D3E; font-size: 14px; font-weight: 500; }

        @media (max-width: 768px) {
          .summary-grid { grid-template-columns: 1fr; }
          .facilities-card { grid-column: span 1; }
          .summary-row { flex-direction: column; align-items: flex-start; gap: 4px; }
          .row-value { justify-content: flex-start; }
          .card-header { flex-direction: column; align-items: flex-start; gap: 8px; }
          .edit-section-btn { align-self: flex-start; }
          .city-input-group { flex-direction: column; }
          .add-city-btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}