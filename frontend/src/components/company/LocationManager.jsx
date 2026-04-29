// src/components/company/LocationManager.jsx
import React, { useState, useEffect, useMemo } from "react";
import PrimaryButton from "../ui/PrimaryButton";
import ThemedSelect from "../ui/ThemedSelect";
import { FiMapPin, FiTrash2, FiPlus } from "react-icons/fi";
import { countriesByRegion, citiesByCountry, filterLocationsForRegion } from "../../utils/companyLocations";

export default function LocationManager({ data, updateField }) {
  const [selectedRegion, setSelectedRegion] = useState(data.region || "");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [branchName, setBranchName] = useState("");

  const getCountryDisplayName = (countryCode) => {
    const names = {
      'uae': 'UAE',
      'qatar': 'Qatar',
      'saudi-arabia': 'Saudi Arabia',
      'singapore': 'Singapore'
    };
    return names[countryCode] || countryCode;
  };

  const availableCountries = countriesByRegion[selectedRegion] || [];
  const isMultiRegionMode = data.region === "multi-region";
  const availableCities = citiesByCountry[selectedCountry] || [];
  const validLocations = useMemo(
    () => filterLocationsForRegion(data.region, data.locations || []),
    [data.region, data.locations]
  );

  useEffect(() => {
    setSelectedRegion(data.region === "multi-region" ? "" : (data.region || ""));
    setSelectedCountry("");
    setSelectedCity("");
    setBranchName("");
  }, [data.region]);

  const addLocationPair = () => {
    const normalizedBranch = String(branchName || "").trim();
    if (!selectedRegion || !selectedCountry || !selectedCity || !normalizedBranch) return;
    const cityExists = validLocations.some(
      (loc) =>
        (loc.region || data.region || "") === selectedRegion &&
        loc.country === selectedCountry &&
        loc.city === selectedCity &&
        String(loc.branch || "").trim().toLowerCase() === normalizedBranch.toLowerCase()
    );
    if (cityExists) return;
    const newLocation = {
      id: Date.now(),
      region: selectedRegion,
      country: selectedCountry,
      city: selectedCity,
      branch: normalizedBranch,
    };
    const nextLocations = [...validLocations, newLocation];
    updateField("locations", nextLocations);
    // Keep top-level region stable: only wizard's region selection controls this.
    updateField("country", selectedCountry);
    setSelectedCountry("");
    setSelectedCity("");
    setBranchName("");
  };

  const removeLocationPair = (id) => {
    const updated = validLocations.filter(loc => loc.id !== id);
    updateField("locations", updated);
    if (updated.length === 0) updateField("country", "");
    else if (!updated.some((loc) => loc.country === data.country)) {
      updateField("country", updated[0].country);
    }
  };

  if (!data.region) {
    return (
      <div className="empty-state">
        <FiMapPin size={32} />
        <p>Please select a region first</p>
        <style jsx>{`
          .empty-state {
            text-align: center;
            padding: 48px;
            background: #F9FAFB;
            border-radius: 12px;
            border: 1px solid #E5E7EB;
            color: #6B7280;
          }
          .empty-state svg {
            color: #9CA3AF;
            margin-bottom: 12px;
          }
          .empty-state p {
            margin: 0;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="location-manager">
      <div className="step-header">
        <h3>Add Branch Locations</h3>
        {validLocations.length > 0 && (
          <span className="step-badge">
            {validLocations.length} {validLocations.length === 1 ? 'entry' : 'entries'} added
          </span>
        )}
      </div>
      <p className="step-description">
        Add each location as country + city + branch. Duplicate city-branch combinations are not allowed.
      </p>

      <div className="add-section">
        <div className="field-group">
          <label className="field-label">Region</label>
          <ThemedSelect
            className="field-select"
            value={selectedRegion}
            onChange={(nextRegion) => {
              if (!isMultiRegionMode) return;
              setSelectedRegion(nextRegion);
              setSelectedCountry("");
              setSelectedCity("");
            }}
            options={
              isMultiRegionMode
                ? [
                    { value: "middle-east", label: "Middle East" },
                    { value: "asia-pacific", label: "Asia Pacific" },
                  ]
                : [{ value: data.region, label: String(data.region || "").replace("-", " ") }]
            }
            placeholder={isMultiRegionMode ? "Select region" : "Region"}
            disabled={!isMultiRegionMode}
          />
        </div>
        <div className="field-group">
          <label className="field-label">Country</label>
          <ThemedSelect
            className="field-select"
            value={selectedCountry}
            onChange={(nextCountry) => {
              setSelectedCountry(nextCountry);
              setSelectedCity("");
            }}
            options={availableCountries}
            placeholder="Select country"
          />
        </div>
        <div className="field-group">
          <label className="field-label">City</label>
          <ThemedSelect
            className="field-select"
            value={selectedCity}
            onChange={(nextCity) => setSelectedCity(nextCity)}
            disabled={!selectedCountry}
            options={availableCities.map((city) => ({ value: city, label: city }))}
            placeholder="Select city"
          />
        </div>
        <div className="field-group">
          <label className="field-label">Branch</label>
          <input
            className="field-input"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            placeholder="Enter branch name"
          />
        </div>
      </div>

      <div className="cities-section">
        <div className="section-header">
          <h4>Added Location Pairs</h4>
          {validLocations.length > 0 && (
            <span className="badge">{validLocations.length} total</span>
          )}
        </div>

        {validLocations.length === 0 ? (
          <div className="empty-cities">
            <FiMapPin />
            <p>No location entries yet. Add your first country-city pair.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="cities-table">
              <thead>
                <tr>
                  <th>Region</th>
                  <th>Country</th>
                  <th>City</th>
                  <th>Branch</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {validLocations.map((loc) => (
                  <tr key={loc.id}>
                    <td data-label="Region">
                      <span className="country-badge">{loc.region || data.region || "—"}</span>
                    </td>
                    <td data-label="Country">
                      <span className="country-badge">{getCountryDisplayName(loc.country)}</span>
                    </td>
                    <td data-label="City">
                      <div className="city-cell">
                        <FiMapPin />
                        <span>{loc.city}</span>
                      </div>
                    </td>
                    <td data-label="Branch">
                      <span className="country-badge">{loc.branch || "Main"}</span>
                    </td>
                    <td>
                      <button onClick={() => removeLocationPair(loc.id)} className="remove-btn" title="Remove entry">
                        <FiTrash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="add-more-row">
        <PrimaryButton
          onClick={addLocationPair}
          className="add-btn"
          disabled={!selectedRegion || !selectedCountry || !selectedCity || !String(branchName || "").trim()}
        >
          <FiPlus /> Add more
        </PrimaryButton>
      </div>

      {validLocations.length === 0 && (
        <div className="note-message">
          <span>ℹ️</span>
          <span>You need to add at least one city + branch location to continue</span>
        </div>
      )}

      <style jsx>{`
        .location-manager {
          animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .step-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .step-header h3 {
          font-size: 20px;
          font-weight: 700;
          color: #1B4D3E;
          margin: 0;
        }

        .step-badge {
          padding: 6px 14px;
          background: #F8FAF8;
          color: #2E7D64;
          border-radius: 30px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid #E5E7EB;
        }

        .step-description {
          color: #4A5568;
          margin-bottom: 24px;
          font-size: 14px;
        }

        .add-section {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 32px;
          border: 1px solid #E5E7EB;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .field-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .field-select {
          padding: 12px 16px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 14px;
          background: #FFFFFF;
          color: #111827;
          cursor: pointer;
          color-scheme: light;
          -webkit-appearance: none;
          appearance: none;
        }

        .field-select:focus {
          outline: none;
          border-color: #2E7D64;
        }

        .field-select option {
          background: #FFFFFF;
          color: #111827;
        }
        .field-input {
          padding: 12px 16px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 14px;
          background: #FFFFFF;
          color: #111827;
        }

        .add-btn {
          padding: 11px 20px !important;
          background: #2E7D64 !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
        }
        .add-more-row {
          display: flex;
          justify-content: flex-end;
          margin-top: 12px;
        }


        .add-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .cities-section {
          background: white;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
          overflow: hidden;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #F8FAF8;
          border-bottom: 1px solid #E5E7EB;
        }

        .section-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1B4D3E;
        }

        .badge {
          padding: 4px 12px;
          background: white;
          color: #2E7D64;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 500;
          border: 1px solid #E5E7EB;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .cities-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .cities-table th {
          text-align: left;
          padding: 14px 20px;
          background: white;
          color: #4A5568;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          border-bottom: 1px solid #E5E7EB;
        }

        .cities-table td {
          padding: 14px 20px;
          border-bottom: 1px solid #F3F4F6;
        }

        .cities-table tr:last-child td {
          border-bottom: none;
        }

        .city-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .city-cell svg {
          color: #2E7D64;
          font-size: 16px;
        }

        .city-cell span {
          font-weight: 500;
          color: #1B4D3E;
        }

        .country-badge {
          display: inline-block;
          padding: 4px 12px;
          background: #F8FAF8;
          color: #1B4D3E;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 500;
          border: 1px solid #E5E7EB;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          background: #E8F0EA;
          color: #2E7D64;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 500;
          border: 1px solid #C6E0C8;
        }

        .remove-btn {
          padding: 8px;
          background: white;
          border: 1px solid #FEE2E2;
          border-radius: 6px;
          color: #DC2626;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .remove-btn:hover {
          background: #FEE2E2;
        }

        .empty-cities {
          text-align: center;
          padding: 48px 24px;
          color: #6B7280;
        }

        .empty-cities svg {
          font-size: 32px;
          color: #9CA3AF;
          margin-bottom: 12px;
        }

        .empty-cities p {
          margin: 0;
          font-size: 14px;
        }

        .note-message {
          margin-top: 16px;
          padding: 12px 16px;
          background: #FEF3C7;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #92400E;
          border: 1px solid #FCD34D;
        }

        @media (max-width: 768px) {
          .add-section {
            grid-template-columns: 1fr;
          }

          .add-btn {
            width: 100%;
          }
          .add-more-row {
            justify-content: stretch;
          }

          .cities-table thead {
            display: none;
          }

          .cities-table tr {
            display: block;
            margin-bottom: 12px;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
          }

          .cities-table td {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-bottom: 1px solid #F3F4F6;
          }

          .cities-table td:last-child {
            border-bottom: none;
          }

          .cities-table td::before {
            content: attr(data-label);
            font-weight: 600;
            color: #6B7280;
            width: 100px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}