import React, { useState, useMemo } from "react";
import Card from "../ui/Card";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";
import InputField from "../ui/InputField";
import EmptyState from "../ui/EmptyState";
import { useEmissionStore } from "../../store/emissionStore";
import { FiSearch, FiPlus, FiTrash2, FiHash, FiMapPin, FiDroplet } from "react-icons/fi";

export default function VehicleTable() {
  const vehicles = useEmissionStore((s) => s.scope1Vehicles);
  const addVehicle = useEmissionStore((s) => s.addScope1Vehicle);
  const updateVehicle = useEmissionStore((s) => s.updateScope1Vehicle);
  const deleteVehicle = useEmissionStore((s) => s.deleteScope1Vehicle);

  // Form state
  const [vehicleType, setVehicleType] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [km, setKm] = useState("");
  const [litres, setLitres] = useState("");
  const [registration, setRegistration] = useState("");
  const [editId, setEditId] = useState(null);
  const [editVehicleType, setEditVehicleType] = useState("");
  const [editFuelType, setEditFuelType] = useState("");
  const [editKm, setEditKm] = useState("");
  const [editLitres, setEditLitres] = useState("");
  const [editRegistration, setEditRegistration] = useState("");

  // Search bar
  const [searchTerm, setSearchTerm] = useState("");

  const vehicleOptions = [
    "Car", "Truck", "Bus", "Ship", "Airplane",
    "Cargo van", "Motorboat", "Motorcycle", "Forklift", "Lift", "Other"
  ];
  const fuelOptions = ["Diesel", "Petrol", "LPG", "Biodiesel", "Other"];

  const displayedVehicles = useMemo(() => {
    if (!searchTerm) return vehicles;
    return vehicles.filter(v =>
      v.vehicleType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.fuelType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.registration.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vehicles, searchTerm]);

// Backend decides distance-vs-litres purely from the *mapped fuel type*.
const DISTANCE_BASED_TYPES = new Set([
  "jet_aircraft_per_km",
  "cargo_ship_hfo",
  "marine_hfo",
  "diesel_train",
  "diesel_bus",
]);

const mapFuelTypeFromUI = (fuel) => {
  const normalized = (fuel || "").toLowerCase();
  const map = {
    "diesel": "diesel",
    "petrol": "petrol",
    "lpg": "lpg",
    "biodiesel": "biodiesel",
    "other": "natural_gas",
  };
  return map[normalized] || "natural_gas";
};

const mapVehicleFuelTypeFromUI = (vehicleType, fuelTypeUI) => {
  const type = (vehicleType || "").toLowerCase();
  const fuel = mapFuelTypeFromUI(fuelTypeUI);

  if (type === "car" && fuel === "petrol") return "petrol_car";
  if (type === "car" && fuel === "diesel") return "diesel_car";
  if (type === "truck" && fuel === "diesel") return "diesel_truck";
  if (type === "bus" && fuel === "diesel") return "diesel_bus";
  if (type === "motorcycle" && fuel === "petrol") return "petrol_motorcycle";
  if (type === "motorcycle" && fuel !== "petrol") return "motorcycle";
  if (type === "forklift" && fuel === "lpg") return "lpg_forklift";
  if (type === "motorboat") return "motorboat_gasoline";
  if (type === "cargo van" && fuel === "diesel") return "diesel_van";
  if (type === "airplane") return "jet_aircraft_per_km";
  if (type === "ship") return "cargo_ship_hfo";

  return fuel === "petrol" ? "petrol_car" : "diesel_car";
};

const mappedBackendFuelType = vehicleType && fuelType
  ? mapVehicleFuelTypeFromUI(vehicleType, fuelType)
  : "";

const useDistance = DISTANCE_BASED_TYPES.has(mappedBackendFuelType);

  const handleAdd = () => {
    // #region agent log V1
    fetch(
      "http://127.0.0.1:7312/ingest/558453d5-0857-4b96-9467-7f67bad3b71f",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "841ec6",
        },
        body: JSON.stringify({
          sessionId: "841ec6",
          runId: "pre-fix",
          hypothesisId: "V1",
          location: "frontend/src/components/scope1/VehicleTable.jsx:handleAdd",
          message: "Add Vehicle click: current form values + which field is visible",
          data: {
            vehicleType,
            fuelType,
            km,
            litres,
            registration,
            useDistance,
            missing: {
              vehicleType: !vehicleType,
              fuelType: !fuelType,
              km: !km,
              litres: !litres,
              registration: !registration,
            },
          },
          timestamp: Date.now(),
        }),
      }
    ).catch(() => {});
    // #endregion

    // Validation must match the UI: if distance-based, we only require `km`;
    // if fuel-based, we only require `litres`. (Do not require both.)
    if (!vehicleType || !fuelType || !registration) return;
    if (useDistance) {
      if (km === "" || km === null || Number.isNaN(Number(km))) return;
    } else {
      if (litres === "" || litres === null || Number.isNaN(Number(litres))) return;
    }

    const kmNum = Number(km || 0);
    const litresNum = Number(litres || 0);
    addVehicle({
      id: Date.now(),
      vehicleType,
      fuelType,
      km: useDistance ? kmNum : 0,
      litres: useDistance ? 0 : litresNum,
      registration
    });

    // #region agent log V2
    fetch(
      "http://127.0.0.1:7312/ingest/558453d5-0857-4b96-9467-7f67bad3b71f",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "841ec6",
        },
        body: JSON.stringify({
          sessionId: "841ec6",
          runId: "pre-fix",
          hypothesisId: "V2",
          location: "frontend/src/components/scope1/VehicleTable.jsx:handleAdd",
          message: "Add Vehicle passed validation and updated store",
          data: {
            vehicleType,
            fuelType,
            useDistance,
            km: useDistance ? kmNum : 0,
            litres: useDistance ? 0 : litresNum,
            registration,
          },
          timestamp: Date.now(),
        }),
      }
    ).catch(() => {});
    // #endregion

    setVehicleType(""); setFuelType(""); setKm(""); setLitres(""); setRegistration("");
  };

  const startEdit = (v) => {
    setEditId(v.id);
    setEditVehicleType(v.vehicleType);
    setEditFuelType(v.fuelType);
    setEditKm(v.km);
    setEditLitres(v.litres);
    setEditRegistration(v.registration);
  };

  const handleUpdate = () => {
    if (!editVehicleType || !editFuelType || !editKm || !editLitres || !editRegistration) return;
    updateVehicle({
      id: editId,
      vehicleType: editVehicleType,
      fuelType: editFuelType,
      km: Number(editKm),
      litres: Number(editLitres),
      registration: editRegistration
    });
    setEditId(null); setEditVehicleType(""); setEditFuelType(""); setEditKm(""); setEditLitres(""); setEditRegistration("");
  };

  const handleDelete = (id) => deleteVehicle(id);

  // Emissions preview
  const totalKm = vehicles.reduce((sum, v) => sum + v.km, 0);
  const totalLitres = vehicles.reduce((sum, v) => sum + v.litres, 0);
  const estimatedCO2 = 0;

  // Get fuel badge color
  const getFuelBadgeClass = (fuel) => {
    const fuelMap = {
      'Diesel': 'bg-amber-50 text-amber-700 border-amber-200',
      'Petrol': 'bg-blue-50 text-blue-700 border-blue-200',
      'LPG': 'bg-purple-50 text-purple-700 border-purple-200',
      'Biodiesel': 'bg-green-50 text-green-700 border-green-200',
      'Other': 'bg-gray-50 text-gray-700 border-gray-200'
    };
    return fuelMap[fuel] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <div className="vehicle-table-container">
      {/* Header with description */}
      <div className="section-description">
        <div className="description-icon">🚗</div>
        <div className="description-content">
          <h3>Mobile Combustion Sources</h3>
          <p>
            Provide fuel consumption for <span className="highlight">mobile vehicles</span> owned by your company. 
            Only company-owned vehicles should be reported here.
          </p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="search-filter-bar">
        <div className="search-box">
          <FiSearch className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Search vehicles, fuel type or registration..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div  style = {{margin: "30px"}}className="filter-badge">
          {vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'}
        </div>
      </div>

      {/* Add Vehicle Form Card */}
      <Card className="add-vehicle-card">
        <div className="card-header-compact">
          <h4>Add New Vehicle</h4>
          <p>Enter vehicle details below</p>
        </div>
        <div className="add-vehicle-form">
          <div className="form-grid">
          <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="form-select">
            <option value="">Vehicle Type</option>
            {vehicleOptions.map(v => <option key={v} value={v}>{v}</option>)}
          </select>

          <select value={fuelType} onChange={(e) => setFuelType(e.target.value)} className="form-select">
            <option value="">Fuel Type</option>
            {fuelOptions.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          <div className="input-wrapper">
            <FiHash className="input-icon" />
            <input type="text" placeholder="Registration Number" value={registration} onChange={(e) => setRegistration(e.target.value)} className="clean-input" />
          </div>
        </div>

          {useDistance ? (
            <div className="input-wrapper">
              <FiMapPin className="input-icon" />
              <input
              type="number"
              placeholder="Distance (km)"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              className="clean-input"
            />
          </div>
        ) : (
          <div className="input-wrapper">
            <FiDroplet className="input-icon" />
            <input
              type="number"
              placeholder="Fuel (litres)"
              value={litres}
              onChange={(e) => setLitres(e.target.value)}
              className="clean-input"
            />
          </div>
        )}

          <PrimaryButton onClick={handleAdd} className="add-btn">
            <FiPlus size={20} /> Add Vehicle
          </PrimaryButton>
        </div>
      </Card>

      {/* Vehicles Table */}
      {displayedVehicles.length === 0 ? (
        <EmptyState 
          message="No vehicles found" 
          icon="🚗"
          className="empty-state-custom"
        />
      ) : (
        <Card className="table-card">
          <div className="table-wrapper">
            <table className="vehicles-table">
              <thead>
                <tr>
                  <th>Vehicle Type</th>
                  <th>Fuel Type</th>
                  <th>Registration</th>
                  <th>Distance (km)</th>
                  <th>Fuel (litres)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedVehicles.map(v => (
                  <tr key={v.id} className="vehicle-row">
                    <td>
                      {editId === v.id ? (
                        <select 
                          value={editVehicleType} 
                          onChange={e => setEditVehicleType(e.target.value)} 
                          className="edit-select"
                        >
                          {vehicleOptions.map(vt => <option key={vt} value={vt}>{vt}</option>)}
                        </select>
                      ) : (
                        <span className="vehicle-badge">{v.vehicleType}</span>
                      )}
                    </td>
                    <td>
                      {editId === v.id ? (
                        <select 
                          value={editFuelType} 
                          onChange={e => setEditFuelType(e.target.value)} 
                          className="edit-select"
                        >
                          {fuelOptions.map(ft => <option key={ft} value={ft}>{ft}</option>)}
                        </select>
                      ) : (
                        <span className={`fuel-badge ${getFuelBadgeClass(v.fuelType)}`}>
                          {v.fuelType}
                        </span>
                      )}
                    </td>
                    <td>
                      {editId === v.id ? (
                        <div className="edit-input-wrapper">
                          <FiHash className="edit-input-icon" />
                          <input 
                            type="text"
                            value={editRegistration} 
                            onChange={e => setEditRegistration(e.target.value)} 
                            className="edit-input-field"
                          />
                        </div>
                      ) : (
                        <span className="registration-text">{v.registration}</span>
                      )}
                    </td>
                    <td className="number-cell">
                      {editId === v.id ? (
                        <div className="edit-input-wrapper">
                          <FiMapPin className="edit-input-icon" />
                          <input 
                            type="number" 
                            value={editKm} 
                            onChange={e => setEditKm(e.target.value)} 
                            className="edit-input-field"
                          />
                        </div>
                      ) : (
                        v.km.toLocaleString()
                      )}
                    </td>
                    <td className="number-cell">
                      {editId === v.id ? (
                        <div className="edit-input-wrapper">
                          <FiDroplet className="edit-input-icon" />
                          <input 
                            type="number" 
                            value={editLitres} 
                            onChange={e => setEditLitres(e.target.value)} 
                            className="edit-input-field"
                          />
                        </div>
                      ) : (
                        v.litres.toLocaleString()
                      )}
                    </td>
                    <td className="actions-cell">
                      {editId === v.id ? (
                        <div className="edit-actions">
                          <PrimaryButton onClick={handleUpdate} className="save-btn">
                            Save
                          </PrimaryButton>
                          <SecondaryButton onClick={() => setEditId(null)} className="cancel-btn">
                            Cancel
                          </SecondaryButton>
                        </div>
                      ) : (
                        <>
                          <SecondaryButton onClick={() => startEdit(v)} className="edit-btn">
                            Edit
                          </SecondaryButton>
                          <button 
                            onClick={() => handleDelete(v.id)} 
                            className="delete-btn"
                            title="Delete"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Emissions Summary Footer */}
      <Card className="summary-footer">
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Total Distance</span>
            <span className="summary-value">{totalKm.toLocaleString()} km</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Fuel</span>
            <span className="summary-value">{totalLitres.toLocaleString()} L</span>
          </div>
          <div className="summary-item highlight">
            <span className="summary-label">Estimated CO₂e</span>
            <span className="summary-value emission">
              {estimatedCO2.toFixed(2)} tCO₂e
            </span>
          </div>
        </div>
        <div className="footer-note">
          <p>🌱 Based on Region-specific emission factors</p>
        </div>
      </Card>

      <style jsx>{`
        .vehicle-table-container {
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

        /* Search Bar - Reference Style */
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
          color: #9CA3AF;
        }

        .search-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 15px;
          background: transparent;
        }

        .filter-badge {
          padding: 8px 20px;
          background: #2E7D32;
          color: white;
          border-radius: 30px;
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
        }

        /* Add Vehicle Card */
        .add-vehicle-card {
          margin-bottom: 24px;
          border: 1px solid rgba(46, 125, 50, 0.2);
          border-radius: 20px;
          overflow: hidden;
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

        .add-vehicle-form {
          padding: 24px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .form-select {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          background: white;
          transition: all 0.2s ease;
          outline: none;
          color: #1F2937;
        }

        .form-select:focus {
          border-color: #2E7D32;
          box-shadow: 0 0 0 4px rgba(46, 125, 50, 0.15);
        }

        /* Clean Input Style (Matching Search Bar) */
        .input-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          transition: all 0.2s ease;
        }

        .input-wrapper:focus-within {
          border-color: #2E7D32;
          box-shadow: 0 0 0 4px rgba(46, 125, 50, 0.15);
        }

        .input-icon {
          color: #9CA3AF;
          font-size: 16px;
        }

        .clean-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 14px;
          background: transparent;
          color: #1F2937;
        }

        .clean-input::placeholder {
          color: #9CA3AF;
        }

        .clean-input[type="number"] {
          -moz-appearance: textfield;
        }

        .clean-input[type="number"]::-webkit-outer-spin-button,
        .clean-input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        /* Edit Mode Inputs */
        .edit-input-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: white;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          transition: all 0.2s ease;
          width: 140px;
        }

        .edit-input-wrapper:focus-within {
          border-color: #2E7D32;
          box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.15);
        }

        .edit-input-icon {
          color: #9CA3AF;
          font-size: 14px;
        }

        .edit-input-field {
          flex: 1;
          border: none;
          outline: none;
          font-size: 13px;
          background: transparent;
          color: #1F2937;
          width: 100px;
        }

        .add-btn {
          width: 100%;
          padding: 14px !important;
          font-size: 16px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          border-radius: 12px !important;
        }

        /* Table Card */
        .table-card {
          margin-bottom: 24px;
          overflow: hidden;
          border: 1px solid rgba(46, 125, 50, 0.2);
          border-radius: 20px;
        }

        .table-wrapper {
          overflow-x: auto;
          max-width: 100%;
        }

        .vehicles-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 8px;
          padding: 8px;
        }

        .vehicles-table th {
          text-align: left;
          padding: 16px 20px;
          background: #f8faf8;
          font-size: 13px;
          font-weight: 600;
          color: #4B5563;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .vehicles-table td {
          padding: 16px 20px;
          background: white;
          border-bottom: 1px solid #f0f0f0;
        }

        .vehicle-row {
          transition: all 0.2s ease;
        }

        .vehicle-row:hover {
          background: #f8faf8;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .vehicle-badge {
          display: inline-block;
          padding: 4px 12px;
          background: #f0f9f0;
          color: #2E7D32;
          border-radius: 30px;
          font-size: 13px;
          font-weight: 500;
        }

        .fuel-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 30px;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid;
        }

        .registration-text {
          font-family: monospace;
          font-weight: 500;
          color: #4B5563;
        }

        .number-cell {
          font-family: 'Inter', monospace;
          font-weight: 500;
          color: #1F2937;
        }

        .actions-cell {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .edit-actions {
          display: flex;
          gap: 8px;
          width: 100%;
        }

        .edit-select {
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          width: 140px;
          font-size: 13px;
          background: white;
        }

        .edit-btn, .save-btn, .cancel-btn {
          padding: 6px 16px !important;
          font-size: 13px !important;
          border-radius: 30px !important;
        }

        .delete-btn {
          padding: 8px;
          background: white;
          border: 1px solid #fee2e2;
          border-radius: 8px;
          color: #ef4444;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
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
          border-radius: 20px;
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
          .vehicle-table-container {
            padding: 12px;
          }

          .section-description {
            flex-direction: column;
            align-items: flex-start;
          }

          .form-grid {
            grid-template-columns: 1fr;
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

          .edit-actions {
            flex-direction: column;
          }
        }

        @media (max-width: 480px) {
          .search-filter-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-badge {
            align-self: flex-start;
          }
        }
      `}</style>
    </div>
  );
}