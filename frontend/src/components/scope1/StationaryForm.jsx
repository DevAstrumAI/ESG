// src/components/scope1/StationaryForm.jsx
import React, { useState } from "react";
import { emissionsAPI } from "../../services/api";
import { useEmissionStore } from "../../store/emissionStore";
import { FiTrash2, FiPlus, FiEdit2, FiSave, FiX } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";

const STATIONARY_FUEL_META = {
  biodiesel: { label: "Biodiesel", unit: "litres" },
  bioethanol: { label: "Bioethanol", unit: "litres" },
  biogas: { label: "Biogas", unit: "tons" },
  diesel: { label: "Diesel", unit: "litres" },
  cng: { label: "CNG", unit: "litres" },
  coal: { label: "Coal", unit: "tons" },
  heavy_fuel_oil: { label: "Heating Oil", unit: "litres" },
  lpg: { label: "LPG", unit: "litres" },
  petrol: { label: "Petrol", unit: "litres" },
  wood_pellets: { label: "Wood Pellets", unit: "tons" },
  kerosene: { label: "Kerosene", unit: "tons" },
  natural_gas: { label: "Natural Gas", unit: "kWh" },
};

const FUEL_OPTIONS = Object.entries(STATIONARY_FUEL_META).map(([key, meta]) => ({
  value: key,
  label: meta.label,
  unit: meta.unit,
}));

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

