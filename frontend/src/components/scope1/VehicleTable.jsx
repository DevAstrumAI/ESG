// src/components/scope1/VehicleTable.jsx
import React, { useState } from "react";
import { emissionsAPI } from "../../services/api";
import { useEmissionStore } from "../../store/emissionStore";
import { FiTrash2, FiTruck, FiEdit2, FiSave, FiX } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";

const DISTANCE_BASED_TYPES = new Set([
  "jet_aircraft_per_km",
  "cargo_ship_hfo",
  "marine_hfo",
  "diesel_train",
  "diesel_bus",
]);

function mapVehicleFuelType(vehicleType, fuelTypeUI) {
  const type = (vehicleType || "").toLowerCase();
  const fuel = (fuelTypeUI || "").toLowerCase();
  if (type === "car"        && fuel === "petrol")  return "petrol_car";
  if (type === "car"        && fuel === "diesel")  return "diesel_car";
  if (type === "truck"      && fuel === "diesel")  return "diesel_truck";
  if (type === "bus"        && fuel === "diesel")  return "diesel_bus";
  if (type === "motorcycle" && fuel === "petrol")  return "petrol_motorcycle";
  if (type === "motorcycle")                        return "motorcycle";
  if (type === "motorboat")                         return "motorboat_gasoline";
  if (type === "cargo van"  && fuel === "diesel")  return "diesel_van";
  if (type === "airplane")                          return "jet_aircraft_per_km";
  if (type === "ship")                              return "cargo_ship_hfo";
  if (type === "train"      && fuel === "diesel")  return "diesel_train";
  return fuel === "petrol" ? "petrol_car" : "diesel_car";
}

const VEHICLE_OPTIONS = [
  "Car", "Truck", "Bus", "Ship", "Airplane",
  "Train", "Cargo van", "Motorboat", "Motorcycle", "Other",
];
const FUEL_OPTIONS = ["Petrol", "Diesel", "LPG", "Biodiesel", "Other"];

