// src/components/scope2/ElectricityForm.jsx
import React, { useEffect, useState } from "react";
import { emissionsAPI } from "../../services/api";
import { useEmissionStore } from "../../store/emissionStore";
import { FiTrash2, FiZap, FiEdit2, FiSave, FiX } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";
import { useCompanyStore } from "../../store/companyStore";
import { useSelectedLocationStore } from "../../store/selectedLocationStore";
import ThemedSelect from "../ui/ThemedSelect";

const CERTIFICATE_TYPES = [
  { label: "Grid Average (Location-based)", key: "grid_average" },
  { label: "Solar PPA (Market-based)", key: "solar_ppa" },
  { label: "Wind PPA (Market-based)", key: "wind_ppa" },
  { label: "Hydro GO (Market-based)", key: "hydro_go" },
  { label: "REC / I-REC (Market-based)", key: "rec_ppa" },
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

export default function ElectricityForm({ onSubmitSuccess, reportingMonth }) {
  const electricity = useEmissionStore((s) => s.scope2Electricity || []);
  const addElectricity = useEmissionStore((s) => s.addScope2Electricity);
  const updateElectricity = useEmissionStore((s) => s.updateScope2Electricity);
  const deleteElectricity = useEmissionStore((s) => s.deleteScope2Electricity);
  const selectedYear = useEmissionStore((s) => s.selectedYear);
  const token = useAuthStore((s) => s.token);
  const company = useCompanyStore((s) => s.company);
  const getSelectedLocation = useSelectedLocationStore((s) => s.getSelectedLocation);

  // Edit mode state
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({
    consumption: "",
    certificateKey: "",
    month: "",
  });

  // Delete handler with confirmation
  const handleDeleteElectricity = async (id, month) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    
    const deleted = electricity.find((e) => e.id === id);
    if (!deleted) return;

    // Remove locally first to keep CRUD smooth even if backend cannot match this row.
    deleteElectricity(id);

    const effectiveMonth = deleted.month != null ? String(deleted.month) : "";
    const [year] = effectiveMonth.includes("-")
      ? effectiveMonth.split("-").map(Number)
      : [selectedYear];
    const loc = getSelectedLocation(company);

    try {
      await emissionsAPI.deleteScope2Entry(token, {
        year,
        month: effectiveMonth,
        category: "electricity",
        entry: {
          facilityName: deleted.facilityName || "Main City",
          consumptionKwh: Number(deleted.consumption || deleted.kwh || 0),
          method: deleted.method || (deleted.certificateType === "grid_average" ? "location" : "market"),
          certificateType: deleted.certificateType || "grid_average",
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
        console.error("Failed to delete electricity entry:", error);
        alert("Failed to delete. Please try again.");
      }
    }
  };

  // Edit handlers
  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditValues({
      consumption: entry.consumption,
      certificateKey: entry.certificateType,
      month: entry.month || currentMonth(),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({
      consumption: "",
      certificateKey: "",
      month: "",
    });
  };

  const saveEdit = async () => {
    if (!editValues.consumption || editValues.consumption <= 0) {
      setAddRowError("Please enter a valid electricity consumption.");
      return;
    }

    const selectedCertificate = CERTIFICATE_TYPES.find(c => c.key === editValues.certificateKey);
    const method = editValues.certificateKey === "grid_average" ? "location" : "market";
    
    const updatedEntry = {
      id: editingId,
      consumption: Number(editValues.consumption),
      certificateType: editValues.certificateKey,
      certificateLabel: selectedCertificate?.label,
      method: method,
      month: editValues.month,
    };

    // Update in store
    updateElectricity(updatedEntry);

    // Sync with backend (delete old, add new)
    const oldEntry = electricity.find(e => e.id === editingId);
    if (oldEntry && token) {
      const [year] = editValues.month.split("-");

      try {
        // Delete old entry
        const locEdit = getSelectedLocation(company);
        await emissionsAPI.deleteScope2Entry(token, {
          year,
          month: editValues.month,
          category: "electricity",
          entry: {
            facilityName: oldEntry.facilityName || "Main City",
            consumptionKwh: Number(oldEntry.consumption || 0),
            method: oldEntry.method || "location",
            certificateType: oldEntry.certificateType || "grid_average",
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
            electricity: [{
              facilityName: "Main City",
              consumptionKwh: Number(editValues.consumption),
              method: method,
              certificateType: editValues.certificateKey,
            }],
            heating: [],
            renewables: [],
          }),
        });
      } catch (error) {
        console.error("Failed to sync edit with backend:", error);
      }
    }

    setEditingId(null);
    setEditValues({
      consumption: "",
      certificateKey: "",
      month: "",
    });
  };

  // Add new entry handler
  const [consumption, setConsumption] = useState("");
  const [certificateKey, setCertificateKey] = useState("grid_average");
  const [month, setMonth] = useState(reportingMonth || currentMonth());
  const [addRowError, setAddRowError] = useState("");

  useEffect(() => {
    if (reportingMonth) {
      setMonth(reportingMonth);
    }
  }, [reportingMonth]);

  const selectedCertificate = CERTIFICATE_TYPES.find((c) => c.key === certificateKey);

  const handleAddRow = () => {
    if (!consumption || Number(consumption) <= 0) {
      setAddRowError("Please enter a valid electricity consumption.");
      return;
    }
    
    // Check for duplicate
    const isDuplicate = electricity.some(e => 
      e.consumption === Number(consumption) && 
      e.certificateType === certificateKey &&
      e.month === month
    );
    
    if (isDuplicate) {
      setAddRowError("This entry already exists for the selected month.");
      return;
    }
    
    const method = certificateKey === "grid_average" ? "location" : "market";
    
    addElectricity({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      consumption: Number(consumption),
      certificateType: certificateKey,
      certificateLabel: selectedCertificate?.label,
      method: method,
      month,
    });
    
    setConsumption("");
    setMonth(reportingMonth || currentMonth());
    setAddRowError("");
  };

  return (
    <div className="el-wrap">
      <div className="el-desc-header">
        <FiZap className="el-header-icon" />
        <p className="el-desc">
          Enter <strong>purchased electricity consumption</strong>. For market-based reporting, select the certificate type if applicable.
        </p>
      </div>

      <div className="el-table-wrap">
        <table className="el-table">
          <thead>
            <tr>
              <th>Certificate Type</th>
              <th>Consumption (kWh)</th>
              <th>Month</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {electricity.length === 0 && (
              <tr>
                <td colSpan={4} className="el-empty">
                  No entries yet. Add a row below.
                </td>
              </tr>
            )}
            
            {electricity.map((e) => {
              // Edit mode
              if (editingId === e.id) {
                return (
                  <tr key={e.id} className="el-editing-row">
                    <td className="el-certificate-cell">
                      <ThemedSelect
                        value={editValues.certificateKey}
                        onChange={(nextValue) => setEditValues({ ...editValues, certificateKey: nextValue })}
                        options={CERTIFICATE_TYPES.map((c) => ({ value: c.key, label: c.label }))}
                        placeholder="Certificate Type"
                        className="el-select"
                      />
                    </td>
                    <td className="el-consumption-cell">
                      <div className="el-qty-input" style={{ width: "120px" }}>
                        <input
                          type="number"
                          value={editValues.consumption}
                          onChange={(e) => setEditValues({...editValues, consumption: e.target.value})}
                          className="el-input"
                          min="0"
                          style={{ width: "80px" }}
                        />
                        <span className="el-unit-tag">kWh</span>
                      </div>
                    </td>
                    <td className="el-month-cell">
                      <ThemedSelect
                        value={editValues.month}
                        onChange={(nextValue) => setEditValues({ ...editValues, month: nextValue })}
                        options={MONTHS.map((m) => ({ value: m, label: m }))}
                        placeholder="Month"
                        className="el-select"
                      />
                    </td>
                    <td className="el-actions-cell">
                      <button
                        onClick={saveEdit}
                        className="el-save-btn"
                        title="Save"
                      >
                        <FiSave size={14} /> Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="el-cancel-btn"
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
                <tr key={e.id}>
                  <td>
                    <span className="el-badge">
                      {e.certificateLabel || (e.certificateType === "grid_average" ? "Grid Average" : "Renewable Certificate")}
                    </span>
                  </td>
                  <td>
                    <span className="el-qty">{e.consumption?.toLocaleString()}</span>
                    <span className="el-unit"> kWh</span>
                  </td>
                  <td>{e.month || "—"}</td>
                  <td>
                    <button
                      className="el-edit"
                      onClick={() => startEdit(e)}
                      title="Edit"
                    >
                      <FiEdit2 size={14} />
                    </button>
                    <button
                      className="el-delete"
                      onClick={() => handleDeleteElectricity(e.id, e.month)}
                      title="Delete"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* Add Row */}
            <tr className="el-add-row">
              <td>
                <ThemedSelect
                  value={certificateKey}
                  onChange={setCertificateKey}
                  options={CERTIFICATE_TYPES.map((c) => ({ value: c.key, label: c.label }))}
                  placeholder="Certificate Type"
                  className="el-select"
                />
              </td>
              <td>
                <div className="el-qty-input">
                  <input
                    type="number"
                    placeholder="0"
                    value={consumption}
                    onChange={(e) => setConsumption(e.target.value)}
                    className="el-input"
                    min="0"
                  />
                  <span className="el-unit-tag">kWh</span>
                </div>
              </td>
              <td>
                <ThemedSelect
                  value={month}
                  onChange={setMonth}
                  options={MONTHS.map((m) => ({ value: m, label: m }))}
                  placeholder="Month"
                  className="el-select"
                />
              </td>
              <td>
                <button className="el-add-btn-inline" onClick={handleAddRow}>
                  + Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {addRowError && <div className="el-inline-error">⚠️ {addRowError}</div>}

      <style jsx>{`
        .el-wrap { width: 100%; }

        .el-desc-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        .el-header-icon {
          font-size: 20px;
          color: #2E7D64;
        }

        .el-desc {
          font-size: 13px;
          color: #6B7280;
          margin: 0;
        }
        .el-desc strong { color: #1B4D3E; }

        .el-table-wrap {
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          overflow-x: auto;
        }

        .el-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
          min-width: 500px;
        }

        .el-table thead tr { background: #F9FAFB; }

        .el-table th {
          text-align: left;
          padding: 12px 14px;
          font-size: 12px;
          font-weight: 600;
          color: #6B7280;
          border-bottom: 1px solid #E5E7EB;
        }

        .el-table td {
          padding: 12px 14px;
          color: #111827;
          border-bottom: 1px solid #F3F4F6;
          vertical-align: middle;
        }

        .el-table tbody tr:last-child td { border-bottom: none; }

        .el-empty {
          text-align: center;
          color: #9CA3AF;
          font-size: 13px;
          padding: 40px 0 !important;
        }

        .el-qty { font-weight: 500; }
        .el-unit { font-size: 12px; color: #6B7280; margin-left: 4px; }

        .el-badge {
          display: inline-block;
          padding: 4px 10px;
          background: #F3F4F6;
          border-radius: 20px;
          font-size: 12px;
          color: #374151;
        }

        .el-edit, .el-delete {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          margin-right: 6px;
        }
        .el-edit { color: #2E7D64; }
        .el-edit:hover { background: #E8F5F0; }
        .el-delete { color: #9CA3AF; }
        .el-delete:hover { color: #DC2626; background: #FEF2F2; }

        .el-save-btn, .el-cancel-btn {
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
        .el-save-btn { background: #2E7D64; color: white; }
        .el-save-btn:hover { background: #1B4D3E; }
        .el-cancel-btn { background: #F3F4F6; color: #6B7280; }
        .el-cancel-btn:hover { background: #E5E7EB; }

        .el-add-row td { background: #FAFAFA; border-top: 1px solid #E5E7EB; }

        .el-select {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid #E5E7EB;
          border-radius: 7px;
          font-size: 13px;
          background: white;
          color: #374151;
          outline: none;
        }
        .el-select:focus { border-color: #2E7D64; }

        .el-qty-input {
          display: flex;
          align-items: center;
          border: 1px solid #E5E7EB;
          border-radius: 7px;
          background: white;
          overflow: hidden;
        }
        .el-qty-input:focus-within { border-color: #2E7D64; }

        .el-input {
          flex: 1;
          border: none;
          outline: none;
          padding: 8px 10px;
          font-size: 13px;
          background: transparent;
          min-width: 60px;
        }

        .el-unit-tag {
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

        .el-add-btn-inline {
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
        .el-add-btn-inline:hover { background: #2E7D64; }
        .el-inline-error {
          margin-top: 10px;
          border: 1px solid #FECACA;
          background: #FEF2F2;
          color: #B91C1C;
          border-radius: 8px;
          padding: 9px 11px;
          font-size: 13px;
          font-weight: 500;
        }

        @media (max-width: 640px) {
          .el-table th:nth-child(2),
          .el-table td:nth-child(2) { display: none; }
        }
      `}</style>
    </div>
  );
}