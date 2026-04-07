// src/components/scope1/StationaryForm.jsx
import React, { useState } from "react";
import { emissionsAPI } from "../../services/api";
import { useEmissionStore } from "../../store/emissionStore";
import { FiTrash2, FiBriefcase, FiDroplet } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";

const EQUIPMENT_TYPES = [
  "Generators", "Stove", "Heater", "Oven", "Boiler",
  "Chimney", "Combustion turbine", "Compressor", "Dryer", "Other",
];

const FUEL_TYPES = [
  { label: "Biodiesel",       unit: "litres",  key: "biodiesel" },
  { label: "Bioethanol",      unit: "litres",  key: "bioethanol" },
  { label: "Biogas",          unit: "tons",    key: "biogas" },
  { label: "Diesel",          unit: "litres",  key: "diesel" },
  { label: "CNG",             unit: "litres",  key: "cng" },
  { label: "Domestic Coal",   unit: "tons",    key: "coal" },
  { label: "Heating Oil",     unit: "litres",  key: "heavy_fuel_oil" },
  { label: "Industrial Coal", unit: "tons",    key: "coal" },
  { label: "LPG",             unit: "litres",  key: "lpg" },
  { label: "Petrol",          unit: "litres",  key: "petrol" },
  { label: "Wood Pellets",    unit: "tons",    key: "wood_pellets" },
  { label: "Kerosene",        unit: "tons",    key: "kerosene" },
  { label: "Natural Gas",     unit: "kWh",     key: "natural_gas" },
];

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

