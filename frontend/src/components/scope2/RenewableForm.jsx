// src/components/scope2/RenewableForm.jsx
import React, { useState } from "react";
import emissionsAPI from "../../services/api";
import { useEmissionStore } from "../../store/emissionStore";
import { FiTrash2, FiSun, FiDroplet } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";

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

export default function RenewableForm({ onSubmitSuccess }) {
  const renewables = useEmissionStore((s) => s.scope2Renewable || []);
  const addRenewable = useEmissionStore((s) => s.addScope2Renewable);
  const deleteRenewable = useEmissionStore((s) => s.deleteScope2Renewable);
  const selectedYear = useEmissionStore((s) => s.selectedYear);
  const token = useAuthStore((s) => s.token);

  const handleDeleteRenewable = async (id, month) => {
    const deleted = renewables.find((r) => r.id === id);
    if (!deleted) return;

    const [year] = month ? month.split("-").map(Number) : [selectedYear];

    try {
      await emissionsAPI.deleteScope2Entry(token, {
        year,
        month,
        category: "renewables",
        entry: {
          sourceType: deleted.sourceType,
          generationKwh: Number(deleted.consumption || 0),
        },
      });
      deleteRenewable(id);
    } catch (error) {
      console.error("Failed to delete renewable entry:", error);
    }
  };

  const [sourceTypeKey, setSourceTypeKey] = useState("solar_ppa");
  const [consumption, setConsumption] = useState("");
  const [month, setMonth] = useState(currentMonth());


  const selectedType = RENEWABLE_TYPES.find((t) => t.key === sourceTypeKey);

  const handleAddRow = () => {
    if (!consumption || Number(consumption) <= 0) return;
    addRenewable({
      id: Date.now(),
      sourceType: sourceTypeKey,
      sourceTypeLabel: selectedType?.label,
      consumption: Number(consumption),
      month,
    });
    setConsumption("");
    setMonth(currentMonth());
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
              <th></th>
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
            {renewables.map((r) => (
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
                    className="rw-delete"
                    onClick={() => handleDeleteRenewable(r.id, r.month)}
                    title="Remove"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}

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
              <td></td>
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
          overflow: hidden;
        }

        .rw-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .rw-table thead tr { background: #F9FAFB; }

        .rw-table th {
          text-align: left;
          padding: 11px 14px;
          font-size: 12px;
          font-weight: 600;
          color: #6B7280;
          border-bottom: 1px solid #E5E7EB;
        }

        .rw-table td {
          padding: 11px 14px;
          color: #111827;
          border-bottom: 1px solid #F3F4F6;
          vertical-align: middle;
        }

        .rw-table tbody tr:last-child td { border-bottom: none; }

        .rw-empty {
          text-align: center;
          color: #9CA3AF;
          font-size: 13px;
          padding: 28px 0 !important;
        }

        .rw-qty { font-weight: 500; }
        .rw-unit { font-size: 12px; color: #6B7280; }

        .rw-badge {
          display: inline-block;
          padding: 2px 8px;
          background: #E8F0EA;
          border-radius: 20px;
          font-size: 12px;
          color: #2E7D64;
        }

        .rw-delete {
          background: none;
          border: none;
          color: #9CA3AF;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
        }
        .rw-delete:hover { color: #DC2626; background: #FEF2F2; }

        .rw-add-row td { background: #FAFAFA; border-top: 1px solid #E5E7EB; }

        .rw-select {
          width: 100%;
          padding: 7px 10px;
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
          padding: 7px 10px;
          font-size: 13px;
          background: transparent;
          min-width: 60px;
        }

        .rw-unit-tag {
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

        .rw-footer { display: flex; justify-content: flex-end; padding: 16px 0 0 0; margin-top: 16px; }
        .rw-footer-right { display: flex; align-items: center; gap: 12px; }
        .rw-add-btn-inline {
          padding: 7px 14px; background: #1B4D3E; color: white;
          border: none; border-radius: 7px; font-size: 13px;
          font-weight: 500; cursor: pointer; white-space: nowrap; transition: background 0.15s;
        }
        .rw-add-btn-inline:hover { background: #2E7D64; }

        .rw-error { font-size: 13px; color: #DC2626; }

        .rw-submit-btn {
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
        .rw-submit-btn:hover:not(:disabled) { background: #2E7D64; }
        .rw-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .rw-submit-btn.submitted { background: #059669; }

        @media (max-width: 640px) {
          .rw-table th:nth-child(2),
          .rw-table td:nth-child(2) { display: none; }
        }
      `}</style>
    </div>
  );
}