// src/components/scope1/FugitiveForm.jsx
import React, { useState } from "react";
import { emissionsAPI } from "../../services/api";
import { useEmissionStore } from "../../store/emissionStore";
import { FiTrash2, FiPlus, FiEdit2, FiSave, FiX } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";

const FUGITIVE_OPTIONS = [
  { value: "methane", label: "Methane (CH₄)" },
  { value: "n2o", label: "Nitrous Oxide (N₂O)" },
  { value: "co2_extinguisher", label: "CO₂ Fire Extinguisher" },
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

export default function FugitiveForm() {
  const fugitive = useEmissionStore((s) => s.scope1Fugitive);
  const addFugitive = useEmissionStore((s) => s.addScope1Fugitive);
  const deleteFugitive = useEmissionStore((s) => s.deleteScope1Fugitive);
  const updateFugitive = useEmissionStore((s) => s.updateScope1Fugitive);
  const token = useAuthStore((s) => s.token);

  const [sourceType, setSourceType] = useState("");
  const [emissionKg, setEmissionKg] = useState("");
  const [month, setMonth] = useState(currentMonth());

  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({
    sourceType: "",
    emissionKg: "",
    month: "",
  });

  const handleAdd = () => {
    if (!sourceType || !emissionKg || emissionKg <= 0) {
      alert("Please fill all fields");
      return;
    }

    const selected = FUGITIVE_OPTIONS.find(f => f.value === sourceType);
    addFugitive({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      source: selected.label,
      sourceType: sourceType,
      emissionKg: parseFloat(emissionKg),
      amount: parseFloat(emissionKg),
      month: month,
    });

    setSourceType("");
    setEmissionKg("");
    setMonth(currentMonth());
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete ${entry.source} - ${entry.emissionKg} kg?`)) return;

    const [year] = entry.month.split("-");
    
    const backendEntry = {
      sourceType: entry.sourceType,
      emissionKg: entry.emissionKg,
    };

    try {
      await emissionsAPI.deleteScope1Entry(token, {
        year: parseInt(year),
        month: entry.month,
        category: "fugitive",
        entry: backendEntry,
      });
      
      deleteFugitive(entry.id);
      console.log("Delete successful");
      
    } catch (error) {
      console.error("Failed to delete fugitive entry:", error);
      alert(`Failed to delete: ${error.message || "Unknown error"}`);
    }
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditValues({
      sourceType: entry.sourceType,
      emissionKg: entry.emissionKg,
      month: entry.month,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editValues.sourceType || !editValues.emissionKg) {
      alert("Please fill all fields");
      return;
    }

    const selected = FUGITIVE_OPTIONS.find(f => f.value === editValues.sourceType);
    const updatedEntry = {
      id: editingId,
      source: selected.label,
      sourceType: editValues.sourceType,
      emissionKg: parseFloat(editValues.emissionKg),
      amount: parseFloat(editValues.emissionKg),
      month: editValues.month,
    };

    const oldEntry = fugitive.find(f => f.id === editingId);
    
    if (oldEntry && token) {
      const [year] = editValues.month.split("-");
      
      const oldBackendEntry = {
        sourceType: oldEntry.sourceType,
        emissionKg: oldEntry.emissionKg,
      };
      
      const newBackendEntry = {
        sourceType: editValues.sourceType,
        emissionKg: parseFloat(editValues.emissionKg),
      };
      
      try {
        await emissionsAPI.deleteScope1Entry(token, {
          year: parseInt(year),
          month: editValues.month,
          category: "fugitive",
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
            refrigerants: [],
            fugitive: [newBackendEntry],
          }),
        });
        
        updateFugitive(updatedEntry);
        
      } catch (error) {
        console.error("Failed to sync edit with backend:", error);
        alert("Failed to save changes");
        return;
      }
    } else {
      updateFugitive(updatedEntry);
    }

    setEditingId(null);
  };

  return (
    <div className="ff-wrap">
      <div className="ff-table-wrap">
        <table className="ff-table">
          <thead>
            <tr>
              <th>Source Type</th>
              <th>Amount (kg)</th>
              <th>Month</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fugitive.length === 0 && (
              <tr>
                <td colSpan={4} className="ff-empty">
                  No fugitive entries yet. Fill the row below and click + Add.
                </td>
              </tr>
            )}

            {fugitive.map((entry) => {
              if (editingId === entry.id) {
                return (
                  <tr key={entry.id} className="ff-editing-row">
                    <td>
                      <select
                        value={editValues.sourceType}
                        onChange={(e) => setEditValues({...editValues, sourceType: e.target.value})}
                        className="ff-select"
                      >
                        {FUGITIVE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={editValues.emissionKg}
                        onChange={(e) => setEditValues({...editValues, emissionKg: e.target.value})}
                        className="ff-input"
                        min="0"
                        step="any"
                      />
                    </td>
                    <td>
                      <select
                        value={editValues.month}
                        onChange={(e) => setEditValues({...editValues, month: e.target.value})}
                        className="ff-select"
                      >
                        {MONTHS.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button onClick={saveEdit} className="ff-save-btn"><FiSave /> Save</button>
                      <button onClick={cancelEdit} className="ff-cancel-btn"><FiX /> Cancel</button>
                    </td>
                  </tr>
                );
              }
              
              return (
                <tr key={entry.id}>
                  <td>{entry.source}</td>
                  <td>{entry.emissionKg || entry.amount}</td>
                  <td>{entry.month}</td>
                  <td>
                    <button onClick={() => startEdit(entry)} className="ff-edit"><FiEdit2 /></button>
                    <button onClick={() => handleDelete(entry)} className="ff-delete"><FiTrash2 /></button>
                  </td>
                </tr>
              );
            })}

            {/* Add Row */}
            <tr className="ff-add-row">
              <td>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="ff-select"
                >
                  <option value="">Select Source</option>
                  {FUGITIVE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="number"
                  placeholder="0"
                  value={emissionKg}
                  onChange={(e) => setEmissionKg(e.target.value)}
                  className="ff-input"
                  min="0"
                  step="any"
                />
              </td>
              <td>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="ff-select"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </td>
              <td>
                <button className="ff-add-btn" onClick={handleAdd}>
                  <FiPlus /> Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .ff-wrap { width: 100%; }
        .ff-table-wrap { border: 1px solid #E5E7EB; border-radius: 10px; overflow-x: auto; }
        .ff-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 500px; }
        .ff-table thead tr { background: #F9FAFB; }
        .ff-table th { text-align: left; padding: 12px 14px; font-size: 12px; font-weight: 600; color: #6B7280; border-bottom: 1px solid #E5E7EB; }
        .ff-table td { padding: 12px 14px; color: #111827; border-bottom: 1px solid #F3F4F6; }
        .ff-empty { text-align: center; color: #9CA3AF; padding: 40px 0 !important; }
        .ff-edit, .ff-delete { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 4px; margin-right: 6px; }
        .ff-edit { color: #2E7D64; }
        .ff-delete { color: #9CA3AF; }
        .ff-delete:hover { color: #DC2626; background: #FEF2F2; }
        .ff-select, .ff-input { width: 100%; padding: 8px 10px; border: 1px solid #E5E7EB; border-radius: 7px; font-size: 13px; }
        .ff-add-row td { background: #FAFAFA; border-top: 1px solid #E5E7EB; }
        .ff-add-btn { padding: 8px 16px; background: #1B4D3E; color: white; border: none; border-radius: 7px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .ff-save-btn, .ff-cancel-btn { padding: 6px 10px; border-radius: 4px; margin-right: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
        .ff-save-btn { background: #2E7D64; color: white; border: none; }
        .ff-cancel-btn { background: #F3F4F6; color: #6B7280; border: none; }
      `}</style>
    </div>
  );
}