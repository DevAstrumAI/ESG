// src/components/company/LocationManager.jsx
import React, { useState, useEffect } from "react";
import CountrySelector from "./CountrySelector";
import PrimaryButton from "../ui/PrimaryButton";
import { FiMapPin, FiTrash2, FiPlus } from "react-icons/fi";

export default function LocationManager({ data, updateField }) {
  const [selectedCity, setSelectedCity] = useState("");

  const citiesByCountry = {
    uae: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"],
    qatar: ["Doha", "Al Wakrah", "Al Khor", "Al Rayyan"],
    "saudi-arabia": ["Riyadh", "Jeddah", "Dammam", "Khobar", "Medina", "Mecca"],
    singapore: ["Singapore"]
  };

  const getCountryDisplayName = (countryCode) => {
    const names = {
      'uae': 'UAE',
      'qatar': 'Qatar',
      'saudi-arabia': 'Saudi Arabia',
      'singapore': 'Singapore'
    };
    return names[countryCode] || countryCode;
  };

  const availableCities = citiesByCountry[data.country] || [];

  useEffect(() => {
    setSelectedCity("");
  }, [data.country]);

  const addCity = () => {
    if (!selectedCity) return;
    const cityExists = data.locations.some(loc => loc.city === selectedCity);
    if (cityExists) return;
    const newLocation = {
      id: Date.now(),
      country: data.country,
      city: selectedCity,
    };
    updateField("locations", [...data.locations, newLocation]);
    setSelectedCity("");
  };

  const removeCity = (id) => {
    const updated = data.locations.filter(loc => loc.id !== id);
    updateField("locations", updated);
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
        <h3>Add Facility Locations</h3>
        {data.country && (
          <span className="step-badge">
            {data.locations.length} {data.locations.length === 1 ? 'city' : 'cities'} added
          </span>
        )}
      </div>
      
      {data.region && !data.country && (
        <>
          <p className="step-description">
            First, select the country where your facilities are located.
          </p>
          <CountrySelector data={data} updateField={updateField} />
        </>
      )}

      {data.country && (
        <>
          <div className="country-info">
            <FiMapPin className="info-icon" />
            <span>Adding locations for <strong>{getCountryDisplayName(data.country)}</strong></span>
          </div>

          <div className="add-section">
            <div className="field-group">
              <label className="field-label">Select City</label>
              <select
                className="field-select"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
              >
                <option value="">Choose a city</option>
                {availableCities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <PrimaryButton onClick={addCity} className="add-btn" disabled={!selectedCity}>
              <FiPlus /> Add City
            </PrimaryButton>
          </div>

          <div className="cities-section">
            <div className="section-header">
              <h4>Added Locations</h4>
              {data.locations.length > 0 && (
                <span className="badge">{data.locations.length} total</span>
              )}
            </div>

            {data.locations.length === 0 ? (
              <div className="empty-cities">
                <FiMapPin />
                <p>No cities added yet. Select a city above to add.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="cities-table">
                  <thead>
                    <tr>
                      <th>City Name</th>
                      <th>Country</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.locations.map((loc) => (
                      <tr key={loc.id}>
                        <td data-label="City Name">
                          <div className="city-cell">
                            <FiMapPin />
                            <span>{loc.city}</span>
                          </div>
                        </td>
                        <td data-label="Country">
                          <span className="country-badge">{getCountryDisplayName(loc.country)}</span>
                        </td>
                        <td>
                          <button onClick={() => removeCity(loc.id)} className="remove-btn" title="Remove city">
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

          {data.locations.length === 0 && (
            <div className="note-message">
              <span>ℹ️</span>
              <span>You need to add at least one city to continue</span>
            </div>
          )}
        </>
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

        .country-info {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: #F8FAF8;
          border-radius: 8px;
          margin-bottom: 24px;
          border: 1px solid #E5E7EB;
        }

        .info-icon {
          color: #2E7D64;
          font-size: 18px;
        }

        .country-info span {
          font-size: 14px;
          color: #374151;
        }

        .add-section {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 32px;
          border: 1px solid #E5E7EB;
          display: flex;
          gap: 16px;
          align-items: flex-end;
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
          background: white;
          cursor: pointer;
        }

        .field-select:focus {
          outline: none;
          border-color: #2E7D64;
        }

        .add-btn {
          padding: 12px 24px !important;
          background: #2E7D64 !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
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
            flex-direction: column;
            align-items: stretch;
          }

          .add-btn {
            width: 100%;
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