const MONTHS = [
  "2026-01","2026-02","2026-03","2026-04","2026-05","2026-06",
  "2026-07","2026-08","2026-09","2026-10","2026-11","2026-12",
  "2025-01","2025-02","2025-03","2025-04","2025-05","2025-06",
  "2025-07","2025-08","2025-09","2025-10","2025-11","2025-12",
];

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function VehicleTable({ onSubmitSuccess }) {
  const vehicles      = useEmissionStore((s) => s.scope1Vehicles);
  const addVehicle    = useEmissionStore((s) => s.addScope1Vehicle);
  const updateVehicle = useEmissionStore((s) => s.updateScope1Vehicle);
  const deleteVehicle = useEmissionStore((s) => s.deleteScope1Vehicle);
  const token = useAuthStore((s) => s.token);

  // Edit mode state
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({
    vehicleType: "",
    fuelType: "",
    quantity: "",
    month: "",
    useDistance: false,
  });

  // Add new entry state
  const [vehicleType, setVehicleType] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [month, setMonth] = useState(currentMonth());

  // ✅ DELETE HANDLER - Properly defined inside component
  const handleDeleteVehicle = async (id, monthParam) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    
    const deleted = vehicles.find((v) => v.id === id);
    if (!deleted) return;

    const deleteMonth = monthParam || deleted.month;
    if (!deleteMonth) {
      console.error("No month specified for deletion");
      alert("Cannot delete: missing month information");
      return;
    }

    const [year, monthNum] = deleteMonth.split("-");
    if (!year || !monthNum) {
      console.error("Invalid month format:", deleteMonth);
      alert("Cannot delete: invalid month format");
      return;
    }

    const fuelTypeKey = mapVehicleFuelType(deleted.vehicleType, deleted.fuelType);
    const isDistance = DISTANCE_BASED_TYPES.has(fuelTypeKey);
    
    const entry = isDistance
      ? { fuelType: fuelTypeKey, distanceKm: Number(deleted.km || 0) }
      : { fuelType: fuelTypeKey, litresConsumed: Number(deleted.litres || 0) };

    try {
      console.log("Deleting entry:", { year: parseInt(year), month: deleteMonth, entry });
      
      await emissionsAPI.deleteScope1Entry(token, {
        year: parseInt(year),
        month: deleteMonth,
        category: "mobile",
        entry,
      });
      
      // Only delete from store AFTER successful API call
      deleteVehicle(id);
      console.log("Delete successful");
      
    } catch (error) {
      console.error("Failed to delete vehicle entry:", error);
      alert(`Failed to delete: ${error.message || "Unknown error"}`);
    }
  };

  // Edit handlers
  const startEdit = (vehicle) => {
    const isDistRow = DISTANCE_BASED_TYPES.has(mapVehicleFuelType(vehicle.vehicleType, vehicle.fuelType));
    const qty = isDistRow ? vehicle.km : vehicle.litres;
    
    setEditingId(vehicle.id);
    setEditValues({
      vehicleType: vehicle.vehicleType,
      fuelType: vehicle.fuelType,
      quantity: qty,
      month: vehicle.month || currentMonth(),
      useDistance: isDistRow,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({
      vehicleType: "",
      fuelType: "",
      quantity: "",
      month: "",
      useDistance: false,
    });
  };

  const saveEdit = async () => {
    if (!editValues.vehicleType || !editValues.fuelType || !editValues.quantity) {
      alert("Please fill all fields");
      return;
    }

    const updatedVehicle = {
      id: editingId,
      vehicleType: editValues.vehicleType,
      fuelType: editValues.fuelType,
      km: editValues.useDistance ? Number(editValues.quantity) : 0,
      litres: !editValues.useDistance ? Number(editValues.quantity) : 0,
      month: editValues.month,
    };

    updateVehicle(updatedVehicle);

    const oldVehicle = vehicles.find(v => v.id === editingId);
    if (oldVehicle && token) {
      const oldFuelType = mapVehicleFuelType(oldVehicle.vehicleType, oldVehicle.fuelType);
      const isOldDistRow = DISTANCE_BASED_TYPES.has(oldFuelType);
      const oldEntry = isOldDistRow
        ? { fuelType: oldFuelType, distanceKm: Number(oldVehicle.km || 0) }
        : { fuelType: oldFuelType, litresConsumed: Number(oldVehicle.litres || 0) };

      const [year] = editValues.month.split("-");

      try {
        await emissionsAPI.deleteScope1Entry(token, {
          year,
          month: editValues.month,
          category: "mobile",
          entry: oldEntry,
        });
        
        const newFuelType = mapVehicleFuelType(editValues.vehicleType, editValues.fuelType);
        const isNewDistRow = DISTANCE_BASED_TYPES.has(newFuelType);
        const newEntry = isNewDistRow
          ? { fuelType: newFuelType, distanceKm: Number(editValues.quantity) }
          : { fuelType: newFuelType, litresConsumed: Number(editValues.quantity) };
        
        const { useCompanyStore } = require('../../store/companyStore');
        const companyStore = useCompanyStore.getState();
        const primaryLocation = companyStore.company?.locations?.find((loc) => loc.isPrimary) ||
          companyStore.company?.locations?.[0];
        const country = primaryLocation?.country || 'uae';
        const city = (primaryLocation?.city || 'dubai').toLowerCase();
        
        await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8001'}/api/emissions/scope1`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            year: parseInt(year),
            month: editValues.month,
            country,
            city,
            mobile: [newEntry],
            stationary: [],
            refrigerants: [],
            fugitive: [],
          }),
        });
      } catch (error) {
        console.error("Failed to sync edit with backend:", error);
      }
    }

    setEditingId(null);
    setEditValues({
      vehicleType: "",
      fuelType: "",
      quantity: "",
      month: "",
      useDistance: false,
    });
  };

  // Add new entry handler
  const mappedFuelType = vehicleType && fuelType
    ? mapVehicleFuelType(vehicleType, fuelType)
    : "";
  const useDistance = DISTANCE_BASED_TYPES.has(mappedFuelType);

  const handleAddRow = () => {
    if (!vehicleType || !fuelType || !quantity || quantity <= 0) {
      alert("Please fill all fields");
      return;
    }
    
    const isDuplicate = vehicles.some(v => 
      v.vehicleType === vehicleType && 
      v.fuelType === fuelType && 
      ((useDistance ? v.km : v.litres) === Number(quantity)) &&
      v.month === month
    );
    
    if (isDuplicate) {
      alert("This entry already exists for this month");
      return;
    }
    
    addVehicle({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      vehicleType,
      fuelType,
      km: useDistance ? Number(quantity) : 0,
      litres: useDistance ? 0 : Number(quantity),
      month,
    });
    setVehicleType("");
    setFuelType("");
    setQuantity("");
    setMonth(currentMonth());
  };

  return (
    <div className="vt-wrap">
      <div className="vt-desc-header">
        <FiTruck className="vt-header-icon" />
        <p className="vt-desc">
          Road vehicles use <strong>litres consumed</strong>. Aviation, marine, and rail use <strong>distance (km)</strong>.
        </p>
      </div>

      <div className="vt-table-wrap">
        <table className="vt-table">
          <thead>
            <tr>
              <th>Vehicle Type</th>
              <th>Fuel Type</th>
              <th>Quantity</th>
              <th>Month</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={5} className="vt-empty">
                  No entries yet. Fill the row below and click + Add.
                </td>
              </tr>
            )}

            {vehicles.map((v) => {
              const ft = mapVehicleFuelType(v.vehicleType, v.fuelType);
              const isDistRow = DISTANCE_BASED_TYPES.has(ft);
              const qty = isDistRow ? v.km : v.litres;
              const unit = isDistRow ? "km" : "L";
              
              if (editingId === v.id) {
                const isEditingDistRow = editValues.useDistance;
                return (
                  <tr key={v.id} className="vt-editing-row">
                    <td>
                      <select
                        value={editValues.vehicleType}
                        onChange={(e) => setEditValues({...editValues, vehicleType: e.target.value})}
                        className="vt-select"
                      >
                        {VEHICLE_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={editValues.fuelType}
                        onChange={(e) => setEditValues({...editValues, fuelType: e.target.value})}
                        className="vt-select"
                      >
                        {FUEL_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                     <td>
                      <div className="vt-qty-input" style={{ width: "120px" }}>
                        <input
                          type="number"
                          value={editValues.quantity}
                          onChange={(e) => setEditValues({...editValues, quantity: e.target.value})}
                          className="vt-input"
                          min="0"
                          step="any"
                          style={{ width: "80px" }}
                        />
                        <span className="vt-unit-tag">{isEditingDistRow ? "km" : "L"}</span>
                      </div>
                    </td>
                     <td>
                      <select
                        value={editValues.month}
                        onChange={(e) => setEditValues({...editValues, month: e.target.value})}
                        className="vt-select"
                      >
                        {MONTHS.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </td>
                     <td>
                      <button onClick={saveEdit} className="vt-save-btn" title="Save">
                        <FiSave size={14} /> Save
                      </button>
                      <button onClick={cancelEdit} className="vt-cancel-btn" title="Cancel">
                        <FiX size={14} /> Cancel
                      </button>
                    </td>
                  </tr>
                );
              }
              
              return (
                <tr key={v.id}>
                  <td>{v.vehicleType}</td>
                  <td>{v.fuelType}</td>
                  <td>
                    <span className="vt-qty">{qty}</span>
                    <span className="vt-unit"> {unit}</span>
                  </td>
                  <td>{v.month || "—"}</td>
                  <td>
                    <button
                      className="vt-edit"
                      onClick={() => startEdit(v)}
                      title="Edit"
                    >
                      <FiEdit2 size={14} />
                    </button>
                    <button
                      className="vt-delete"
                      onClick={() => handleDeleteVehicle(v.id, v.month)}
                      title="Delete"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}

            <tr className="vt-add-row">
              <td>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="vt-select"
                >
                  <option value="">Vehicle Type</option>
                  {VEHICLE_OPTIONS.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  className="vt-select"
                >
                  <option value="">Fuel Type</option>
                  {FUEL_OPTIONS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </td>
              <td>
                <div className="vt-qty-input">
                  <input
                    type="number"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="vt-input"
                    min="0"
                    step="any"
                  />
                  <span className="vt-unit-tag">
                    {mappedFuelType ? (useDistance ? "km" : "L") : "—"}
                  </span>
                </div>
              </td>
              <td>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="vt-select"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </td>
              <td>
                <button className="vt-add-btn-inline" onClick={handleAddRow}>
                  + Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .vt-wrap { width: 100%; }
        .vt-desc-header { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; }
        .vt-header-icon { font-size: 18px; color: #2E7D64; }
        .vt-desc { font-size: 13px; color: #6B7280; margin: 0; }
        .vt-desc strong { color: #1B4D3E; }
        .vt-table-wrap { border: 1px solid #E5E7EB; border-radius: 10px; overflow-x: auto; }
        .vt-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 600px; }
        .vt-table thead tr { background: #F9FAFB; }
        .vt-table th { text-align: left; padding: 12px 14px; font-size: 12px; font-weight: 600; color: #6B7280; border-bottom: 1px solid #E5E7EB; }
        .vt-table td { padding: 12px 14px; color: #111827; border-bottom: 1px solid #F3F4F6; vertical-align: middle; }
        .vt-table tbody tr:last-child td { border-bottom: none; }
        .vt-empty { text-align: center; color: #9CA3AF; font-size: 13px; padding: 40px 0 !important; }
        .vt-qty { font-weight: 500; }
        .vt-unit { font-size: 12px; color: #6B7280; margin-left: 4px; }
        .vt-edit, .vt-delete { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 4px; display: inline-flex; align-items: center; margin-right: 6px; }
        .vt-edit { color: #2E7D64; }
        .vt-edit:hover { background: #E8F5F0; }
        .vt-delete { color: #9CA3AF; }
        .vt-delete:hover { color: #DC2626; background: #FEF2F2; }
        .vt-save-btn, .vt-cancel-btn { background: none; border: none; cursor: pointer; padding: 6px 10px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; font-size: 12px; margin-right: 6px; }
        .vt-save-btn { background: #2E7D64; color: white; }
        .vt-save-btn:hover { background: #1B4D3E; }
        .vt-cancel-btn { background: #F3F4F6; color: #6B7280; }
        .vt-cancel-btn:hover { background: #E5E7EB; }
        .vt-add-row td { background: #FAFAFA; border-top: 1px solid #E5E7EB; }
        .vt-select { width: 100%; padding: 8px 10px; border: 1px solid #E5E7EB; border-radius: 7px; font-size: 13px; background: white; color: #374151; outline: none; }
        .vt-select:focus { border-color: #2E7D64; }
        .vt-qty-input { display: flex; align-items: center; border: 1px solid #E5E7EB; border-radius: 7px; background: white; overflow: hidden; }
        .vt-qty-input:focus-within { border-color: #2E7D64; }
        .vt-input { flex: 1; border: none; outline: none; padding: 8px 10px; font-size: 13px; background: transparent; min-width: 60px; }
        .vt-unit-tag { padding: 0 12px; font-size: 12px; color: #6B7280; background: #F3F4F6; border-left: 1px solid #E5E7EB; display: flex; align-items: center; min-height: 35px; white-space: nowrap; }
        .vt-add-btn-inline { padding: 8px 16px; background: #1B4D3E; color: white; border: none; border-radius: 7px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: background 0.15s; }
        .vt-add-btn-inline:hover { background: #2E7D64; }
        @media (max-width: 640px) {
          .vt-table th:nth-child(4),
          .vt-table td:nth-child(4) { display: none; }
        }
      `}</style>
    </div>
  );
}