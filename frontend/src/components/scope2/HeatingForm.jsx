// src/components/scope2/HeatingForm.jsx
import React, { useState, useEffect } from "react";
import { useCompanyStore } from "../../store/companyStore";
import { FiTrash2, FiThermometer, FiEdit2, FiSave, FiX } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";
import { useEmissionStore } from "../../store/emissionStore";

// Get default heating type based on company country
const getDefaultHeatingType = (country) => {
  const countryLower = country?.toLowerCase() || "";
  
  if (countryLower === "uae" || countryLower === "united arab emirates") {
    return "uae_average";
  }
  if (countryLower === "singapore") {
    return "sg_average";
  }
  if (countryLower === "saudi arabia" || countryLower === "ksa") {
    return "sa_average";
  }
  return "steam_hot_water";
};

// Get heating options based on region
const getHeatingOptions = (country) => {
  const baseOptions = [
    { label: "Steam / Hot Water", key: "steam_hot_water" },
    { label: "District Cooling", key: "district_cooling" },
  ];
  
  const countryLower = country?.toLowerCase() || "uae";
  
  switch (countryLower) {
    case 'uae':
    case 'united arab emirates':
      return [...baseOptions, { label: "UAE Average", key: "uae_average" }];
    case 'singapore':
      return [...baseOptions, { label: "Singapore Average", key: "sg_average" }];
    case 'saudi arabia':
    case 'ksa':
      return baseOptions;
    default:
      return baseOptions;
  }
};

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

