// src/components/scope2/HeatingForm.jsx
import React, { useState } from "react";
import { emissionsAPI } from "../../services/api";
import { useEmissionStore } from "../../store/emissionStore";
import { FiTrash2, FiThermometer } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";
import { useCompanyStore } from "../../store/companyStore";

// Get heating options based on company region
const getHeatingOptions = (country) => {
  const baseOptions = [
    { label: "Steam / Hot Water", key: "steam_hot_water" },
    { label: "District Cooling", key: "district_cooling" },
  ];
  
  const countryLower = country?.toLowerCase() || "uae";
  
  // Only add average option for regions that have it
  switch (countryLower) {
    case 'uae':
    case 'united arab emirates':
      return [...baseOptions, { label: "UAE Average", key: "uae_average" }];
    
    case 'singapore':
      return [...baseOptions, { label: "Singapore Average", key: "sg_average" }];
    
    case 'saudi arabia':
    case 'ksa':
      // No average option for Saudi Arabia
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

export default function HeatingForm({ onSubmitSuccess }) {
  const heating = useEmissionStore((s) => s.scope2Heating || []);
  const addHeating = useEmissionStore((s) => s.addScope2Heating);
  const deleteHeating = useEmissionStore((s) => s.deleteScope2Heating);
  const selectedYear = useEmissionStore((s) => s.selectedYear);
  const token = useAuthStore((s) => s.token);
  
  // Get company location for region-specific options
  const company = useCompanyStore((s) => s.company);
  const primaryLocation = company?.locations?.find(loc => loc.isPrimary) || company?.locations?.[0];
  const country = primaryLocation?.country || "uae";
  
  // Get region-specific heating options
  const HEATING_COOLING_TYPES = getHeatingOptions(country);

  const [energyTypeKey, setEnergyTypeKey] = useState(HEATING_COOLING_TYPES[0]?.key || "steam_hot_water");
  const [consumption, setConsumption] = useState("");
  const [month, setMonth] = useState(currentMonth());

  const selectedType = HEATING_COOLING_TYPES.find((t) => t.key === energyTypeKey);

  const handleDeleteHeating = async (id, month) => {
    const deleted = heating.find((h) => h.id === id);
    if (!deleted) return;

    const effectiveMonth = deleted.month != null ? String(deleted.month) : "";
    const [year] = effectiveMonth.includes("-")
      ? effectiveMonth.split("-").map(Number)
      : [selectedYear];

    try {
      await emissionsAPI.deleteScope2Entry(token, {
        year,
        month: effectiveMonth,
        category: "heating",
        entry: {
          energyType: deleted.energyType,
          consumptionKwh: Number(deleted.consumption || 0),
        },
      });
      deleteHeating(id);
    } catch (error) {
      console.error("Failed to delete heating entry:", error);
    }
  };

  const handleAddRow = () => {
    if (!consumption || Number(consumption) <= 0) return;
    addHeating({
      id: Date.now(),
      energyType: energyTypeKey,
      energyTypeLabel: selectedType?.label,
      consumption: Number(consumption),
      month,
    });
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {heating.length === 0 && (
              <tr>
                <td colSpan={4} className="ht-empty">
                  No entries yet. Add a row below.
                </td>
              </tr>
            )}
            {heating.map((h) => (
              <tr key={h.id}>
                <td>
                  <span className="ht-badge">{h.energyTypeLabel}</span>
                </td>
                <td>
                  <span className="ht-qty">{h.consumption?.toLocaleString()}</span>
                  <span className="ht-unit"> kWh</span>
                </td>
                <td>{h.month || "—"}</td>
                <td>
                  <button
                    className="ht-delete"
                    onClick={() => handleDeleteHeating(h.id, h.month)}
                    title="Remove"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}

            <tr className="ht-add-row">
              <td>
                <select
                  value={energyTypeKey}
                  onChange={(e) => setEnergyTypeKey(e.target.value)}
                  className="ht-select"
                >
                  {HEATING_COOLING_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
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
          overflow: hidden;
        }

        .ht-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .ht-table thead tr { background: #F9FAFB; }

        .ht-table th {
          text-align: left;
          padding: 11px 14px;
          font-size: 12px;
          font-weight: 600;
          color: #6B7280;
          border-bottom: 1px solid #E5E7EB;
        }

        .ht-table td {
          padding: 11px 14px;
          color: #111827;
          border-bottom: 1px solid #F3F4F6;
          vertical-align: middle;
        }

        .ht-table tbody tr:last-child td { border-bottom: none; }

        .ht-empty {
          text-align: center;
          color: #9CA3AF;
          font-size: 13px;
          padding: 28px 0 !important;
        }

        .ht-qty { font-weight: 500; }
        .ht-unit { font-size: 12px; color: #6B7280; }

        .ht-badge {
          display: inline-block;
          padding: 2px 8px;
          background: #F3F4F6;
          border-radius: 20px;
          font-size: 12px;
          color: #374151;
        }

        .ht-delete {
          background: none;
          border: none;
          color: #9CA3AF;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
        }
        .ht-delete:hover { color: #DC2626; background: #FEF2F2; }

        .ht-add-row td { background: #FAFAFA; border-top: 1px solid #E5E7EB; }

        .ht-select {
          width: 100%;
          padding: 7px 10px;
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
          padding: 7px 10px;
          font-size: 13px;
          background: transparent;
          min-width: 60px;
        }

        .ht-unit-tag {
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

        .ht-footer { display: flex; justify-content: flex-end; padding: 16px 0 0 0; margin-top: 16px; }
        .ht-footer-right { display: flex; align-items: center; gap: 12px; }
        .ht-add-btn-inline {
          padding: 7px 14px; background: #1B4D3E; color: white;
          border: none; border-radius: 7px; font-size: 13px;
          font-weight: 500; cursor: pointer; white-space: nowrap; transition: background 0.15s;
        }
        .ht-add-btn-inline:hover { background: #2E7D64; }
        .ht-error { font-size: 13px; color: #DC2626; }

        .ht-submit-btn {
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
        .ht-submit-btn:hover:not(:disabled) { background: #2E7D64; }
        .ht-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .ht-submit-btn.submitted { background: #059669; }

        @media (max-width: 640px) {
          .ht-table th:nth-child(2),
          .ht-table td:nth-child(2) { display: none; }
        }
      `}</style>
    </div>
  );
}