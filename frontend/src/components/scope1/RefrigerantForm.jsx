// src/components/scope1/RefrigerantForm.jsx
import React, { useState } from "react";
import { useEmissionStore } from "../../store/emissionStore";
import { FiTrash2, FiSend, FiWind, FiDroplet } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";

const REFRIGERANT_TYPES = [
  { label: "R-134a",  key: "r134a",  gwp: 1430 },
  { label: "R-410A",  key: "r410a",  gwp: 2088 },
  { label: "R-22",    key: "r22",    gwp: 1810 },
  { label: "R-404A",  key: "r404a",  gwp: 3922 },
  { label: "R-407C",  key: "r407c",  gwp: 1774 },
  { label: "R-32",    key: "r32",    gwp: 675  },
  { label: "R-507",   key: "r507",   gwp: 3985 },
  { label: "SF6",     key: "sf6",    gwp: 23500},
  { label: "HFC-23",  key: "hfc23",  gwp: 14800},
  { label: "PFC-14",  key: "pfc14",  gwp: 7390 },
  { label: "PFC-116", key: "pfc116", gwp: 12200},
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

export default function RefrigerantForm({ onSubmitSuccess }) {
  const refrigerants    = useEmissionStore((s) => s.scope1Refrigerants);
  const addRefrigerant  = useEmissionStore((s) => s.addScope1Refrigerant);
  const deleteRefrigerant = useEmissionStore((s) => s.deleteScope1Refrigerant);
  const submitScope1    = useEmissionStore((s) => s.submitScope1);
  const token = useAuthStore((s) => s.token);

  const [refrigerantKey, setRefrigerantKey] = useState("");
  const [quantity, setQuantity]             = useState("");
  const [month, setMonth]                   = useState(currentMonth());
  const [submitting, setSubmitting]         = useState(false);
  const [submitted, setSubmitted]           = useState(false);
  const [submitError, setSubmitError]       = useState(null);

  const selectedRefrigerant = REFRIGERANT_TYPES.find((r) => r.key === refrigerantKey);

  const handleAddRow = () => {
    if (!refrigerantKey || quantity === "") return;
    addRefrigerant({
      id: Date.now(),
      refrigerantType: selectedRefrigerant.label,
      refrigerantKey,
      leakageKg: Number(quantity),
      gwp: selectedRefrigerant.gwp,
      month,
    });
    setRefrigerantKey("");
    setQuantity("");
    setMonth(currentMonth());
  };

  const handleCalculateSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const monthStr = refrigerants[0]?.month || currentMonth();
    const [yr, mo] = monthStr.split("-").map(Number);
    const result = await submitScope1(token, yr, mo);
    setSubmitting(false);
    if (result.success) {
      setSubmitted(true);
      if (onSubmitSuccess) onSubmitSuccess();
    } else {
      setSubmitError(result.error || "Submission failed");
    }
  };

  const co2ePreview = (leakageKg, gwp) =>
    ((leakageKg * gwp) / 1000).toFixed(3);

  return (
    <div className="rf-wrap">
      <div className="rf-desc-header">
        <FiWind className="rf-header-icon" />
        <p className="rf-desc">
          Enter <strong>refrigerant leakage</strong> from cooling equipment. Each refrigerant has a specific Global Warming Potential (GWP).
        </p>
      </div>

      <div className="rf-table-wrap">
        <table className="rf-table">
          <thead>
            <tr>
              <th>Refrigerant Type</th>
              <th>Leakage</th>
              <th>GWP</th>
              <th>CO₂e (t)</th>
              <th>Month</th>
              <th></th>
              </tr>
            </thead>
          <tbody>
            {refrigerants.length === 0 && (
              <tr>
                <td colSpan={6} className="rf-empty">
                  No entries yet. Add a row below.
                </td>
              </tr>
            )}
            {refrigerants.map((r) => (
              <tr key={r.id}>
                <td>{r.refrigerantType}</td>
                <td>
                  <span className="rf-qty">{r.leakageKg?.toLocaleString()}</span>
                  <span className="rf-unit"> kg</span>
                </td>
                <td>
                  <span className="rf-badge">{r.gwp?.toLocaleString()}</span>
                </td>
                <td>
                  <span className="rf-co2e">{co2ePreview(r.leakageKg, r.gwp)}</span>
                </td>
                <td>{r.month || "—"}</td>
                <td>
                  <button className="rf-delete" onClick={() => deleteRefrigerant(r.id)} title="Remove">
                    <FiTrash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}

            <tr className="rf-add-row">
              <td>
                <select value={refrigerantKey} onChange={(e) => setRefrigerantKey(e.target.value)} className="rf-select">
                  <option value="">Select Refrigerant</option>
                  {REFRIGERANT_TYPES.map((r) => (
                    <option key={r.key} value={r.key}>{r.label} (GWP: {r.gwp})</option>
                  ))}
                </select>
              </td>
              <td>
                <div className="rf-qty-input">
                  <input
                    type="number"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="rf-input"
                    min="0"
                    step="0.01"
                  />
                  <span className="rf-unit-tag">kg</span>
                </div>
              </td>
              <td>
                <span className="rf-preview">
                  {selectedRefrigerant ? selectedRefrigerant.gwp.toLocaleString() : "—"}
                </span>
              </td>
              <td>
                <span className="rf-preview rf-co2e">
                  {selectedRefrigerant && quantity
                    ? co2ePreview(Number(quantity), selectedRefrigerant.gwp)
                    : "—"}
                </span>
              </td>
              <td>
                <select value={month} onChange={(e) => setMonth(e.target.value)} className="rf-select">
                  {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </td>
              <td>
                <button className="rf-add-btn-inline" onClick={handleAddRow}>
                  + Add
                </button>
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rf-footer">
        <div className="rf-footer-right">
          {submitError && <span className="rf-error">{submitError}</span>}
          <button
            className={`rf-submit-btn ${submitted ? "submitted" : ""}`}
            onClick={handleCalculateSubmit}
            disabled={submitting || submitted || refrigerants.length === 0}
          >
            {submitted ? "✅ Submitted!" : submitting ? "Calculating..." : (
              <><FiSend size={14} /> Calculate & Submit</>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .rf-wrap { width: 100%; }

        .rf-desc-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        .rf-header-icon {
          font-size: 20px;
          color: #2E7D64;
        }

        .rf-desc {
          font-size: 13px;
          color: #6B7280;
          margin: 0;
        }
        .rf-desc strong { color: #1B4D3E; }

        .rf-table-wrap { border: 1px solid #E5E7EB; border-radius: 10px; overflow: hidden; }

        .rf-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .rf-table thead tr { background: #F9FAFB; }
        .rf-table th {
          text-align: left; padding: 11px 14px; font-size: 12px;
          font-weight: 600; color: #6B7280; border-bottom: 1px solid #E5E7EB;
        }
        .rf-table td {
          padding: 11px 14px; color: #111827;
          border-bottom: 1px solid #F3F4F6; vertical-align: middle;
        }
        .rf-table tbody tr:last-child td { border-bottom: none; }

        .rf-empty { text-align: center; color: #9CA3AF; font-size: 13px; padding: 28px 0 !important; }

        .rf-qty { font-weight: 500; }
        .rf-unit { font-size: 12px; color: #6B7280; }

        .rf-badge {
          display: inline-block; padding: 2px 8px;
          background: #F3F4F6; border-radius: 20px;
          font-size: 12px; color: #374151;
        }

        .rf-co2e { font-weight: 500; color: #2E7D64; }
        .rf-preview { font-size: 13px; color: #6B7280; }

        .rf-delete {
          background: none; border: none; color: #9CA3AF;
          cursor: pointer; padding: 4px; border-radius: 4px;
          display: flex; align-items: center;
        }
        .rf-delete:hover { color: #DC2626; background: #FEF2F2; }

        .rf-add-row td { background: #FAFAFA; border-top: 1px solid #E5E7EB; }

        .rf-select {
          width: 100%; padding: 7px 10px; border: 1px solid #E5E7EB;
          border-radius: 7px; font-size: 13px; background: white;
          color: #374151; outline: none;
        }
        .rf-select:focus { border-color: #2E7D64; }

        .rf-qty-input {
          display: flex; align-items: center; border: 1px solid #E5E7EB;
          border-radius: 7px; background: white; overflow: hidden;
        }
        .rf-qty-input:focus-within { border-color: #2E7D64; }

        .rf-input {
          flex: 1; border: none; outline: none; padding: 7px 10px;
          font-size: 13px; background: transparent; min-width: 60px;
        }

        .rf-unit-tag {
          padding: 0 10px; font-size: 12px; color: #6B7280;
          background: #F3F4F6; border-left: 1px solid #E5E7EB;
          display: flex; align-items: center; min-height: 33px; white-space: nowrap;
        }

        .rf-footer { display: flex; justify-content: flex-end; padding: 16px 0 0 0; margin-top: 16px; }
        .rf-footer-right { display: flex; align-items: center; gap: 12px; }
        .rf-add-btn-inline {
          padding: 7px 14px; background: #1B4D3E; color: white;
          border: none; border-radius: 7px; font-size: 13px;
          font-weight: 500; cursor: pointer; white-space: nowrap; transition: background 0.15s;
        }
        .rf-add-btn-inline:hover { background: #2E7D64; }
                .rf-error { font-size: 13px; color: #DC2626; }

        .rf-submit-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 20px; background: #1B4D3E; color: white;
          border: none; border-radius: 8px; font-size: 14px;
          font-weight: 500; cursor: pointer; transition: background 0.15s;
        }
        .rf-submit-btn:hover:not(:disabled) { background: #2E7D64; }
        .rf-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .rf-submit-btn.submitted { background: #059669; }

        @media (max-width: 768px) {
          .rf-table th:nth-child(3), .rf-table td:nth-child(3),
          .rf-table th:nth-child(4), .rf-table td:nth-child(4) { display: none; }
        }
      `}</style>
    </div>
  );
}