export default function HeatingForm({ entries, onAdd, onDelete, onUpdate }) {
  const token = useAuthStore((s) => s.token);
  const { company } = useCompanyStore();
  const primaryLocation = company?.locations?.find(loc => loc.isPrimary) || company?.locations?.[0];
  const country = primaryLocation?.country || "uae";
  
  const heatingOptions = getHeatingOptions(country);
  const defaultType = getDefaultHeatingType(country);
  
  const [energyType, setEnergyType] = useState(defaultType);
  const [consumption, setConsumption] = useState("");
  const [month, setMonth] = useState(currentMonth());
  const [isLoading, setIsLoading] = useState(false);
  
  // Edit mode state
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({
    energyType: "",
    consumption: "",
    month: "",
  });
  
  // Reset default when country changes
  useEffect(() => {
    setEnergyType(getDefaultHeatingType(country));
  }, [country]);

  // Delete handler with confirmation
  const handleDelete = async (id, entryMonth, entryEnergyType, entryConsumption) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    
    setIsLoading(true);
    try {
      const [year] = entryMonth ? entryMonth.split("-") : [new Date().getFullYear()];
      await onDelete(id, {
        year: parseInt(year),
        month: entryMonth,
        category: "heating",
        entry: {
          energyType: entryEnergyType,
          consumptionKwh: Number(entryConsumption),
        },
      });
    } catch (error) {
      console.error("Failed to delete heating entry:", error);
      alert("Failed to delete. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Edit handlers
  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditValues({
      energyType: entry.energyType,
      consumption: entry.consumption,
      month: entry.month || currentMonth(),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({
      energyType: "",
      consumption: "",
      month: "",
    });
  };

  const saveEdit = async () => {
    if (!editValues.energyType || !editValues.consumption || editValues.consumption <= 0) {
      alert("Please fill all fields");
      return;
    }

    const updatedEntry = {
      id: editingId,
      energyType: editValues.energyType,
      energyTypeLabel: heatingOptions.find(opt => opt.key === editValues.energyType)?.label,
      consumption: Number(editValues.consumption),
      month: editValues.month,
    };

    if (onUpdate) {
      onUpdate(updatedEntry);
    }
    
    setEditingId(null);
    setEditValues({
      energyType: "",
      consumption: "",
      month: "",
    });
  };

  // Add new entry handler
  const handleAddRow = async () => {
    if (!energyType || !consumption || Number(consumption) <= 0) {
      alert("Please fill in all fields");
      return;
    }
    
    // Check for duplicate
    const isDuplicate = entries.some(e => 
      e.energyType === energyType && 
      e.consumption === Number(consumption) &&
      e.month === month
    );
    
    if (isDuplicate) {
      alert("This entry already exists for this month");
      return;
    }
    
    const newEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      energyType,
      energyTypeLabel: heatingOptions.find(opt => opt.key === energyType)?.label,
      consumption: Number(consumption),
      month,
    };
    
    onAdd(newEntry);
    
    setConsumption("");
    setMonth(currentMonth());
  };

  return (
    <div className="ht-wrap">
      <div className="ht-desc-header">
        <FiThermometer className="ht-header-icon" />
        <p className="ht-desc">
          Enter <strong>purchased heating and cooling consumption</strong>.
        </p>
      </div>

      <div className="ht-table-wrap">
        <table className="ht-table">
          <thead>
            <tr>
              <th>Energy Type</th>
              <th>Consumption (kWh)</th>
              <th>Month</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(!entries || entries.length === 0) && (
              <tr>
                <td colSpan={4} className="ht-empty">
                  No entries yet. Add a row below.
                </td>
              </tr>
            )}
            
            {entries && entries.map((entry) => {
              // Edit mode
              if (editingId === entry.id) {
                return (
                  <tr key={entry.id} className="ht-editing-row">
                    <td className="ht-energy-cell">
                      <select
                        value={editValues.energyType}
                        onChange={(e) => setEditValues({...editValues, energyType: e.target.value})}
                        className="ht-select"
                      >
                        {heatingOptions.map((opt) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="ht-consumption-cell">
                      <div className="ht-qty-input" style={{ width: "120px" }}>
                        <input
                          type="number"
                          value={editValues.consumption}
                          onChange={(e) => setEditValues({...editValues, consumption: e.target.value})}
                          className="ht-input"
                          min="0"
                          step="any"
                          style={{ width: "80px" }}
                        />
                        <span className="ht-unit-tag">kWh</span>
                      </div>
                    </td>
                    <td className="ht-month-cell">
                      <select
                        value={editValues.month}
                        onChange={(e) => setEditValues({...editValues, month: e.target.value})}
                        className="ht-select"
                      >
                        {MONTHS.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </td>
                    <td className="ht-actions-cell">
                      <button
                        onClick={saveEdit}
                        className="ht-save-btn"
                        title="Save"
                      >
                        <FiSave size={14} /> Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="ht-cancel-btn"
                        title="Cancel"
                      >
                        <FiX size={14} /> Cancel
                      </button>
                    </td>
                  </tr>
                );
              }
              
              // Read mode
              return (
                <tr key={entry.id}>
                  <td>
                    <span className="ht-badge">{entry.energyTypeLabel || entry.energyType}</span>
                  </td>
                  <td>
                    <span className="ht-qty">{entry.consumption?.toLocaleString()}</span>
                    <span className="ht-unit"> kWh</span>
                  </td>
                  <td>{entry.month || "—"}</td>
                  <td>
                    <button
                      className="ht-edit"
                      onClick={() => startEdit(entry)}
                      title="Edit"
                    >
                      <FiEdit2 size={14} />
                    </button>
                    <button
                      className="ht-delete"
                      onClick={() => handleDelete(entry.id, entry.month, entry.energyType, entry.consumption)}
                      disabled={isLoading}
                      title="Delete"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* Add Row */}
            <tr className="ht-add-row">
              <td>
                <select
                  value={energyType}
                  onChange={(e) => setEnergyType(e.target.value)}
                  className="ht-select"
                >
                  {heatingOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <div className="ht-qty-input">
                  <input
                    type="number"
                    placeholder="0"
                    value={consumption}
                    onChange={(e) => setConsumption(e.target.value)}
                    className="ht-input"
                    min="0"
                    step="any"
                  />
                  <span className="ht-unit-tag">kWh</span>
                </div>
              </td>
              <td>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="ht-select"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </td>
              <td>
                <button className="ht-add-btn-inline" onClick={handleAddRow}>
                  + Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .ht-wrap { width: 100%; }

        .ht-desc-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        .ht-header-icon {
          font-size: 20px;
          color: #2E7D64;
        }

        .ht-desc {
          font-size: 13px;
          color: #6B7280;
          margin: 0;
        }
        .ht-desc strong { color: #1B4D3E; }

        .ht-table-wrap {
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          overflow-x: auto;
        }

        .ht-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
          min-width: 500px;
        }

        .ht-table thead tr { background: #F9FAFB; }

        .ht-table th {
          text-align: left;
          padding: 12px 14px;
          font-size: 12px;
          font-weight: 600;
          color: #6B7280;
          border-bottom: 1px solid #E5E7EB;
        }

        .ht-table td {
          padding: 12px 14px;
          color: #111827;
          border-bottom: 1px solid #F3F4F6;
          vertical-align: middle;
        }

        .ht-table tbody tr:last-child td { border-bottom: none; }

        .ht-empty {
          text-align: center;
          color: #9CA3AF;
          font-size: 13px;
          padding: 40px 0 !important;
        }

        .ht-qty { font-weight: 500; }
        .ht-unit { font-size: 12px; color: #6B7280; margin-left: 4px; }

        .ht-badge {
          display: inline-block;
          padding: 4px 10px;
          background: #F3F4F6;
          border-radius: 20px;
          font-size: 12px;
          color: #374151;
        }

        .ht-edit, .ht-delete {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          margin-right: 6px;
        }
        .ht-edit { color: #2E7D64; }
        .ht-edit:hover { background: #E8F5F0; }
        .ht-delete { color: #9CA3AF; }
        .ht-delete:hover { color: #DC2626; background: #FEF2F2; }
        .ht-delete:disabled { opacity: 0.5; cursor: not-allowed; }

        .ht-save-btn, .ht-cancel-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          margin-right: 6px;
        }
        .ht-save-btn { background: #2E7D64; color: white; }
        .ht-save-btn:hover { background: #1B4D3E; }
        .ht-cancel-btn { background: #F3F4F6; color: #6B7280; }
        .ht-cancel-btn:hover { background: #E5E7EB; }

        .ht-add-row td { background: #FAFAFA; border-top: 1px solid #E5E7EB; }

        .ht-select {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid #E5E7EB;
          border-radius: 7px;
          font-size: 13px;
          background: white;
          color: #374151;
          outline: none;
        }
        .ht-select:focus { border-color: #2E7D64; }

        .ht-qty-input {
          display: flex;
          align-items: center;
          border: 1px solid #E5E7EB;
          border-radius: 7px;
          background: white;
          overflow: hidden;
        }
        .ht-qty-input:focus-within { border-color: #2E7D64; }

        .ht-input {
          flex: 1;
          border: none;
          outline: none;
          padding: 8px 10px;
          font-size: 13px;
          background: transparent;
          min-width: 60px;
        }

        .ht-unit-tag {
          padding: 0 12px;
          font-size: 12px;
          color: #6B7280;
          background: #F3F4F6;
          border-left: 1px solid #E5E7EB;
          display: flex;
          align-items: center;
          min-height: 35px;
          white-space: nowrap;
        }

        .ht-add-btn-inline {
          padding: 8px 16px;
          background: #1B4D3E;
          color: white;
          border: none;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s;
        }
        .ht-add-btn-inline:hover { background: #2E7D64; }

        @media (max-width: 640px) {
          .ht-table th:nth-child(2),
          .ht-table td:nth-child(2) { display: none; }
        }
      `}</style>
    </div>
  );
}