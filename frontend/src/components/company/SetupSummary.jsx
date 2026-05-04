// src/components/company/SetupSummary.jsx
import { useMemo, useState } from "react";
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
import { companyAPI } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

function normCountry(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

/** Match branch row to a location ignoring stored row.region (legacy / transition). */
function rowMatchesLocation(row, loc) {
  return (
    normCountry(row?.country) === normCountry(loc?.country) &&
    String(row?.city || "")
      .trim()
      .toLowerCase() === String(loc?.city || loc?.name || "")
      .trim()
      .toLowerCase() &&
    String(row?.branch || "").trim().toLowerCase() === String(loc?.branch || "").trim().toLowerCase()
  );
}

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
  const [editBranchRevenue, setEditBranchRevenue] = useState([]);
  const [editData, setEditData] = useState({
    name: data.name,
    description: data.description,
    logo: data.logo,
    region: data.region,
    industry: data.industry,
    employees: data.employees,
    revenue: data.revenue,
    revenueCurrency: data.revenueCurrency || "USD",
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
  const [regionMode, setRegionMode] = useState(data.region === "multi-region" ? "multi" : "single");
  const [singleRegionChoice, setSingleRegionChoice] = useState(
    data.region === "multi-region" ? "middle-east" : (data.region || "middle-east")
  );
  const [regionInlineError, setRegionInlineError] = useState("");
  const [locationsInlineError, setLocationsInlineError] = useState("");
  const [regionTransitionError, setRegionTransitionError] = useState("");
  const [exportingTransitionCsv, setExportingTransitionCsv] = useState(false);
  const token = useAuthStore((s) => s.token);

  const activeLocations = useMemo(
    () => filterLocationsForRegion(data.region, data.locations || []),
    [data.region, data.locations]
  );

  const isMultiRegionCompany = data.region === "multi-region";

  const visibleBranchEmployees = useMemo(() => {
    const rows = data.branchEmployees || [];
    if (!rows.length || !activeLocations.length) return [];
    return rows.filter((row) => activeLocations.some((loc) => rowMatchesLocation(row, loc)));
  }, [data.branchEmployees, activeLocations]);

  const visibleBranchRevenue = useMemo(() => {
    const rows = data.branchRevenue || [];
    if (!rows.length || !activeLocations.length) return [];
    return rows.filter((row) => activeLocations.some((loc) => rowMatchesLocation(row, loc)));
  }, [data.branchRevenue, activeLocations]);

  const regions = [
    { label: " Multi Region", value: "multi-region" },
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
    setRegionTransitionError("");
    setEditData({
      name: data.name,
      description: data.description,
      logo: data.logo,
      region: data.region,
      industry: data.industry,
      employees: data.employees,
      revenue: data.revenue,
      revenueCurrency: data.revenueCurrency || "USD",
    });
    
    if (section === 'facilities') {
      const locs = filterLocationsForRegion(data.region, data.locations || []);
      setFacilitiesEditData({
        locations: locs.map((loc, index) => toEditLocation(loc, index)),
      });
      setSelectedCountry("");
      setSelectedCity("");
      setSelectedRegion(
        data.region === "multi-region" ? "middle-east" : data.region || ""
      );
      setCities([]);
    }
    if (section === "region") {
      const currentRegion = data.region || "middle-east";
      setRegionMode(currentRegion === "multi-region" ? "multi" : "single");
      setSingleRegionChoice(currentRegion === "multi-region" ? "middle-east" : currentRegion);
    }
    if (section === "employees") {
      const keyFor = (loc) =>
        `${String(loc?.region || "").trim().toLowerCase()}|${String(loc?.country || "").trim().toLowerCase()}|${String(loc?.city || "").trim().toLowerCase()}|${String(loc?.branch || "").trim().toLowerCase()}`;
      const existingRows = Array.isArray(data.branchEmployees) ? data.branchEmployees : [];
      const locsForEdit = filterLocationsForRegion(data.region, data.locations || []);
      const locationRows = locsForEdit.map((loc) => {
        const match =
          existingRows.find((row) => keyFor(row) === keyFor(loc)) ||
          existingRows.find((row) => rowMatchesLocation(row, loc));
        return {
          region: loc.region || data.region || "",
          country: loc.country || "",
          city: loc.city || "",
          branch: loc.branch || "",
          employees: Number(match?.employees || 0),
        };
      });
      const mergedRows =
        locationRows.length > 0
          ? locationRows
          : existingRows
              .filter((row) => locsForEdit.some((loc) => rowMatchesLocation(row, loc)))
              .map((row) => ({
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
    if (section === "revenue") {
      const keyFor = (loc) =>
        `${String(loc?.region || "").trim().toLowerCase()}|${String(loc?.country || "").trim().toLowerCase()}|${String(loc?.city || "").trim().toLowerCase()}|${String(loc?.branch || "").trim().toLowerCase()}`;
      const existingRev = Array.isArray(data.branchRevenue) ? data.branchRevenue : [];
      const locsForEdit = filterLocationsForRegion(data.region, data.locations || []);
      const locationRows = locsForEdit.map((loc) => {
        const match =
          existingRev.find((row) => keyFor(row) === keyFor(loc)) ||
          existingRev.find((row) => rowMatchesLocation(row, loc));
        return {
          region: loc.region || data.region || "",
          country: loc.country || "",
          city: loc.city || "",
          branch: loc.branch || "",
          revenue: Number(match?.revenue ?? match?.amount ?? 0),
        };
      });
      const mergedRows =
        locationRows.length > 0
          ? locationRows
          : existingRev
              .filter((row) => locsForEdit.some((loc) => rowMatchesLocation(row, loc)))
              .map((row) => ({
                region: row.region || data.region || "",
                country: row.country || "",
                city: row.city || "",
                branch: row.branch || "",
                revenue: Number(row.revenue ?? row.amount ?? 0),
              }));
      const legacyFallbackRev =
        mergedRows.length > 0
          ? mergedRows
          : [
              {
                region: data.region || "",
                country: data.country || "",
                city: data.city || "",
                branch: data.branch || "Main",
                revenue: Number(data.revenue || 0),
              },
            ];
      setEditBranchRevenue(legacyFallbackRev);
    }

    setEditingSection(section);
  };

  const handleSave = () => {
    if (editingSection === "employees") {
      const locsForSave = filterLocationsForRegion(data.region, data.locations || []);
      const keyOf = (r) =>
        `${String(r.region || "").trim().toLowerCase()}|${String(r.country || "").trim().toLowerCase()}|${String(r.city || "").trim().toLowerCase()}|${String(r.branch || "").trim().toLowerCase()}`;
      const locKeys = new Set(
        locsForSave.map((loc) =>
          keyOf({
            region: loc.region || data.region,
            country: loc.country,
            city: loc.city,
            branch: loc.branch,
          })
        )
      );
      const normalizedRows = (editBranchEmployees || [])
        .map((row) => ({
          region: String(row.region || data.region || "").trim().toLowerCase(),
          country: String(row.country || "").trim().toLowerCase(),
          city: String(row.city || "").trim(),
          branch: String(row.branch || "").trim(),
          employees: Math.max(0, Number(row.employees || 0)),
        }))
        .filter((row) => locKeys.has(keyOf(row)));
      const totalEmployees = normalizedRows.reduce((sum, row) => sum + (Number(row.employees) || 0), 0);
      updateField("branchEmployees", normalizedRows);
      updateField("employees", totalEmployees);
      setEditingSection(null);
      return;
    }
    if (editingSection === "revenue") {
      const locsForSave = filterLocationsForRegion(data.region, data.locations || []);
      const keyOf = (r) =>
        `${String(r.region || "").trim().toLowerCase()}|${String(r.country || "").trim().toLowerCase()}|${String(r.city || "").trim().toLowerCase()}|${String(r.branch || "").trim().toLowerCase()}`;
      const locKeys = new Set(
        locsForSave.map((loc) =>
          keyOf({
            region: loc.region || data.region,
            country: loc.country,
            city: loc.city,
            branch: loc.branch,
          })
        )
      );
      const normalizedRows = (editBranchRevenue || [])
        .map((row) => ({
          region: String(row.region || data.region || "").trim().toLowerCase(),
          country: String(row.country || "").trim().toLowerCase(),
          city: String(row.city || "").trim(),
          branch: String(row.branch || "").trim(),
          revenue: Math.max(0, Number(row.revenue ?? row.amount ?? 0)),
        }))
        .filter((row) => locKeys.has(keyOf(row)));
      const totalRevenue = normalizedRows.reduce((sum, row) => sum + (Number(row.revenue) || 0), 0);
      updateField("branchRevenue", normalizedRows);
      updateField("revenue", totalRevenue > 0 ? String(totalRevenue) : "");
      updateField("revenueCurrency", editData.revenueCurrency || "USD");
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
    const previousRegion = data.region || "";
    const regionChanged = newRegion !== previousRegion;
    const fromMultiToSingle = previousRegion === "multi-region" && newRegion !== "multi-region";
    const fromSingleToMulti = previousRegion !== "multi-region" && newRegion === "multi-region";
    const singleToDifferentSingle =
      previousRegion !== "multi-region" && newRegion !== "multi-region" && previousRegion !== newRegion;
    let nextLocations = filterLocationsForRegion(newRegion, data.locations || []);
    if (fromSingleToMulti) {
      // Keep existing single-region rows while enabling multi-region mode.
      nextLocations = (data.locations || []).map((loc) => ({
        ...loc,
        region: loc.region || previousRegion,
      }));
    }
    if (fromMultiToSingle || singleToDifferentSingle) {
      nextLocations = filterLocationsForRegion(newRegion, data.locations || []);
    }
    const validCountries = new Set(getValidCountryValuesForRegion(newRegion));
    const nextCountry =
      data.country && validCountries.has(data.country) ? data.country : (nextLocations[0]?.country || "");
    applyCompanyPatch({
      region: newRegion,
      locations: nextLocations,
      country: nextCountry,
    });
    if (fromMultiToSingle || singleToDifferentSingle) {
      setFacilitiesEditData({ locations: nextLocations.map((loc, index) => toEditLocation(loc, index)) });
      setSelectedCountry("");
      setSelectedCity("");
      setCities([]);
      if (onRegionResetLocations) onRegionResetLocations();
    }
    setEditingSection(null);
  };

  const downloadRegionTransitionCsv = async () => {
    if (!token) return;
    setExportingTransitionCsv(true);
    try {
      const { blob, filename } = await companyAPI.exportRegionTransitionCSV(token, 5);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExportingTransitionCsv(false);
    }
  };

  const handleRegionSave = () => {
    const newRegion = regionMode === "multi" ? "multi-region" : singleRegionChoice;
    if (!newRegion) {
      setRegionInlineError("Please select a valid region mode.");
      return;
    }
    setRegionInlineError("");
    setRegionTransitionError("");
    const previousRegion = data.region || "";
    const destructiveTransition =
      (previousRegion === "multi-region" && newRegion !== "multi-region") ||
      (previousRegion !== "multi-region" && newRegion !== "multi-region" && previousRegion !== newRegion);
    if (newRegion !== previousRegion && destructiveTransition) {
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
        region:
          data.region === "multi-region"
            ? String(loc?.region || "").trim().toLowerCase()
            : String(data.region || "").trim().toLowerCase(),
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
    const regionForRow = data.region === "multi-region" ? selectedRegion : data.region;
    if (!regionForRow || !selectedCountry || !selectedCity || !String(selectedBranch || "").trim()) {
      setLocationsInlineError("Please select region, country, city, and enter branch before adding.");
      return;
    }
    const cityExists = facilitiesEditData.locations.some(
      (loc) =>
        String(loc.region || "").toLowerCase() === String(regionForRow || "").toLowerCase() &&
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
      region: regionForRow,
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
    setSelectedRegion(data.region === "multi-region" ? "middle-east" : data.region || "");
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

  const formatRevenue = (value, currency = data.revenueCurrency || "USD") => {
    if (!value && value !== 0) return "—";
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
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
              <div className="field-group">
                <label className="field-label">Region Model</label>
                <div className="region-mode-row">
                  <label className="region-radio">
                    <input
                      type="radio"
                      name="region-mode"
                      checked={regionMode === "single"}
                      onChange={() => {
                        setRegionInlineError("");
                        setRegionMode("single");
                      }}
                    />
                    <span>One Region</span>
                  </label>
                  <label className="region-radio">
                    <input
                      type="radio"
                      name="region-mode"
                      checked={regionMode === "multi"}
                      onChange={() => {
                        setRegionInlineError("");
                        setRegionMode("multi");
                      }}
                    />
                    <span>Multi Region</span>
                  </label>
                </div>
              </div>
              {regionMode === "single" && (
                <div className="field-group">
                  <label className="field-label">Select Region</label>
                  <ThemedSelect
                    className="field-select"
                    value={singleRegionChoice}
                    onChange={(v) => {
                      setRegionInlineError("");
                      setSingleRegionChoice(v);
                    }}
                    options={regions
                      .filter((r) => r.value !== "multi-region")
                      .map((r) => ({ value: r.value, label: String(r.label || "").trim() }))}
                    placeholder="Select region"
                    menuDirection="down"
                  />
                </div>
              )}
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
              {visibleBranchEmployees.length > 0 ? (
                <>
                  <div className="summary-row" key="employees-value">
                    <span className="row-label">Branch-wise Employees:</span>
                    <span className="row-value">Configured</span>
                  </div>
                  <div className="locations-list">
                    {visibleBranchEmployees.map((row, idx) => (
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
              ) : Array.isArray(data.branchEmployees) && data.branchEmployees.length > 0 && activeLocations.length > 0 ? (
                <div className="summary-row" key="employees-no-region">
                  <span className="row-label">Branch-wise Employees:</span>
                  <span className="row-value" style={{ color: "#6B7280", fontSize: 13 }}>
                    No branch rows for the current region. Edit to assign employees to visible branches.
                  </span>
                </div>
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
              <div className="field-group" style={{ marginBottom: 12 }}>
                <label className="field-label">Currency</label>
                <ThemedSelect
                  value={editData.revenueCurrency || "USD"}
                  onChange={(v) => setEditData({ ...editData, revenueCurrency: v || "USD" })}
                  options={[
                    { value: "USD", label: "USD ($)" },
                    { value: "EUR", label: "EUR (€)" },
                    { value: "GBP", label: "GBP (£)" },
                    { value: "AED", label: "AED (د.إ)" },
                  ]}
                  placeholder="Currency"
                />
              </div>
              <p className="step-description" style={{ marginBottom: 12, fontSize: 13, color: "#6B7280" }}>
                Enter annual revenue per branch. Total updates automatically.
              </p>
              <div className="branch-revenue-edit-grid">
                {(editBranchRevenue || []).map((row, idx) => (
                  <div key={`br-${idx}`} className="branch-revenue-row">
                    <span className="branch-revenue-label">
                      {`${row.city || "City"}, ${getCountryLabel(row.country || "")} — ${row.branch || "Main"}`}
                    </span>
                    <input
                      type="number"
                      className="field-input"
                      min={0}
                      value={row.revenue === 0 || row.revenue ? String(row.revenue) : ""}
                      onChange={(e) => {
                        const next = [...editBranchRevenue];
                        next[idx] = { ...next[idx], revenue: e.target.value };
                        setEditBranchRevenue(next);
                      }}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
              <div className="summary-row" style={{ marginTop: 12 }}>
                <span className="row-label">Total</span>
                <span className="row-value">
                  {formatRevenue(
                    (editBranchRevenue || []).reduce((s, r) => s + (Number(r.revenue) || 0), 0),
                    editData.revenueCurrency
                  )}
                </span>
              </div>
              <div className="edit-actions">
                <PrimaryButton onClick={handleSave} className="save-btn"><FiSave /> Save</PrimaryButton>
                <SecondaryButton onClick={handleCancel} className="cancel-btn"><FiX /> Cancel</SecondaryButton>
              </div>
              <style jsx>{`
                .branch-revenue-edit-grid {
                  display: flex;
                  flex-direction: column;
                  gap: 10px;
                }
                .branch-revenue-row {
                  display: grid;
                  grid-template-columns: minmax(160px, 1fr) 140px;
                  gap: 10px;
                  align-items: center;
                }
                .branch-revenue-label {
                  font-size: 13px;
                  color: #374151;
                  font-weight: 500;
                }
                .field-input {
                  padding: 10px 12px;
                  border: 1px solid #e5e7eb;
                  border-radius: 8px;
                  font-size: 14px;
                }
                @media (max-width: 640px) {
                  .branch-revenue-row {
                    grid-template-columns: 1fr;
                  }
                }
              `}</style>
            </div>
          ) : (
            <div className="summary-content">
              {visibleBranchRevenue.length > 0 ? (
                <>
                  <div className="summary-row" key="revenue-branch-header">
                    <span className="row-label">Branch-wise revenue:</span>
                    <span className="row-value">{formatRevenue(data.revenue, data.revenueCurrency)}</span>
                  </div>
                  <div className="locations-list">
                    {visibleBranchRevenue.map((row, idx) => (
                      <div key={`brv-${idx}`} className="location-item">
                        <FiMapPin className="location-icon" />
                        <span>
                          {`${row.city || "City"}, ${getCountryLabel(row.country || "")} - ${row.branch || "Main"}`}
                        </span>
                        <span className="country-badge">
                          {formatRevenue(Number(row.revenue ?? row.amount ?? 0), data.revenueCurrency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : Array.isArray(data.branchRevenue) && data.branchRevenue.length > 0 && activeLocations.length > 0 ? (
                <div className="summary-row" key="revenue-no-region">
                  <span className="row-label">Branch-wise revenue:</span>
                  <span className="row-value" style={{ color: "#6B7280", fontSize: 13 }}>
                    No revenue rows for the current region. Edit to assign revenue to visible branches.
                  </span>
                </div>
              ) : (
                <div className="summary-row" key="revenue-value">
                  <span className="row-label">Annual Revenue:</span>
                  <span className="row-value">{formatRevenue(data.revenue, data.revenueCurrency)}</span>
                </div>
              )}
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
              <h4>Locations ({activeLocations.length || 0})</h4>
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
                  {isMultiRegionCompany ? (
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
                  ) : (
                    <input
                      className="field-input"
                      readOnly
                      value={getRegionLabel(data.region)}
                      title="Region is set in the Region section above"
                    />
                  )}
                </div>
                <div className="field-group">
                  <label className="field-label">Country</label>
                  <ThemedSelect
                    className="field-select"
                    value={selectedCountry}
                    onChange={(nextCountry) => handleCountryChange(nextCountry)}
                    disabled={!data.region || (isMultiRegionCompany && !selectedRegion)}
                    options={countriesByRegion[isMultiRegionCompany ? selectedRegion : data.region] || []}
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
                    <FiPlus /> Add
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
                  <p>No entries added yet. Select country and city, add branch, then click Add.</p>
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
              {!activeLocations || activeLocations.length === 0 ? (
                <p className="empty-facilities">No locations added</p>
              ) : (
                activeLocations.map((loc, idx) => (
                  <div key={loc.id ?? `loc-${idx}`} className="facility-item">
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
        onConfirm={async (choice) => {
          if (!pendingRegion) return;
          if (choice === "export") {
            try {
              await downloadRegionTransitionCsv();
            } catch (error) {
              setRegionTransitionError(error?.message || "Could not export CSV. Please try again.");
              return;
            }
          }
          applyRegionChange(pendingRegion);
        }}
        title="Region Change Impacts Existing Data"
        message="Changing from multi-region to one region (or switching one region to another) removes locations outside the selected region. If you want your last 5 years exported in CSV before continuing, choose Yes. Choose No to continue without export."
        options={[
          { label: exportingTransitionCsv ? "Exporting..." : "Yes, Export 5 Years", value: "export" },
          { label: "No, Continue Without Export", value: "continue" },
        ]}
        type="danger"
      />
      {regionTransitionError && (
        <div className="inline-error" style={{ marginTop: 12 }}>
          {regionTransitionError}
        </div>
      )}

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
        .region-mode-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          align-items: center;
        }
        .region-radio {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #374151;
          font-weight: 600;
          cursor: pointer;
        }
        .region-radio input[type="radio"] {
          accent-color: #2E7D64;
        }
        .field-input {
          width: 100%;
          min-height: 42px;
          padding: 10px 12px;
          border: 1px solid #D1D5DB;
          border-radius: 10px;
          background: #FFFFFF;
          color: #111827;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.2;
          transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, transform 0.18s ease;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: textfield;
        }
        .field-input::placeholder {
          color: #9CA3AF;
          font-weight: 400;
        }
        .field-input:hover:not(:disabled) {
          border-color: #9CA3AF;
          background: #FCFDFD;
        }
        .field-input:focus {
          outline: none;
          border-color: #2E7D64;
          box-shadow: 0 0 0 3px rgba(46, 125, 100, 0.14);
          background: #FFFFFF;
        }
        .field-input:disabled {
          background: #F3F4F6;
          color: #9CA3AF;
          cursor: not-allowed;
          box-shadow: none;
        }
        .field-input[type=number]::-webkit-inner-spin-button,
        .field-input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .location-item .field-input {
          width: 130px;
          min-height: 38px;
          padding: 8px 10px;
          font-size: 13px;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
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