export default function StationaryForm({ onSubmitSuccess }) {
  const entries        = useEmissionStore((s) => s.scope1Stationary);
  const addStationary  = useEmissionStore((s) => s.addScope1Stationary);
  const deleteStationary = useEmissionStore((s) => s.deleteScope1Stationary);
  const selectedYear  = useEmissionStore((s) => s.selectedYear);
  const token = useAuthStore((s) => s.token);

  const handleDeleteStationary = async (id, month) => {
    const deleted = entries.find((e) => e.id === id);
    if (!deleted) return;

    const [year] = month ? month.split("-").map(Number) : [selectedYear];

    try {
      await emissionsAPI.deleteScope1Entry(token, {
        year,
        month,
        category: "stationary",
        entry: {
          fuelType: deleted.fuelType,
          consumption: Number(deleted.consumption || 0),
        },
      });
      deleteStationary(id);
    } catch (error) {
      console.error("Failed to delete stationary entry:", error);
    }
  };

  const [equipment, setEquipment] = useState("");
  const [fuelKey, setFuelKey]     = useState("");
  const [quantity, setQuantity]   = useState("");
  const [month, setMonth]         = useState(currentMonth());

  const selectedFuel = FUEL_TYPES.find((f) => f.key === fuelKey);

  const handleAddRow = () => {
    if (!equipment || !fuelKey || quantity === "") return;
    addStationary({
      id: Date.now(),
      equipment,
      fuel: selectedFuel?.label || fuelKey,
      fuelType: fuelKey,
      consumption: Number(quantity),
      unit: selectedFuel?.unit || "",
      month,
    });
    setEquipment("");
    setFuelKey("");
    setQuantity("");
    setMonth(currentMonth());
  };

  return (
    <div className="sf-wrap">
      <div className="sf-desc-header">
        <FiBriefcase className="sf-header-icon" />
        <p className="sf-desc">
          Enter fuel consumption for <strong>fixed equipment</strong> at your facilities — generators, boilers, heaters, and other stationary sources.
        </p>
      </div>

      <div className="sf-table-wrap">
        <table className="sf-table">
          <thead>
            <tr>
              <th>Equipment</th>
              <th>Fuel Type</th>
              <th>Quantity</th>
              <th>Month</th>
              <th></th>
              </tr>
            </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="sf-empty">
                  No entries yet. Add a row below.
                </td>
              </tr>
            )}
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{e.equipment}</td>
                <td>{e.fuel}</td>
                <td>
                  <span className="sf-qty">{e.consumption.toLocaleString()}</span>
                  <span className="sf-unit"> {e.unit}</span>
                </td>
                <td>{e.month || "—"}</td>
                <td>
                  <button
                    className="sf-delete"
                    onClick={() => handleDeleteStationary(e.id, e.month)}
                    title="Remove"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}

            <tr className="sf-add-row">
              <td>
                <select
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  className="sf-select"
                >
                  <option value="">Equipment Type</option>
                  {EQUIPMENT_TYPES.map((et) => (
                    <option key={et} value={et}>{et}</option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  value={fuelKey}
                  onChange={(e) => setFuelKey(e.target.value)}
                  className="sf-select"
                >
                  <option value="">Fuel Type</option>
                  {FUEL_TYPES.map((f) => (
                    <option key={f.key + f.label} value={f.key}>{f.label}</option>
                  ))}
                </select>
              </td>
              <td>
                <div className="sf-qty-input">
                  <input
                    type="number"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="sf-input"
                    min="0"
                  />
                  <span className="sf-unit-tag">
                    {selectedFuel ? selectedFuel.unit : "—"}
                  </span>
                </div>
              </td>
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
                <button className="sf-add-btn-inline" onClick={handleAddRow}>
                  + Add
                </button>
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>


      <style jsx>{`
        .sf-wrap { width: 100%; }

        .sf-desc-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        .sf-header-icon {
          font-size: 20px;
          color: #2E7D64;
        }

        .sf-desc {
          font-size: 13px;
          color: #6B7280;
          margin: 0;
        }
        .sf-desc strong { color: #1B4D3E; }

        .sf-table-wrap {
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          overflow: hidden;
        }

        .sf-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .sf-table thead tr { background: #F9FAFB; }

        .sf-table th {
          text-align: left;
          padding: 11px 14px;
          font-size: 12px;
          font-weight: 600;
          color: #6B7280;
          border-bottom: 1px solid #E5E7EB;
        }

        .sf-table td {
          padding: 11px 14px;
          color: #111827;
          border-bottom: 1px solid #F3F4F6;
          vertical-align: middle;
        }

        .sf-table tbody tr:last-child td { border-bottom: none; }

        .sf-empty {
          text-align: center;
          color: #9CA3AF;
          font-size: 13px;
          padding: 28px 0 !important;
        }

        .sf-qty { font-weight: 500; }
        .sf-unit { font-size: 12px; color: #6B7280; }

        .sf-delete {
          background: none;
          border: none;
          color: #9CA3AF;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
        }
        .sf-delete:hover { color: #DC2626; background: #FEF2F2; }

        .sf-add-row td { background: #FAFAFA; border-top: 1px solid #E5E7EB; }

        .sf-select {
          width: 100%;
          padding: 7px 10px;
          border: 1px solid #E5E7EB;
          border-radius: 7px;
          font-size: 13px;
          background: white;
          color: #374151;
          outline: none;
        }
        .sf-select:focus { border-color: #2E7D64; }

        .sf-qty-input {
          display: flex;
          align-items: center;
          border: 1px solid #E5E7EB;
          border-radius: 7px;
          background: white;
          overflow: hidden;
        }
        .sf-qty-input:focus-within { border-color: #2E7D64; }

        .sf-input {
          flex: 1;
          border: none;
          outline: none;
          padding: 7px 10px;
          font-size: 13px;
          background: transparent;
          min-width: 60px;
        }

        .sf-unit-tag {
          padding: 0 10px;
          font-size: 12px;
          color: #6B7280;
          background: #F3F4F6;
          border-left: 1px solid #E5E7EB;
          display: flex;
          align-items: center;
          min-height: 33px;
          white-space: nowrap;
        }

        .sf-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0 0 0;
          margin-top: 16px;
        }

        .sf-footer { display: flex; justify-content: flex-end; padding: 16px 0 0 0; margin-top: 16px; }
        .sf-footer-right { display: flex; align-items: center; gap: 12px; }
        .sf-add-btn-inline {
          padding: 7px 14px; background: #1B4D3E; color: white;
          border: none; border-radius: 7px; font-size: 13px;
          font-weight: 500; cursor: pointer; white-space: nowrap; transition: background 0.15s;
        }
        .sf-add-btn-inline:hover { background: #2E7D64; }

        .sf-error { font-size: 13px; color: #DC2626; }

        .sf-submit-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #1B4D3E;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .sf-submit-btn:hover:not(:disabled) { background: #2E7D64; }
        .sf-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .sf-submit-btn.submitted { background: #059669; }

        @media (max-width: 640px) {
          .sf-table th:nth-child(4),
          .sf-table td:nth-child(4) { display: none; }
        }
      `}</style>
    </div>
  );
}