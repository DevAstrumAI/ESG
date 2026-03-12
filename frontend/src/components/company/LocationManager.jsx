// src/components/company/LocationManager.jsx
import React, { useState, useEffect } from "react";
import CountrySelector from "./CountrySelector";
import SelectDropdown from "../ui/SelectDropdown";
import PrimaryButton from "../ui/PrimaryButton";
import { FiMapPin, FiTrash2, FiPlus } from "react-icons/fi";

export default function LocationManager({ data, updateField }) {
  const [selectedCity, setSelectedCity] = useState("");

  // Cities by country
  const citiesByCountry = {
    uae: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"],
    qatar: ["Doha", "Al Wakrah", "Al Khor", "Al Rayyan"],
    saudi: ["Riyadh", "Jeddah", "Dammam", "Khobar", "Medina", "Mecca"],
  };

  const availableCities = citiesByCountry[data.country] || [];

  // Reset city selection when country changes
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

  // If no region selected
  if (!data.region) {
    return (
      <div className="location-manager">
        <h3>Step 6: Add Facility Locations</h3>
        <div className="empty-state">
          <FiMapPin size={32} className="empty-icon" />
          <p>Please select a region first</p>
        </div>
        <style jsx>{`
          .location-manager {
            padding: 20px;
          }
          .empty-state {
            text-align: center;
            padding: 40px;
            background: #F9FAFB;
            border-radius: 16px;
            color: #6B7280;
          }
          .empty-icon {
            color: #9CA3AF;
            margin-bottom: 12px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="location-manager">
      <div className="step-header">
        <h3>Step 6: Add Facility Locations</h3>
        {data.country && (
          <div className="step-status">
            {data.locations.length} {data.locations.length === 1 ? 'city' : 'cities'} added
          </div>
        )}
      </div>
      
      {/* Show CountrySelector if region selected but no country */}
      {data.region && !data.country && (
        <>
          <p className="step-description">
            First, select the country where your facilities are located.
          </p>
          <CountrySelector data={data} updateField={updateField} />
        </>
      )}

      {/* Show city selection only after country is selected */}
      {data.country && (
        <>
          <div className="country-info">
            <FiMapPin className="country-icon" />
            <span>
              Adding locations for <strong>{data.country === 'uae' ? 'UAE' : 
                data.country === 'qatar' ? 'Qatar' : 'Saudi Arabia'}</strong>
            </span>
          </div>

          <div className="add-section">
            <div className="selector-wrapper">
              <SelectDropdown
                label="Select City"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                options={availableCities.map((city) => ({
                  label: city,
                  value: city,
                }))}
                placeholder="Choose a city"
              />
            </div>

            <PrimaryButton 
              onClick={addCity} 
              className="add-btn"
              disabled={!selectedCity}
            >
              <FiPlus /> Add City
            </PrimaryButton>
          </div>

          {/* Selected Cities Table */}
          <div className="cities-section">
            <div className="section-header">
              <h4>Added Locations</h4>
              {data.locations.length > 0 && (
                <span className="badge">{data.locations.length} total</span>
              )}
            </div>

            {data.locations.length === 0 ? (
              <div className="empty-cities">
                <FiMapPin className="empty-icon" />
                <p>No cities added yet. Select a city above to add.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="cities-table">
                  <thead>
                    <tr>
                      <th>City Name</th>
                      <th>Country</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.locations.map((loc, index) => (
                      <tr key={loc.id} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                        <td>
                          <div className="city-cell">
                            <FiMapPin className="city-icon" />
                            <span className="city-name">{loc.city}</span>
                          </div>
                        </td>
                        <td>
                          <span className="country-badge">
                            {loc.country === 'uae' ? 'UAE' : 
                             loc.country === 'qatar' ? 'Qatar' : 'Saudi Arabia'}
                          </span>
                        </td>
                        <td>
                          <span className="status-badge active">Active</span>
                        </td>
                        <td>
                          <button
                            onClick={() => removeCity(loc.id)}
                            className="remove-btn"
                            title="Remove city"
                          >
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
              <span className="note-icon">ℹ️</span>
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
          color: #14532D;
          margin: 0;
        }

        .step-status {
          padding: 6px 14px;
          background: #F0FDF4;
          color: #15803D;
          border-radius: 30px;
          font-size: 13px;
          font-weight: 600;
        }

        .step-description {
          color: #4B5563;
          margin-bottom: 24px;
          font-size: 14px;
        }

        .country-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #F0FDF4;
          border-radius: 12px;
          margin-bottom: 24px;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .country-icon {
          color: #22C55E;
          font-size: 18px;
        }

        .country-info span {
          font-size: 14px;
          color: #374151;
        }

        .add-section {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 32px;
          border: 1px solid rgba(34, 197, 94, 0.15);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .selector-wrapper {
          margin-bottom: 16px;
          max-width: 400px;
        }

        .add-btn {
          width: 100%;
          max-width: 200px;
        }

        .add-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .cities-section {
          background: white;
          border-radius: 16px;
          border: 1px solid rgba(34, 197, 94, 0.15);
          overflow: hidden;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #F9FAFB;
          border-bottom: 1px solid rgba(34, 197, 94, 0.15);
        }

        .section-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #14532D;
        }

        .badge {
          padding: 4px 10px;
          background: white;
          color: #15803D;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 500;
          border: 1px solid rgba(34, 197, 94, 0.2);
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
          color: #4B5563;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          border-bottom: 2px solid rgba(34, 197, 94, 0.15);
        }

        .cities-table td {
          padding: 14px 20px;
          border-bottom: 1px solid #E5E7EB;
        }

        .even-row {
          background: white;
        }

        .odd-row {
          background: #F9FAFB;
        }

        .city-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .city-icon {
          color: #22C55E;
          font-size: 16px;
        }

        .city-name {
          font-weight: 500;
          color: #14532D;
        }

        .country-badge {
          display: inline-block;
          padding: 4px 10px;
          background: #F0FDF4;
          color: #15803D;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.active {
          background: #E6F7E6;
          color: #15803D;
        }

        .remove-btn {
          padding: 8px;
          background: white;
          border: 1px solid #FEE2E2;
          border-radius: 8px;
          color: #EF4444;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .remove-btn:hover {
          background: #FEE2E2;
          transform: scale(1.1);
        }

        .empty-cities {
          text-align: center;
          padding: 48px 24px;
          color: #6B7280;
        }

        .empty-icon {
          font-size: 32px;
          color: #9CA3AF;
          margin-bottom: 12px;
        }

        .note-message {
          margin-top: 16px;
          padding: 12px 16px;
          background: #FEF3C7;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #92400E;
        }

        @media (max-width: 768px) {
          .add-btn {
            max-width: 100%;
          }

          .cities-table {
            border: 0;
          }

          .cities-table thead {
            display: none;
          }

          .cities-table tr {
            display: block;
            margin-bottom: 16px;
            border: 1px solid rgba(34, 197, 94, 0.15);
            border-radius: 8px;
          }

          .cities-table td {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px;
            border-bottom: 1px solid #E5E7EB;
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