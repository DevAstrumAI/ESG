// src/components/scope2/RenewableForm.jsx
import React, { useEffect, useState } from "react";
import { emissionsAPI } from "../../services/api";
import { useEmissionStore } from "../../store/emissionStore";
import { FiTrash2, FiSun, FiEdit2, FiSave, FiX } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";
import { useCompanyStore } from "../../store/companyStore";
import { useSelectedLocationStore } from "../../store/selectedLocationStore";

const RENEWABLE_TYPES = [
  { label: "Solar PV / PPA", key: "solar_ppa" },
  { label: "Wind PPA", key: "wind_ppa" },
  { label: "Hydro (GO)", key: "hydro_go" },
  { label: "Nuclear (GO)", key: "nuclear_go" },
  { label: "REC / I-REC", key: "rec_ppa" },
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

export default function RenewableForm({ onSubmitSuccess, reportingMonth }) {
  const renewables = useEmissionStore((s) => s.scope2Renewable || []);
  const addRenewable = useEmissionStore((s) => s.addScope2Renewable);
  const updateRenewable = useEmissionStore((s) => s.updateScope2Renewable);
  const deleteRenewable = useEmissionStore((s) => s.deleteScope2Renewable);
  const selectedYear = useEmissionStore((s) => s.selectedYear);
  const token = useAuthStore((s) => s.token);
  const company = useCompanyStore((s) => s.company);
  const getSelectedLocation = useSelectedLocationStore((s) => s.getSelectedLocation);

  // Edit mode state
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({
    sourceTypeKey: "",
    consumption: "",
    month: "",
  });

  // Delete handler with confirmation
  const handleDeleteRenewable = async (id, month) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    
    const deleted = renewables.find((r) => r.id === id);
    if (!deleted) return;

    // Remove locally first to avoid blocked deletion UX.
    deleteRenewable(id);

    const effectiveMonth = deleted.month != null ? String(deleted.month) : "";
    const [year] = effectiveMonth.includes("-")
      ? effectiveMonth.split("-").map(Number)
      : [selectedYear];
    const loc = getSelectedLocation(company);

    try {
      await emissionsAPI.deleteScope2Entry(token, {
        year,
        month: effectiveMonth,
        category: "renewables",
        entry: {
          sourceType: deleted.sourceType,
          generationKwh: Number(deleted.consumption || 0),
        },
        country: loc?.country,
        city: loc?.city,
      });
    } catch (error) {
      const message = String(error?.message || "");
      const isNotFound =
        message.includes("No matching Scope 2 entry found") ||
        message.includes("Scope 2 data not found");
      if (!isNotFound) {
        console.error("Failed to delete renewable entry:", error);
        alert("Failed to delete. Please try again.");
      }
    }
  };

  // Edit handlers
  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditValues({
      sourceTypeKey: entry.sourceType,
      consumption: entry.consumption,
      month: entry.month || currentMonth(),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({
      sourceTypeKey: "",
      consumption: "",
      month: "",
    });
  };

  const saveEdit = async () => {
    if (!editValues.sourceTypeKey || !editValues.consumption || editValues.consumption <= 0) {
      alert("Please fill all fields");
      return;
    }

    const selectedType = RENEWABLE_TYPES.find(t => t.key === editValues.sourceTypeKey);
    
    const updatedEntry = {
      id: editingId,
      sourceType: editValues.sourceTypeKey,
      sourceTypeLabel: selectedType?.label,
      consumption: Number(editValues.consumption),
      month: editValues.month,
    };

    // Update in store
    updateRenewable(updatedEntry);

    // Sync with backend (delete old, add new)
    const oldEntry = renewables.find(r => r.id === editingId);
    if (oldEntry && token) {
      const [year] = editValues.month.split("-");

      try {
        // Delete old entry
        const locEdit = getSelectedLocation(company);
        await emissionsAPI.deleteScope2Entry(token, {
          year,
          month: editValues.month,
          category: "renewables",
          entry: {
            sourceType: oldEntry.sourceType,
            generationKwh: Number(oldEntry.consumption || 0),
          },
          country: locEdit?.country,
          city: locEdit?.city,
        });
        
        // Add new entry
        const { useCompanyStore } = require('../../store/companyStore');
        const { useSelectedLocationStore } = require('../../store/selectedLocationStore');
        const companyStore = useCompanyStore.getState();
        const selectedLoc =
          useSelectedLocationStore.getState().getSelectedLocation(companyStore.company) ||
          companyStore.company?.locations?.find((loc) => loc.isPrimary) ||
          companyStore.company?.locations?.[0];
        const country = selectedLoc?.country || 'uae';
        const city = (selectedLoc?.city || 'dubai').toLowerCase();
        
        await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8001'}/api/emissions/scope2`, {
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
            electricity: [],
            heating: [],
            renewables: [{
              sourceType: editValues.sourceTypeKey,
              generationKwh: Number(editValues.consumption),
            }],
          }),
        });
      } catch (error) {
        console.error("Failed to sync edit with backend:", error);
      }
    }

    setEditingId(null);
    setEditValues({
      sourceTypeKey: "",
      consumption: "",
      month: "",
    });
  };

  // Add new entry handler
  const [sourceTypeKey, setSourceTypeKey] = useState("solar_ppa");
  const [consumption, setConsumption] = useState("");
  const [month, setMonth] = useState(reportingMonth || currentMonth());

  useEffect(() => {
    if (reportingMonth) {
      setMonth(reportingMonth);
    }
  }, [reportingMonth]);

  const selectedType = RENEWABLE_TYPES.find((t) => t.key === sourceTypeKey);

  const handleAddRow = () => {
    if (!consumption || Number(consumption) <= 0) {
      alert("Please fill all fields");
      return;
    }
    
    // Check for duplicate
    const isDuplicate = renewables.some(r => 
      r.sourceType === sourceTypeKey && 
      r.consumption === Number(consumption) &&
      r.month === month
    );
    
    if (isDuplicate) {
      alert("This entry already exists for this month");
      return;
    }
    
    addRenewable({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sourceType: sourceTypeKey,
      sourceTypeLabel: selectedType?.label,
      consumption: Number(consumption),
      month,
    });
    setConsumption("");
    setMonth(reportingMonth || currentMonth());
  };

  return (
    <div className="rw-wrap">
      <div className="rw-desc-header">
        <FiSun className="rw-header-icon" />
        <p className="rw-desc">
          Report <strong>renewable electricity generation</strong> from on-site sources or PPAs. Generation offsets your market-based Scope 2 emissions.
        </p>
      </div>

      <div className="rw-table-wrap">
        <table className="rw-table">
          <thead>
            <tr>
              <th>Source Type</th>
              <th>Generation (kWh)</th>
              <th>Month</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {renewables.length === 0 && (
              <tr>
                <td colSpan={4} className="rw-empty">
                  No entries yet. Add a row below.
                </td>
                </tr>
            )}
            
            {renewables.map((r) => {
              // Edit mode
              if (editingId === r.id) {
                const editSelectedType = RENEWABLE_TYPES.find(t => t.key === editValues.sourceTypeKey);
                return (
                  <tr key={r.id} className="rw-editing-row">
                    <td className="rw-source-cell">
                      <select
                        value={editValues.sourceTypeKey}
                        onChange={(e) => setEditValues({...editValues, sourceTypeKey: e.target.value})}
                        className="rw-select"
                      >
                        {RENEWABLE_TYPES.map(t => (
                          <option key={t.key} value={t.key}>{t.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="rw-consumption-cell">
                      <div className="rw-qty-input" style={{ width: "120px" }}>
                        <input
                          type="number"
                          value={editValues.consumption}
                          onChange={(e) => setEditValues({...editValues, consumption: e.target.value})}
                          className="rw-input"
                          min="0"
                          step="any"
                          style={{ width: "80px" }}
                        />
                        <span className="rw-unit-tag">kWh</span>
                      </div>
                    </td>
                    <td className="rw-month-cell">
                      <select
                        value={editValues.month}
                        onChange={(e) => setEditValues({...editValues, month: e.target.value})}
                        className="rw-select"
                      >
                        {MONTHS.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </td>
                    <td className="rw-actions-cell">
                      <button
                        onClick={saveEdit}
                        className="rw-save-btn"
                        title="Save"
                      >
                        <FiSave size={14} /> Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rw-cancel-btn"
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
                <tr key={r.id}>
                  <td>
                    <span className="rw-badge">{r.sourceTypeLabel}</span>
                  </td>
                  <td>
                    <span className="rw-qty">{r.consumption?.toLocaleString()}</span>
                    <span className="rw-unit"> kWh</span>
                  </td>
                  <td>{r.month || "—"}</td>
                  <td>
                    <button
                      className="rw-edit"
                      onClick={() => startEdit(r)}
                      title="Edit"
                    >
                      <FiEdit2 size={14} />
                    </button>
                    <button
                      className="rw-delete"
                      onClick={() => handleDeleteRenewable(r.id, r.month)}
                      title="Delete"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* Add Row */}
            <tr className="rw-add-row">
              <td>
                <select
                  value={sourceTypeKey}
                  onChange={(e) => setSourceTypeKey(e.target.value)}
                  className="rw-select"
                >
                  {RENEWABLE_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </td>
              <td>
                <div className="rw-qty-input">
                  <input
                    type="number"
                    placeholder="0"
                    value={consumption}
                    onChange={(e) => setConsumption(e.target.value)}
                    className="rw-input"
                    min="0"
                    step="any"
                  />
                  <span className="rw-unit-tag">kWh</span>
                </div>
              </td>
              <td>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="rw-select"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </td>
              <td>
                <button className="rw-add-btn-inline" onClick={handleAddRow}>
                  + Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .rw-wrap { width: 100%; }

        .rw-desc-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        .rw-header-icon {
          font-size: 20px;
          color: #2E7D64;
        }

        .rw-desc {
          font-size: 13px;
          color: #6B7280;
          margin: 0;
        }
        .rw-desc strong { color: #1B4D3E; }

        .rw-table-wrap {
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          overflow-x: auto;
        }

        .rw-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
          min-width: 500px;
        }

        .rw-table thead tr { background: #F9FAFB; }

        .rw-table th {
          text-align: left;
          padding: 12px 14px;
          font-size: 12px;
          font-weight: 600;
          color: #6B7280;
          border-bottom: 1px solid #E5E7EB;
        }

        .rw-table td {
          padding: 12px 14px;
          color: #111827;
          border-bottom: 1px solid #F3F4F6;
          vertical-align: middle;
        }

        .rw-table tbody tr:last-child td { border-bottom: none; }

        .rw-empty {
          text-align: center;
          color: #9CA3AF;
          font-size: 13px;
          padding: 40px 0 !important;
        }

        .rw-qty { font-weight: 500; }
        .rw-unit { font-size: 12px; color: #6B7280; margin-left: 4px; }

        .rw-badge {
          display: inline-block;
          padding: 4px 10px;
          background: #E8F0EA;
          border-radius: 20px;
          font-size: 12px;
          color: #2E7D64;
        }

        .rw-edit, .rw-delete {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          margin-right: 6px;
        }
        .rw-edit { color: #2E7D64; }
        .rw-edit:hover { background: #E8F5F0; }
        .rw-delete { color: #9CA3AF; }
        .rw-delete:hover { color: #DC2626; background: #FEF2F2; }

        .rw-save-btn, .rw-cancel-btn {
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
        .rw-save-btn { background: #2E7D64; color: white; }
        .rw-save-btn:hover { background: #1B4D3E; }
        .rw-cancel-btn { background: #F3F4F6; color: #6B7280; }
        .rw-cancel-btn:hover { background: #E5E7EB; }

        .rw-add-row td { background: #FAFAFA; border-top: 1px solid #E5E7EB; }

        .rw-select {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid #E5E7EB;
          border-radius: 7px;
          font-size: 13px;
          background: white;
          color: #374151;
          outline: none;
        }
        .rw-select:focus { border-color: #2E7D64; }

        .rw-qty-input {
          display: flex;
          align-items: center;
          border: 1px solid #E5E7EB;
          border-radius: 7px;
          background: white;
          overflow: hidden;
        }
        .rw-qty-input:focus-within { border-color: #2E7D64; }

        .rw-input {
          flex: 1;
          border: none;
          outline: none;
          padding: 8px 10px;
          font-size: 13px;
          background: transparent;
          min-width: 60px;
        }

        .rw-unit-tag {
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

        .rw-add-btn-inline {
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
        .rw-add-btn-inline:hover { background: #2E7D64; }

        @media (max-width: 640px) {
          .rw-table th:nth-child(2),
          .rw-table td:nth-child(2) { display: none; }
        }
      `}</style>
    </div>
  );
}