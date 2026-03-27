// src/components/company/SetupSummary.jsx
import { useState } from "react";
import { FiCheckCircle, FiMapPin, FiUsers, FiDollarSign, FiGlobe, FiBriefcase, FiEdit2, FiSave, FiX } from "react-icons/fi";
import { BiBuilding } from "react-icons/bi";
import InputField from "../ui/InputField";
import SelectDropdown from "../ui/SelectDropdown";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";

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

  const regions = [
    { label: "🌍 Middle East", value: "middle-east" },
    { label: "🌏 Asia Pacific", value: "asia-pacific" },
    { label: "🇪🇺 Europe (EU)", value: "eu" },
    { label: "🇬🇧 United Kingdom", value: "uk" },
    { label: "🇺🇸 United States", value: "us" },
    { label: "🇮🇳 India", value: "in" },
    { label: "🇨🇳 China", value: "cn" },
    { label: "🌍 Other", value: "other" },
  ];

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

  const handleEdit = (section) => {
    setEditData({
      name: data.name,
      description: data.description,
      region: data.region,
      industry: data.industry,
      employees: data.employees,
      revenue: data.revenue,
    });
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

  const handleCancel = () => setEditingSection(null);

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
        <div className="summary-card">
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
            <div className="edit-mode">
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
              <div className="summary-row">
                <span className="row-label">Company Name:</span>
                <span className="row-value">{data.name || "—"}</span>
              </div>
              <div className="summary-row">
                <span className="row-label">Description:</span>
                <span className="row-value">{data.description || "—"}</span>
              </div>
            </div>
          )}
        </div>

        {/* Region Card */}
        <div className="summary-card">
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
            <div className="edit-mode">
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
              <div className="summary-row">
                <span className="row-label">Region:</span>
                <span className="row-value">{getRegionLabel(data.region)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Industry Card */}
        <div className="summary-card">
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
            <div className="edit-mode">
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
              <div className="summary-row">
                <span className="row-label">Industry:</span>
                <span className="row-value">{getIndustryLabel(data.industry)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Employees Card */}
        <div className="summary-card">
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
            <div className="edit-mode">
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
              <div className="summary-row">
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
        <div className="summary-card">
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
            <div className="edit-mode">
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
              <div className="summary-row">
                <span className="row-label">Annual Revenue:</span>
                <span className="row-value">{formatRevenue(data.revenue)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Facilities Card */}
        <div className="summary-card facilities-card">
          <div className="card-header">
            <div className="card-title">
              <BiBuilding className="title-icon" />
              <h4>Facilities ({data.locations.length})</h4>
            </div>
            {editingSection !== 'facilities' && (
              <button onClick={() => handleEdit('facilities')} className="edit-section-btn">
                <FiEdit2 /> Edit
              </button>
            )}
          </div>

          {editingSection === 'facilities' ? (
            <div className="edit-mode">
              <p className="edit-note">To edit facilities, please go back to Step 6</p>
              <div className="edit-actions">
                <SecondaryButton onClick={handleCancel} className="cancel-btn"><FiX /> Cancel</SecondaryButton>
              </div>
            </div>
          ) : (
            <div className="facilities-list">
              {data.locations.length === 0 ? (
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

        .facilities-card { grid-column: span 2; }

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
        .edit-note { color: #6B7280; font-size: 14px; font-style: italic; padding: 8px 0; }
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
        }
      `}</style>
    </div>
  );
}