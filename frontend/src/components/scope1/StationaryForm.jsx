import React, { useState, useMemo } from "react";
import Card from "../ui/Card";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";
import EmptyState from "../ui/EmptyState";
import { useEmissionStore } from "../../store/emissionStore";
import InputField from "../ui/InputField";

export default function StationaryForm() {
  const equipmentTypes = [
    "Generators", "Stove", "Heater", "Oven", "Boiler",
    "Chimney", "Combustion turbine", "Compressor", "Dryer", "Other",
  ];

  const fuelTypes = [
    "Biodiesel (liters)", "Bioethanol (liters)", "Biogas (tons)", "Diesel (liters)",
    "CNG (liters)", "Domestic coal (tons)", "Heating oil (liters)", "Industrial coal (tons)",
    "LPG (liters)", "Petrol (liters)", "Wood pellets (tons)", "Kerosene (tons)", "Other",
  ];

  const [equipment, setEquipment] = useState(equipmentTypes[0]);
  const [consumptions, setConsumptions] = useState(
    fuelTypes.reduce((acc, f) => ({ ...acc, [f]: "" }), {})
  );
  const [searchTerm, setSearchTerm] = useState("");

  const entries = useEmissionStore((s) => s.scope1Stationary);
  const addStationary = useEmissionStore((s) => s.addScope1Stationary);
  const deleteStationary = useEmissionStore((s) => s.deleteScope1Stationary);

  const handleChange = (fuel, value) => setConsumptions({ ...consumptions, [fuel]: value });

  const handleSubmit = () => {
    Object.entries(consumptions).forEach(([fuel, value]) => {
      if (value && Number(value) > 0) {
        addStationary({
          id: Date.now() + fuel,
          equipment,
          fuel,
          consumption: Number(value),
        });
      }
    });
    setConsumptions(fuelTypes.reduce((acc, f) => ({ ...acc, [f]: "" }), {}));
  };

  const handleDelete = (id) => deleteStationary(id);

  // Filtered display
  const displayedEntries = useMemo(() => {
    if (!searchTerm) return entries;
    return entries.filter(
      e =>
        e.equipment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.fuel.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [entries, searchTerm]);

  // Emissions preview
  const totalConsumption = entries.reduce((sum, e) => sum + e.consumption, 0);

  // Get unit from fuel string
  const getUnit = (fuel) => {
    const match = fuel.match(/\(([^)]+)\)/);
    return match ? match[1] : '';
  };

  return (
    <div className="stationary-container">
      {/* Header with description */}
      <div className="section-description">
        <div className="description-icon">🏭</div>
        <div className="description-content">
          <h3>Stationary Combustion Sources</h3>
          <p>
            Provide fuel consumption for <span className="highlight">stationary equipment</span> at your facilities. 
            This includes generators, boilers, heaters, and other fixed combustion sources.
          </p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="search-filter-bar">
        <div className="search-box">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="#6B7280" strokeWidth="2"/>
            <path d="M19 19L15 15" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search equipment or fuel type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div style = {{margin: "30px"}} className="filter-badge">
          {entries.length} entries
        </div>
      </div>

      {/* Add Stationary Form Card */}
      <Card className="add-stationary-card">
        <div className="card-header-compact">
          <h4>Add Stationary Combustion Entry</h4>
          <p>Select equipment and enter fuel consumption</p>
        </div>
        
        <div className="add-stationary-form">
          {/* Equipment Selection */}
          <div className="equipment-section">
            <label className="section-label">Equipment Type</label>
            <select
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="equipment-select"
            >
              {equipmentTypes.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          {/* Fuel Grid */}
          <div className="fuel-grid">
            {fuelTypes.map(fuel => {
              const unit = getUnit(fuel);
              const fuelName = fuel.replace(/\([^)]+\)/, '').trim();
              return (
                <div key={fuel} className="fuel-input-group">
                  <label className="fuel-label">
                    {fuelName}
                    <span className="fuel-unit">{unit}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={`Enter ${fuelName.toLowerCase()}`}
                    value={consumptions[fuel]}
                    onChange={(e) => handleChange(fuel, e.target.value)}
                    className="fuel-input"
                  />
                </div>
              );
            })}
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <PrimaryButton onClick={handleSubmit} className="submit-btn">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4V16M4 10H16" stroke="white" strokeWidth="2"/>
              </svg>
              Add Stationary Entries
            </PrimaryButton>
          </div>
        </div>
      </Card>

      {/* Entries Table */}
      {displayedEntries.length === 0 ? (
        <EmptyState 
          message="No stationary combustion entries added yet" 
          icon="🏭"
          className="empty-state-custom"
        />
      ) : (
        <Card className="table-card">
          <div className="table-wrapper">
            <table className="entries-table">
              <thead>
                <tr>
                  <th>Equipment</th>
                  <th>Fuel Type</th>
                  <th>Consumption</th>
                  <th>Unit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedEntries.map(e => {
                  const unit = getUnit(e.fuel);
                  return (
                    <tr key={e.id} className="entry-row">
                      <td>
                        <span className="equipment-badge">{e.equipment}</span>
                      </td>
                      <td>
                        <span className="fuel-type">{e.fuel.replace(/\([^)]+\)/, '').trim()}</span>
                      </td>
                      <td className="number-cell">{e.consumption.toLocaleString()}</td>
                      <td>
                        <span className="unit-badge">{unit}</span>
                      </td>
                      <td className="actions-cell">
                        <SecondaryButton 
                          onClick={() => alert("Edit coming soon")} 
                          className="edit-btn"
                        >
                          Edit
                        </SecondaryButton>
                        <button 
                          onClick={() => handleDelete(e.id)} 
                          className="delete-btn"
                          title="Delete"
                        >
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M3 3L15 15M15 3L3 15" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Emissions Summary Footer */}
      <Card className="summary-footer">
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Total Entries</span>
            <span className="summary-value">{entries.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Consumption</span>
            <span className="summary-value">{totalConsumption.toLocaleString()}</span>
          </div>
          <div className="summary-item highlight">
            <span className="summary-label">Estimated CO₂e</span>
            <span className="summary-value emission">
              {(totalConsumption * 2.31).toFixed(2)} tCO₂e
            </span>
          </div>
        </div>
        <div className="footer-note">
          <p>🌱 Based on UK Government conversion factors for stationary combustion</p>
        </div>
      </Card>

      <style jsx>{`
        .stationary-container {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        /* Section Description */
        .section-description {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
          padding: 20px 24px;
          background: linear-gradient(135deg, #f0f9f0 0%, #e6f3e6 100%);
          border-radius: 20px;
          border-left: 6px solid #2E7D32;
          box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1);
        }

        .description-icon {
          font-size: 32px;
          line-height: 1;
        }

        .description-content h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 700;
          color: #1B5E20;
        }

        .description-content p {
          margin: 0;
          color: #374151;
          font-size: 15px;
          line-height: 1.6;
        }

        .highlight {
          background: rgba(46, 125, 50, 0.1);
          padding: 2px 8px;
          border-radius: 20px;
          font-weight: 600;
          color: #2E7D32;
        }

        /* Search Bar */
        .search-filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          gap: 16px;
        }

        .search-box {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: white;
          border-radius: 60px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
          transition: all 0.2s ease;
        }

        .search-box:focus-within {
          border-color: #2E7D32;
          box-shadow: 0 0 0 4px rgba(46, 125, 50, 0.15);
        }

        .search-icon {
          flex-shrink: 0;
        }

        .search-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 15px;
          background: transparent;
        }

        .filter-badge {
          padding: 8px 16px;
          background: #2E7D32;
          color: white;
          border-radius: 30px;
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
        }

        /* Add Stationary Card */
        .add-stationary-card {
          margin-bottom: 24px;
          border: 1px solid rgba(46, 125, 50, 0.2);
        }

        .card-header-compact {
          padding: 16px 20px;
          background: #f8faf8;
          border-bottom: 1px solid #e5e7eb;
        }

        .card-header-compact h4 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: #2E7D32;
        }

        .card-header-compact p {
          margin: 0;
          font-size: 13px;
          color: #6B7280;
        }

        .add-stationary-form {
          padding: 24px;
        }

        .equipment-section {
          margin-bottom: 24px;
        }

        .section-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        .equipment-select {
          width: 100%;
          max-width: 300px;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          background: white;
          transition: all 0.2s ease;
          outline: none;
        }

        .equipment-select:focus {
          border-color: #2E7D32;
          box-shadow: 0 0 0 4px rgba(46, 125, 50, 0.15);
        }

        .fuel-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
          max-height: 400px;
          overflow-y: auto;
          padding: 4px;
        }

        .fuel-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .fuel-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
        }

        .fuel-unit {
          padding: 2px 6px;
          background: #f0f9f0;
          border-radius: 12px;
          font-size: 11px;
          color: #2E7D32;
        }

        .fuel-input {
          padding: 10px 12px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 13px;
          transition: all 0.2s ease;
          outline: none;
        }

        .fuel-input:focus {
          border-color: #2E7D32;
          box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.15);
        }

        .fuel-input::placeholder {
          color: #9ca3af;
          font-size: 12px;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 16px;
        }

        .submit-btn {
          min-width: 220px;
        }

        /* Table Card */
        .table-card {
          margin-bottom: 24px;
          overflow: hidden;
          border: 1px solid rgba(46, 125, 50, 0.2);
        }

        .table-wrapper {
          overflow-x: auto;
          max-width: 100%;
        }

        .entries-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 8px;
          padding: 8px;
        }

        .entries-table th {
          text-align: left;
          padding: 16px 20px;
          background: #f8faf8;
          font-size: 13px;
          font-weight: 600;
          color: #4B5563;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .entries-table td {
          padding: 16px 20px;
          background: white;
          border-bottom: 1px solid #f0f0f0;
        }

        .entry-row {
          transition: all 0.2s ease;
        }

        .entry-row:hover {
          background: #f8faf8;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .equipment-badge {
          padding: 4px 12px;
          background: #f0f9f0;
          color: #2E7D32;
          border-radius: 30px;
          font-size: 13px;
          font-weight: 500;
        }

        .fuel-type {
          font-weight: 500;
          color: #374151;
        }

        .unit-badge {
          padding: 2px 8px;
          background: #e5e7eb;
          border-radius: 12px;
          font-size: 11px;
          color: #4B5563;
        }

        .number-cell {
          font-family: 'Inter', monospace;
          font-weight: 500;
        }

        .actions-cell {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .edit-btn {
          padding: 6px 16px !important;
          font-size: 13px !important;
        }

        .delete-btn {
          padding: 8px;
          background: white;
          border: 1px solid #fee2e2;
          border-radius: 10px;
          color: #ef4444;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .delete-btn:hover {
          background: #fee2e2;
          transform: scale(1.1);
        }

        /* Summary Footer */
        .summary-footer {
          margin-top: 24px;
          padding: 0;
          overflow: hidden;
          border: 1px solid rgba(46, 125, 50, 0.2);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: #e5e7eb;
        }

        .summary-item {
          background: white;
          padding: 24px;
          text-align: center;
        }

        .summary-item.highlight {
          background: linear-gradient(135deg, #f0f9f0 0%, #e6f3e6 100%);
        }

        .summary-label {
          display: block;
          font-size: 14px;
          color: #6B7280;
          margin-bottom: 8px;
        }

        .summary-value {
          display: block;
          font-size: 28px;
          font-weight: 700;
          color: #1B5E20;
        }

        .summary-value.emission {
          color: #2E7D32;
          font-size: 32px;
        }

        .footer-note {
          padding: 16px 24px;
          background: #f8faf8;
          border-top: 1px solid #e5e7eb;
          font-size: 13px;
          color: #6B7280;
        }

        .footer-note p {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Empty State */
        .empty-state-custom {
          padding: 48px;
          background: white;
          border-radius: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border: 1px dashed #2E7D32;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .stationary-container {
            padding: 12px;
          }

          .section-description {
            flex-direction: column;
            align-items: flex-start;
          }

          .fuel-grid {
            grid-template-columns: 1fr;
            max-height: 300px;
          }

          .summary-grid {
            grid-template-columns: 1fr;
          }

          .summary-value {
            font-size: 24px;
          }

          .summary-value.emission {
            font-size: 28px;
          }

          .actions-cell {
            flex-wrap: wrap;
          }

          .equipment-select {
            max-width: 100%;
          }
        }

        @media (max-width: 480px) {
          .search-filter-bar {
            flex-direction: column;
          }

          .filter-badge {
            align-self: flex-start;
          }

          .submit-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}