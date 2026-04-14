// src/components/scope1/RefrigerantForm.jsx
import React, { useState } from "react";
import { emissionsAPI } from "../../services/api";
import { useEmissionStore } from "../../store/emissionStore";
import { FiTrash2, FiPlus, FiEdit2, FiSave, FiX } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";

const REFRIGERANT_OPTIONS = [
  { value: "r134a", label: "R-134a", gwp: 1300 },
  { value: "r410a", label: "R-410A", gwp: 2088 },
  { value: "r22", label: "R-22", gwp: 1760 },
  { value: "r404a", label: "R-404A", gwp: 3942.8 },
  { value: "r407c", label: "R-407C", gwp: 1624.21 },
  { value: "r32", label: "R-32", gwp: 67 },
  { value: "r507", label: "R-507", gwp: 3985 },
  { value: "sf6", label: "SF6", gwp: 23500 },
  { value: "hfc23", label: "HFC-23", gwp: 12400 },
  { value: "pfc14", label: "PFC-14", gwp: 6630 },
  { value: "pfc116", label: "PFC-116", gwp: 11100 },
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

export default function RefrigerantForm() {
  const refrigerants = useEmissionStore((s) => s.scope1Refrigerants);
  const addRefrigerant = useEmissionStore((s) => s.addScope1Refrigerant);
  const deleteRefrigerant = useEmissionStore((s) => s.deleteScope1Refrigerant);
  const updateRefrigerant = useEmissionStore((s) => s.updateScope1Refrigerant);
  const token = useAuthStore((s) => s.token);

  const [refrigerantType, setRefrigerantType] = useState("");
  const [leakageKg, setLeakageKg] = useState("");
  const [month, setMonth] = useState(currentMonth());

  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({
    refrigerantType: "",
    leakageKg: "",
    month: "",
  });

  const handleAdd = () => {
    if (!refrigerantType || !leakageKg || leakageKg <= 0) {
      alert("Please fill all fields");
      return;
    }

    const selected = REFRIGERANT_OPTIONS.find(r => r.value === refrigerantType);
    addRefrigerant({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      refrigerantType: selected.label,
      refrigerantKey: refrigerantType,
      leakageKg: parseFloat(leakageKg),
      gwp: selected.gwp,
      month: month,
    });

    setRefrigerantType("");
    setLeakageKg("");
    setMonth(currentMonth());
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete ${entry.refrigerantType} - ${entry.leakageKg} kg?`)) return;

    const [year] = entry.month.split("-");
    
    const backendEntry = {
      refrigerantType: entry.refrigerantKey,
      leakageKg: entry.leakageKg,
    };

    try {
      await emissionsAPI.deleteScope1Entry(token, {
        year: parseInt(year),
        month: entry.month,
        category: "refrigerants",
        entry: backendEntry,
      });
      
      deleteRefrigerant(entry.id);
      console.log("Delete successful");
      
    } catch (error) {
      console.error("Failed to delete refrigerant entry:", error);
      alert(`Failed to delete: ${error.message || "Unknown error"}`);
    }
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditValues({
      refrigerantType: entry.refrigerantKey,
      leakageKg: entry.leakageKg,
      month: entry.month,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editValues.refrigerantType || !editValues.leakageKg) {
      alert("Please fill all fields");
      return;
    }

    const selected = REFRIGERANT_OPTIONS.find(r => r.value === editValues.refrigerantType);
    const updatedEntry = {
      id: editingId,
      refrigerantType: selected.label,
      refrigerantKey: editValues.refrigerantType,
      leakageKg: parseFloat(editValues.leakageKg),
      gwp: selected.gwp,
      month: editValues.month,
    };

    const oldEntry = refrigerants.find(r => r.id === editingId);
    
    if (oldEntry && token) {
      const [year] = editValues.month.split("-");
      
      const oldBackendEntry = {
        refrigerantType: oldEntry.refrigerantKey,
        leakageKg: oldEntry.leakageKg,
      };
      
      const newBackendEntry = {
        refrigerantType: editValues.refrigerantType,
        leakageKg: parseFloat(editValues.leakageKg),
      };
      
      try {
        await emissionsAPI.deleteScope1Entry(token, {
          year: parseInt(year),
          month: editValues.month,
          category: "refrigerants",
          entry: oldBackendEntry,
        });
        
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
            stationary: [],
            refrigerants: [newBackendEntry],
            fugitive: [],
          }),
        });
        
        updateRefrigerant(updatedEntry);
        
      } catch (error) {
        console.error("Failed to sync edit with backend:", error);
        alert("Failed to save changes");
        return;
      }
    } else {
      updateRefrigerant(updatedEntry);
    }

    setEditingId(null);
  };

  return (
    <div className="rf-wrap">
      <div className="rf-table-wrap">
        <table className="rf-table">
          <thead>
            <tr>
              <th>Refrigerant Type</th>
              <th>Leakage (kg)</th>
              <th>GWP</th>
              <th>Month</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {refrigerants.length === 0 && (
              <tr>
                <td colSpan={5} className="rf-empty">
                  No refrigerant entries yet. Fill the row below and click + Add.
                </td>
              </tr>
            )}

            {refrigerants.map((entry) => {
              if (editingId === entry.id) {
                return (
                  <tr key={entry.id} className="rf-editing-row">
                    <td>
                      <select
                        value={editValues.refrigerantType}
                        onChange={(e) => setEditValues({...editValues, refrigerantType: e.target.value})}
                        className="rf-select"
                      >
                        {REFRIGERANT_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={editValues.leakageKg}
                        onChange={(e) => setEditValues({...editValues, leakageKg: e.target.value})}
                        className="rf-input"
                        min="0"
                        step="any"
                      />
                    </td>
                    <td>{REFRIGERANT_OPTIONS.find(r => r.value === editValues.refrigerantType)?.gwp || 0}</td>
                    <td>
                      <select
                        value={editValues.month}
                        onChange={(e) => setEditValues({...editValues, month: e.target.value})}
                        className="rf-select"
                      >
                        {MONTHS.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button onClick={saveEdit} className="rf-save-btn"><FiSave /> Save</button>
                      <button onClick={cancelEdit} className="rf-cancel-btn"><FiX /> Cancel</button>
                    </td>
                  </tr>
                );
              }
              
              return (
                <tr key={entry.id}>
                  <td>{entry.refrigerantType}</td>
                  <td>{entry.leakageKg}</td>
                  <td>{entry.gwp}</td>
                  <td>{entry.month}</td>
                  <td>
                    <button onClick={() => startEdit(entry)} className="rf-edit"><FiEdit2 /></button>
                    <button onClick={() => handleDelete(entry)} className="rf-delete"><FiTrash2 /></button>
                  </td>
                </tr>
              );
            })}

            <tr className="rf-add-row">
              <td>
                <select
                  value={refrigerantType}
                  onChange={(e) => setRefrigerantType(e.target.value)}
                  className="rf-select"
                >
                  <option value="">Select Refrigerant</option>
                  {REFRIGERANT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="number"
                  placeholder="0"
                  value={leakageKg}
                  onChange={(e) => setLeakageKg(e.target.value)}
                  className="rf-input"
                  min="0"
                  step="any"
                />
              </td>
              <td>{REFRIGERANT_OPTIONS.find(r => r.value === refrigerantType)?.gwp || 0}</td>
              <td>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="rf-select"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </td>
              <td>
                <button className="rf-add-btn" onClick={handleAdd}>
                  <FiPlus /> Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .rf-wrap { width: 100%; }
        .rf-table-wrap { border: 1px solid #E5E7EB; border-radius: 10px; overflow-x: auto; }
        .rf-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 600px; }
        .rf-table thead tr { background: #F9FAFB; }
        .rf-table th { text-align: left; padding: 12px 14px; font-size: 12px; font-weight: 600; color: #6B7280; border-bottom: 1px solid #E5E7EB; }
        .rf-table td { padding: 12px 14px; color: #111827; border-bottom: 1px solid #F3F4F6; }
        .rf-empty { text-align: center; color: #9CA3AF; padding: 40px 0 !important; }
        .rf-edit, .rf-delete { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 4px; margin-right: 6px; }
        .rf-edit { color: #2E7D64; }
        .rf-delete { color: #9CA3AF; }
        .rf-delete:hover { color: #DC2626; background: #FEF2F2; }
        .rf-select, .rf-input { width: 100%; padding: 8px 10px; border: 1px solid #E5E7EB; border-radius: 7px; font-size: 13px; }
        .rf-add-row td { background: #FAFAFA; border-top: 1px solid #E5E7EB; }
        .rf-add-btn { padding: 8px 16px; background: #1B4D3E; color: white; border: none; border-radius: 7px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .rf-save-btn, .rf-cancel-btn { padding: 6px 10px; border-radius: 4px; margin-right: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
        .rf-save-btn { background: #2E7D64; color: white; border: none; }
        .rf-cancel-btn { background: #F3F4F6; color: #6B7280; border: none; }
      `}</style>
    </div>
  );
}