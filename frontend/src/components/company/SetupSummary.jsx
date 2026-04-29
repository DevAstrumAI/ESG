// src/components/company/SetupSummary.jsx
import { useState } from "react";
import { FiCheckCircle, FiMapPin, FiUsers, FiGlobe, FiBriefcase, FiEdit2, FiSave, FiX, FiPlus, FiTrash2 } from "react-icons/fi";
import { BiBuilding } from "react-icons/bi";
import InputField from "../ui/InputField";
import SelectDropdown from "../ui/SelectDropdown";
import ThemedSelect from "../ui/ThemedSelect";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";
import ConfirmationDialog from "../ui/ConfirmationDialog";
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
import {
  countriesByRegion,
  citiesByCountry,
  filterLocationsForRegion,
  getValidCountryValuesForRegion,
} from "../../utils/companyLocations";

export default function SetupSummary({
  data,
  updateField,
  mergeCompanyData,
  onRegionResetLocations,
  validationFocus,
  validationMessage,
  onClearValidationFeedback,
}) {
  const [editingSection, setEditingSection] = useState(null);
  const [editBranchEmployees, setEditBranchEmployees] = useState([]);
  const [editData, setEditData] = useState({
    name: data.name,
    description: data.description,
    logo: data.logo,
    region: data.region,
    industry: data.industry,
    employees: data.employees,
    revenue: data.revenue,
  });
  
  // Facilities editing state
  const [facilitiesEditData, setFacilitiesEditData] = useState({
    locations: [...(data.locations || [])]
  });
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState(data.region || "");
  const [cities, setCities] = useState([]);
  const [showRegionChangeConfirm, setShowRegionChangeConfirm] = useState(false);
  const [pendingRegion, setPendingRegion] = useState("");
  const [regionInlineError, setRegionInlineError] = useState("");
  const [locationsInlineError, setLocationsInlineError] = useState("");

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

  const applyCompanyPatch = (patch) => {
    if (mergeCompanyData) mergeCompanyData(patch);
    else {
      Object.entries(patch).forEach(([key, value]) => updateField(key, value));
    }
  };

  const toEditLocation = (loc, index) => ({
    ...loc,
    id:
      loc?.id ??
      `${String(loc?.country || "").toLowerCase()}::${String(loc?.city || loc?.name || "").toLowerCase()}::${index}`,
  });

  const handleEdit = (section) => {
    if (onClearValidationFeedback) onClearValidationFeedback();
    setRegionInlineError("");
    setLocationsInlineError("");
    setEditData({
      name: data.name,
      description: data.description,
      logo: data.logo,
      region: data.region,
      industry: data.industry,
      employees: data.employees,
      revenue: data.revenue,
    });
    
    if (section === 'facilities') {
      const locs = filterLocationsForRegion(data.region, data.locations || []);
      setFacilitiesEditData({
        locations: locs.map((loc, index) => toEditLocation(loc, index)),
      });
      setSelectedCountry("");
      setSelectedCity("");
      setSelectedRegion(data.region || "");
      setCities([]);
    }
    if (section === "employees") {
      const keyFor = (loc) =>
        `${String(loc?.region || "").trim().toLowerCase()}|${String(loc?.country || "").trim().toLowerCase()}|${String(loc?.city || "").trim().toLowerCase()}|${String(loc?.branch || "").trim().toLowerCase()}`;
      const existingRows = Array.isArray(data.branchEmployees) ? data.branchEmployees : [];
      const locationRows = (data.locations || []).map((loc) => {
        const match = existingRows.find((row) => keyFor(row) === keyFor(loc));
        return {
          region: loc.region || data.region || "",
          country: loc.country || "",
          city: loc.city || "",
          branch: loc.branch || "",
          employees: Number(match?.employees || 0),
        };
      });
      const mergedRows = locationRows.length > 0 ? locationRows : existingRows.map((row) => ({
        region: row.region || data.region || "",
        country: row.country || "",
        city: row.city || "",
        branch: row.branch || "",
        employees: Number(row.employees || 0),
      }));
      const legacyFallbackRows =
        mergedRows.length > 0
          ? mergedRows
          : [
              {
                region: data.region || "",
                country: data.country || "",
                city: data.city || "",
                branch: data.branch || "Main",
                employees: Number(data.employees || 0),
              },
            ];
      setEditBranchEmployees(legacyFallbackRows);
    }
    
    setEditingSection(section);
  };

  const handleSave = () => {
    if (editingSection === "employees") {
      const normalizedRows = (editBranchEmployees || []).map((row) => ({
        region: String(row.region || data.region || "").trim().toLowerCase(),
        country: String(row.country || "").trim().toLowerCase(),
        city: String(row.city || "").trim(),
        branch: String(row.branch || "").trim(),
        employees: Math.max(0, Number(row.employees || 0)),
      }));
      const totalEmployees = normalizedRows.reduce((sum, row) => sum + (Number(row.employees) || 0), 0);
      updateField("branchEmployees", normalizedRows);
      updateField("employees", totalEmployees);
      setEditingSection(null);
      return;
    }
    if (
      editingSection === "industry" &&
      editData.industry !== data.industry &&
      Array.isArray(data.locations) &&
      data.locations.length > 1
    ) {
      const ok = window.confirm(
        "Industry is company-wide and applies to all branches. Changing it will update all branches. Continue?"
      );
      if (!ok) return;
    }
    Object.keys(editData).forEach(key => {
      if (editData[key] !== data[key]) {
        updateField(key, editData[key]);
      }
    });
    setEditingSection(null);
  };

  const applyRegionChange = (newRegion) => {
    const regionChanged = newRegion !== data.region;
    const nextLocations = regionChanged
      ? []
      : filterLocationsForRegion(newRegion, data.locations || []);
    const validCountries = new Set(getValidCountryValuesForRegion(newRegion));
    const nextCountry = regionChanged
      ? ""
      : (data.country && validCountries.has(data.country) ? data.country : "");
    applyCompanyPatch({
      region: newRegion,
      locations: nextLocations,
      country: nextCountry,
    });
    if (regionChanged) {
      setFacilitiesEditData({ locations: [] });
      setSelectedCountry("");
      setSelectedCity("");
      setCities([]);
      if (onRegionResetLocations) onRegionResetLocations();
    }
    setEditingSection(null);
  };

  const handleRegionSave = () => {
    const newRegion = editData.region;
    if (!newRegion) {
      setRegionInlineError("Please select a region.");
      return;
    }
    setRegionInlineError("");
    if (newRegion !== data.region) {
      setPendingRegion(newRegion);
      setShowRegionChangeConfirm(true);
      return;
    }
    applyRegionChange(newRegion);
  };

  const handleFacilitiesSave = () => {
    setLocationsInlineError("");
    if (!data.region) {
      setLocationsInlineError("Please set a region first in the Region section.");
      return;
    }
    const validCountries = new Set(getValidCountryValuesForRegion(data.region));
    const normalizeCountry = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
    const cleaned = facilitiesEditData.locations
      .map((loc) => ({
        ...loc,
        region: String(loc?.region || data.region || "").trim().toLowerCase(),
        country: normalizeCountry(loc?.country),
      }))
      .filter((loc) => loc?.region && loc?.country && validCountries.has(loc.country) && (loc?.city || loc?.name) && loc?.branch);
    if (cleaned.length === 0) {
      setLocationsInlineError("Add at least one country-city-branch entry in your region.");
      return;
    }
    setLocationsInlineError("");
    applyCompanyPatch({
      country: cleaned[0].country,
      locations: cleaned,
    });
    setEditingSection(null);
  };

  const handleCancel = () => setEditingSection(null);

  const handleCountryChange = (country) => {
    setLocationsInlineError("");
    setSelectedCountry(country);
    setCities(citiesByCountry[country] || []);
    setSelectedCity("");
    setSelectedBranch("");
  };

  const handleAddLocationPair = () => {
    if (!selectedRegion || !selectedCountry || !selectedCity || !String(selectedBranch || "").trim()) {
      setLocationsInlineError("Please select region, country, city, and enter branch before adding.");
      return;
    }
    const cityExists = facilitiesEditData.locations.some(
      (loc) =>
        loc.region === selectedRegion &&
        loc.country === selectedCountry &&
        loc.city === selectedCity &&
        String(loc.branch || "").trim().toLowerCase() === String(selectedBranch || "").trim().toLowerCase()
    );
    if (cityExists) {
      setLocationsInlineError("This city-branch combination is already added.");
      return;
    }
    
    const newLocation = {
      id: Date.now(),
      region: selectedRegion,
      country: selectedCountry,
      city: selectedCity,
      branch: String(selectedBranch || "").trim(),
    };
    
    setFacilitiesEditData(prev => ({
      ...prev,
      locations: [...prev.locations, newLocation]
    }));
    setLocationsInlineError("");
    setSelectedCountry("");
    setSelectedCity("");
    setSelectedBranch("");
    setSelectedRegion(data.region || "");
    setCities([]);
  };

  const handleRemoveLocation = (id) => {
    setLocationsInlineError("");
    setFacilitiesEditData(prev => ({
      ...prev,
      locations: prev.locations.filter((loc) => String(loc.id) !== String(id))
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
    const regionName = String(loc.region || "").replace("-", " ");
    const base = countryName ? `${regionName} / ${loc.city}, ${countryName}` : `${regionName} / ${loc.city}`;
    return `${base} - ${loc.branch || "Main"}`;
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
              <button type="button" onClick={() => handleEdit('company')} className="edit-section-btn">
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
              <div className="summary-row" key="company-logo">
                <span className="row-label">Logo:</span>
                <span className="row-value">
                  {data.logo ? <img src={data.logo} alt="Company logo" className="company-logo-preview" /> : "—"}
                </span>
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
              <button type="button" onClick={() => handleEdit('region')} className="edit-section-btn">
                <FiEdit2 /> Edit
              </button>
            )}
          </div>

          {editingSection === 'region' ? (
            <div className="edit-mode" key="region-edit">
              <SelectDropdown
                label="Region"
                value={editData.region}
                onChange={(e) => {
                  setRegionInlineError("");
                  setEditData({...editData, region: e.target.value});
                }}
                options={regions}
              />
              {regionInlineError && <div className="inline-error">{regionInlineError}</div>}
              <div className="edit-actions">
                <PrimaryButton onClick={handleRegionSave} className="save-btn"><FiSave /> Save</PrimaryButton>
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
              <button type="button" onClick={() => handleEdit('industry')} className="edit-section-btn">
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
              <button type="button" onClick={() => handleEdit('employees')} className="edit-section-btn">
                <FiEdit2 /> Edit
              </button>
            )}
          </div>

          {editingSection === 'employees' ? (
            <div className="edit-mode" key="employees-edit">
              {editBranchEmployees.length > 0 ? (
                <>
                  <div className="field-label">Edit Branch-wise Employees</div>
                  <div className="locations-list">
                    {editBranchEmployees.map((row, idx) => (
                      <div key={`edit-branch-emp-${idx}`} className="location-item">
                        <FiMapPin className="location-icon" />
                        <span>
                          {`${row.city || "City"}, ${getCountryLabel(row.country || "")} - ${row.branch || "Main"}`}
                        </span>
                        <input
                          type="number"
                          className="field-input"
                          min="0"
                          value={row.employees}
                          onChange={(e) => {
                            const next = [...editBranchEmployees];
                            next[idx] = { ...next[idx], employees: e.target.value };
                            setEditBranchEmployees(next);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="summary-row">
                    <span className="row-label">Total Employees:</span>
                    <span className="row-value">
                      {editBranchEmployees.reduce((sum, row) => sum + (Number(row.employees) || 0), 0).toLocaleString()}
                    </span>
                  </div>
                </>
              ) : (
                <InputField
                  label="Number of Employees"
                  type="number"
                  value={editData.employees}
                  onChange={(e) => setEditData({...editData, employees: e.target.value})}
                  placeholder="e.g., 250"
                />
              )}
              <div className="edit-actions">
                <PrimaryButton onClick={handleSave} className="save-btn"><FiSave /> Save</PrimaryButton>
                <SecondaryButton onClick={handleCancel} className="cancel-btn"><FiX /> Cancel</SecondaryButton>
              </div>
            </div>
          ) : (
            <div className="summary-content">
              {Array.isArray(data.branchEmployees) && data.branchEmployees.length > 0 ? (
                <>
                  <div className="summary-row" key="employees-value">
                    <span className="row-label">Branch-wise Employees:</span>
                    <span className="row-value">Configured</span>
                  </div>
                  <div className="locations-list">
                    {(data.branchEmployees || []).map((row, idx) => (
                      <div key={`branch-emp-${idx}`} className="location-item">
                        <FiMapPin className="location-icon" />
                        <span>
                          {`${row.city || "City"}, ${getCountryLabel(row.country || "")} - ${row.branch || "Main"}`}
                        </span>
                        <span className="country-badge">{Number(row.employees || 0).toLocaleString()} employees</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
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
              )}
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
              <button type="button" onClick={() => handleEdit('revenue')} className="edit-section-btn">
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

        {/* Locations Card */}
        <div
          className={`summary-card facilities-card ${validationFocus === "cities" ? "validation-error" : ""}`}
          key="facilities-card"
        >
          <div className="card-header">
            <div className="card-title">
              <BiBuilding className="title-icon" />
              <h4>Locations ({data.locations?.length || 0})</h4>
            </div>
            {editingSection !== 'facilities' && (
              <button type="button" onClick={() => handleEdit('facilities')} className="edit-section-btn">
                <FiEdit2 /> Edit
              </button>
            )}
          </div>

          {editingSection === 'facilities' ? (
            <div className="edit-mode" key="facilities-edit">
              <div className="pair-grid">
                <div className="field-group">
                  <label className="field-label">Region</label>
                  <ThemedSelect
                    className="field-select"
                    value={selectedRegion}
                    onChange={(nextRegion) => {
                      setSelectedRegion(nextRegion);
                      setSelectedCountry("");
                      setSelectedCity("");
                      setSelectedBranch("");
                      setCities([]);
                    }}
                    options={[
                      { value: "middle-east", label: "Middle East" },
                      { value: "asia-pacific", label: "Asia Pacific" },
                    ]}
                    placeholder="Select Region"
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Country</label>
                  <ThemedSelect
                    className="field-select"
                    value={selectedCountry}
                    onChange={(nextCountry) => handleCountryChange(nextCountry)}
                    disabled={!selectedRegion}
                    options={countriesByRegion[selectedRegion] || []}
                    placeholder="Select Country"
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">City</label>
                  <ThemedSelect
                    className="field-select"
                    value={selectedCity}
                    onChange={(nextCity) => setSelectedCity(nextCity)}
                    disabled={!selectedCountry}
                    options={cities.map((city) => ({ value: city, label: city }))}
                    placeholder="Select City"
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Branch</label>
                  <input
                    className="field-input"
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    placeholder="Enter branch name"
                  />
                </div>
                <div className="field-group add-inline-group">
                  <label className="field-label"> </label>
                  <button
                    type="button"
                    onClick={handleAddLocationPair}
                    className="add-city-btn"
                    disabled={!selectedCountry || !selectedCity || !String(selectedBranch || "").trim()}
                  >
                    <FiPlus /> Add more 
                  </button>
                </div>
              </div>

              {facilitiesEditData.locations.length > 0 && (
                <div className="locations-list">
                  <label className="field-label">Added Country-City-Branch Entries</label>
                  {facilitiesEditData.locations.map((loc) => (
                    <div key={loc.id} className="location-item">
                      <FiMapPin className="location-icon" />
                      <span>{getLocationDisplay(loc)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLocation(loc.id)}
                        className="remove-location-btn"
                        title="Remove"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {facilitiesEditData.locations.length === 0 && (
                <div className="empty-locations">
                  <p>No entries added yet. Select country and city, add branch, then click Add more.</p>
                </div>
              )}

              {locationsInlineError && <div className="inline-error">{locationsInlineError}</div>}
              <div className="edit-actions">
                <PrimaryButton onClick={handleFacilitiesSave} className="save-btn">
                  <FiSave /> Save Entries
                </PrimaryButton>
                <SecondaryButton onClick={handleCancel} className="cancel-btn">
                  <FiX /> Cancel
                </SecondaryButton>
              </div>
            </div>
          ) : (
            <div className="facilities-list">
              {validationFocus === "cities" && validationMessage && (
                <div className="validation-note">
                  ⚠️ {validationMessage}
                </div>
              )}
              {!data.locations || data.locations.length === 0 ? (
                <p className="empty-facilities">No locations added</p>
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

      <ConfirmationDialog
        isOpen={showRegionChangeConfirm}
        onClose={() => {
          setShowRegionChangeConfirm(false);
          setPendingRegion("");
        }}
        onConfirm={() => {
          if (pendingRegion) applyRegionChange(pendingRegion);
          setShowRegionChangeConfirm(false);
          setPendingRegion("");
        }}
        title="Confirm Region Change"
        message="Changing region will clear the selected country and all added cities. You will need to re-select them before completing setup."
        confirmText="Yes, Change Region"
        cancelText="Keep Current Region"
        type="danger"
      />

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
        .summary-card.validation-error {
          border-color: #EF4444;
          background: #FFF7F7;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
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
        .company-logo-preview {
          max-width: 130px;
          max-height: 42px;
          object-fit: contain;
          border: 1px solid #E5E7EB;
          border-radius: 6px;
          background: #fff;
          padding: 4px;
        }
        .size-badge { font-size: 11px; padding: 2px 8px; background: #F8FAF8; color: #2E7D64; border-radius: 30px; font-weight: 500; border: 1px solid #E5E7EB; }

        .edit-mode {
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 16px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }
        .field-group { display: flex; flex-direction: column; gap: 8px; }
        .field-label {
          font-size: 12px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.35px;
          margin-bottom: 2px;
        }
        .field-select { width: 100%; }
        .pair-grid {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 12px;
        }
        .add-inline-group {
          justify-content: flex-end;
        }
        .add-inline-group .field-label {
          visibility: hidden;
        }
        .add-city-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 42px;
          padding: 0 16px;
          background: linear-gradient(135deg, #2E7D64 0%, #1F9D7A 100%);
          color: white;
          border: 1px solid #2E7D64;
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 6px 14px rgba(31, 157, 122, 0.2);
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }
        .add-city-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 9px 18px rgba(31, 157, 122, 0.28);
          filter: saturate(1.03);
        }
        .add-city-btn:disabled {
          background: #9CA3AF;
          border-color: #9CA3AF;
          box-shadow: none;
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

        .edit-actions {
          display: flex;
          gap: 10px;
          margin-top: 10px;
          padding-top: 12px;
          border-top: 1px solid #F3F4F6;
        }
        .save-btn,
        .cancel-btn {
          flex: 1;
          min-height: 40px;
          border-radius: 10px !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          transition: all 0.18s ease !important;
        }
        .save-btn {
          background: linear-gradient(135deg, #2E7D64 0%, #1F9D7A 100%) !important;
          color: #FFFFFF !important;
          border: 1px solid #2E7D64 !important;
          box-shadow: 0 6px 16px rgba(31, 157, 122, 0.22);
        }
        .save-btn:hover {
          border-color: #1F9D7A !important;
          box-shadow: 0 10px 20px rgba(31, 157, 122, 0.28);
          transform: translateY(-1px);
        }
        .cancel-btn {
          background: #FFFFFF !important;
          color: #4B5563 !important;
          border: 1px solid #D1D5DB !important;
          box-shadow: 0 3px 8px rgba(15, 23, 42, 0.06);
        }
        .cancel-btn:hover {
          color: #1F2937 !important;
          border-color: #9CA3AF !important;
          background: #F9FAFB !important;
          transform: translateY(-1px);
        }

        .facilities-list { display: flex; flex-direction: column; gap: 12px; }
        .validation-note {
          border: 1px solid #FECACA;
          background: #FEF2F2;
          color: #B91C1C;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 500;
        }
        .inline-error {
          border: 1px solid #FECACA;
          background: #FEF2F2;
          color: #B91C1C;
          border-radius: 8px;
          padding: 9px 11px;
          font-size: 13px;
          font-weight: 500;
        }
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
          .pair-grid { grid-template-columns: 1fr; }
          .add-inline-group .field-label { display: none; }
          .add-city-btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}