export default function StationaryForm() {
  const stationary = useEmissionStore((s) => s.scope1Stationary);
  const addStationary = useEmissionStore((s) => s.addScope1Stationary);
  const deleteStationary = useEmissionStore((s) => s.deleteScope1Stationary);
  const updateStationary = useEmissionStore((s) => s.updateScope1Stationary);
  const token = useAuthStore((s) => s.token);

  // Form state
  const [fuelType, setFuelType] = useState("");
  const [consumption, setConsumption] = useState("");
  const [month, setMonth] = useState(currentMonth());

  // Edit mode state
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({
    fuelType: "",
    consumption: "",
    month: "",
  });

  const handleAdd = () => {
    if (!fuelType || !consumption || consumption <= 0) {
      alert("Please fill all fields");
      return;
    }

    const meta = STATIONARY_FUEL_META[fuelType];
    addStationary({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fuelType: fuelType,
      fuel: meta.label,
      consumption: parseFloat(consumption),
      unit: meta.unit,
      month: month,
    });

    setFuelType("");
    setConsumption("");
    setMonth(currentMonth());
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete ${entry.fuel} - ${entry.consumption} ${entry.unit}?`)) return;

    const [year, monthNum] = entry.month.split("-");
    
    const backendEntry = {
      fuelType: entry.fuelType,
      consumption: entry.consumption,
    };

    try {
      await emissionsAPI.deleteScope1Entry(token, {
        year: parseInt(year),
        month: entry.month,
        category: "stationary",
        entry: backendEntry,
      });
      
      deleteStationary(entry.id);
      console.log("Delete successful");
      
    } catch (error) {
      console.error("Failed to delete stationary entry:", error);
      alert(`Failed to delete: ${error.message || "Unknown error"}`);
    }
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditValues({
      fuelType: entry.fuelType,
      consumption: entry.consumption,
      month: entry.month,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({
      fuelType: "",
      consumption: "",
      month: "",
    });
  };

  const saveEdit = async () => {
    if (!editValues.fuelType || !editValues.consumption) {
      alert("Please fill all fields");
      return;
    }

    const meta = STATIONARY_FUEL_META[editValues.fuelType];
    const updatedEntry = {
      id: editingId,
      fuelType: editValues.fuelType,
      fuel: meta.label,
      consumption: parseFloat(editValues.consumption),
      unit: meta.unit,
      month: editValues.month,
    };

    // Get old entry for backend sync
    const oldEntry = stationary.find(e => e.id === editingId);
    
    if (oldEntry && token) {
      const [year] = editValues.month.split("-");
      
      const oldBackendEntry = {
        fuelType: oldEntry.fuelType,
        consumption: oldEntry.consumption,
      };
      
      const newBackendEntry = {
        fuelType: editValues.fuelType,
        consumption: parseFloat(editValues.consumption),
      };
      
      try {
        // Delete old entry
        await emissionsAPI.deleteScope1Entry(token, {
          year: parseInt(year),
          month: editValues.month,
          category: "stationary",
          entry: oldBackendEntry,
        });
        
        // Add new entry via save endpoint
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
            mobile: [],
            stationary: [newBackendEntry],
            refrigerants: [],
            fugitive: [],
          }),
        });
        
        // Update local state
        updateStationary(updatedEntry);
        
      } catch (error) {
        console.error("Failed to sync edit with backend:", error);
        alert("Failed to save changes");
        return;
      }
    } else {
      updateStationary(updatedEntry);
    }

    setEditingId(null);
    setEditValues({
      fuelType: "",
      consumption: "",
      month: "",
    });
  };

  const getUnitForFuel = (fuelType) => {
    return STATIONARY_FUEL_META[fuelType]?.unit || "";
  };

  return (
    <div className="sf-wrap">
      <div className="sf-table-wrap">
        <table className="sf-table">
          <thead>
            <tr>
              <th>Fuel Type</th>
              <th>Consumption</th>
              <th>Unit</th>
              <th>Month</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stationary.length === 0 && (
              <tr>
                <td colSpan={5} className="sf-empty">
                  No stationary entries yet. Fill the row below and click + Add.
                </td>
              </tr>
            )}

            {stationary.map((entry) => {
              if (editingId === entry.id) {
                return (
                  <tr key={entry.id} className="sf-editing-row">
                    <td>
                      <select
                        value={editValues.fuelType}
                        onChange={(e) => setEditValues({...editValues, fuelType: e.target.value})}
                        className="sf-select"
                      >
                        {FUEL_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={editValues.consumption}
                        onChange={(e) => setEditValues({...editValues, consumption: e.target.value})}
                        className="sf-input"
                        min="0"
                        step="any"
                      />
                    </td>
                    <td>{getUnitForFuel(editValues.fuelType)}</td>
                    <td>
                      <select
                        value={editValues.month}
                        onChange={(e) => setEditValues({...editValues, month: e.target.value})}
                        className="sf-select"
                      >
                        {MONTHS.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button onClick={saveEdit} className="sf-save-btn"><FiSave /> Save</button>
                      <button onClick={cancelEdit} className="sf-cancel-btn"><FiX /> Cancel</button>
                    </td>
                  </tr>
                );
              }
              
              return (
                <tr key={entry.id}>
                  <td>{entry.fuel}</td>
                  <td>{entry.consumption}</td>
                  <td>{entry.unit}</td>
                  <td>{entry.month}</td>
                  <td>
                    <button onClick={() => startEdit(entry)} className="sf-edit"><FiEdit2 /></button>
                    <button onClick={() => handleDelete(entry)} className="sf-delete"><FiTrash2 /></button>
                  </td>
                </tr>
              );
            })}

            {/* Add Row */}
            <tr className="sf-add-row">
              <td>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  className="sf-select"
                >
                  <option value="">Select Fuel</option>
                  {FUEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="number"
                  placeholder="0"
                  value={consumption}
                  onChange={(e) => setConsumption(e.target.value)}
                  className="sf-input"
                  min="0"
                  step="any"
                />
              </td>
              <td>{getUnitForFuel(fuelType)}</td>
              <td>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="sf-select"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </td>
              <td>
                <button className="sf-add-btn" onClick={handleAdd}>
                  <FiPlus /> Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .sf-wrap { width: 100%; }
        .sf-table-wrap { border: 1px solid #E5E7EB; border-radius: 10px; overflow-x: auto; }
        .sf-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 600px; }
        .sf-table thead tr { background: #F9FAFB; }
        .sf-table th { text-align: left; padding: 12px 14px; font-size: 12px; font-weight: 600; color: #6B7280; border-bottom: 1px solid #E5E7EB; }
        .sf-table td { padding: 12px 14px; color: #111827; border-bottom: 1px solid #F3F4F6; }
        .sf-empty { text-align: center; color: #9CA3AF; padding: 40px 0 !important; }
        .sf-edit, .sf-delete { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 4px; margin-right: 6px; }
        .sf-edit { color: #2E7D64; }
        .sf-delete { color: #9CA3AF; }
        .sf-delete:hover { color: #DC2626; background: #FEF2F2; }
        .sf-select, .sf-input { width: 100%; padding: 8px 10px; border: 1px solid #E5E7EB; border-radius: 7px; font-size: 13px; }
        .sf-add-row td { background: #FAFAFA; border-top: 1px solid #E5E7EB; }
        .sf-add-btn { padding: 8px 16px; background: #1B4D3E; color: white; border: none; border-radius: 7px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .sf-save-btn, .sf-cancel-btn { padding: 6px 10px; border-radius: 4px; margin-right: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
        .sf-save-btn { background: #2E7D64; color: white; border: none; }
        .sf-cancel-btn { background: #F3F4F6; color: #6B7280; border: none; }
      `}</style>
    </div>
  );
}