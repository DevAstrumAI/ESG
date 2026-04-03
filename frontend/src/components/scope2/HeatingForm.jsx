// src/components/scope2/HeatingForm.jsx
import React, { useState } from "react";
import { useEmissionStore } from "../../store/emissionStore";
import { FiTrash2, FiSend, FiThermometer, FiDroplet } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";

const HEATING_COOLING_TYPES = [
  { label: "Steam / Hot Water", key: "steam_hot_water" },
  { label: "Location Wise Average ", key: "uae_average" },
  { label: "District Cooling", key: "district_cooling" },
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

export default function HeatingForm({ onSubmitSuccess }) {
  const heating = useEmissionStore((s) => s.scope2Heating || []);
  const addHeating = useEmissionStore((s) => s.addScope2Heating);
  const deleteHeating = useEmissionStore((s) => s.deleteScope2Heating);
  const submitScope2 = useEmissionStore((s) => s.submitScope2);
  const token = useAuthStore((s) => s.token);

  const [energyTypeKey, setEnergyTypeKey] = useState("steam_hot_water");
  const [consumption, setConsumption] = useState("");
  const [month, setMonth] = useState(currentMonth());

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const selectedType = HEATING_COOLING_TYPES.find((t) => t.key === energyTypeKey);

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

  const handleCalculateSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const monthStr = heating[0]?.month || currentMonth();
    const [yr, mo] = monthStr.split("-").map(Number);
    const result = await submitScope2(token, yr, mo);
    setSubmitting(false);
    if (result.success) {
      setSubmitted(true);
      if (onSubmitSuccess) onSubmitSuccess();
    } else {
      setSubmitError(result.error || "Submission failed");
    }
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
                    onClick={() => deleteHeating(h.id)}
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
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="ht-footer">
        <button className="ht-add-btn" onClick={handleAddRow}>
          + Add Row
        </button>
        <div className="ht-footer-right">
          {submitError && <span className="ht-error">{submitError}</span>}
          <button
            className={`ht-submit-btn ${submitted ? "submitted" : ""}`}
            onClick={handleCalculateSubmit}
            disabled={submitting || submitted || heating.length === 0}
          >
            {submitted ? "✅ Submitted!" : submitting ? "Calculating..." : (
              <><FiSend size={14} /> Calculate & Submit</>
            )}
          </button>
        </div>
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

        .ht-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0 0 0;
          margin-top: 16px;
        }

        .ht-footer-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ht-add-btn {
          background: none;
          border: none;
          font-size: 14px;
          font-weight: 500;
          color: #2E7D64;
          cursor: pointer;
          padding: 8px 0;
        }
        .ht-add-btn:hover { text-decoration: underline; }

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