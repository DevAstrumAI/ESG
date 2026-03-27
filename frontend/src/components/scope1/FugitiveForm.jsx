// src/components/scope1/FugitiveForm.jsx
import React, { useState } from "react";
import { useEmissionStore } from "../../store/emissionStore";
import { FiTrash2, FiSend, FiAlertCircle, FiDroplet } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";

const SOURCE_TYPES = [
  { label: "Pipeline Leaks",          key: "methane" },
  { label: "Valve Leaks",             key: "methane" },
  { label: "Flange Leaks",            key: "methane" },
  { label: "Compressor Seals",        key: "methane" },
  { label: "Storage Tanks",           key: "methane" },
  { label: "Pressure Relief Devices", key: "methane" },
  { label: "Open-ended Lines",        key: "methane" },
  { label: "Sampling Connections",    key: "methane" },
  { label: "Wastewater Treatment",    key: "n2o"     },
  { label: "Cooling Towers",          key: "methane" },
  { label: "Coal Mining",             key: "methane" },
  { label: "Oil & Gas Extraction",    key: "methane" },
  { label: "Landfills",               key: "methane" },
  { label: "Other",                   key: "methane" },
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

export default function FugitiveForm({ onSubmitSuccess }) {
  const fugitives    = useEmissionStore((s) => s.scope1Fugitive);
  const addFugitive  = useEmissionStore((s) => s.addScope1Fugitive);
  const deleteFugitive = useEmissionStore((s) => s.deleteScope1Fugitive);
  const submitScope1 = useEmissionStore((s) => s.submitScope1);
  const token = useAuthStore((s) => s.token);

  const [source, setSource]           = useState("");
  const [quantity, setQuantity]       = useState("");
  const [month, setMonth]             = useState(currentMonth());
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const selectedSource = SOURCE_TYPES.find((s) => s.label === source);

  const handleAddRow = () => {
    if (!source || quantity === "") return;
    addFugitive({
      id: Date.now(),
      source,
      sourceType: selectedSource?.key || "methane",
      emissionKg: Number(quantity),
      amount: Number(quantity),
      month,
    });
    setSource("");
    setQuantity("");
    setMonth(currentMonth());
  };

  const handleCalculateSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const monthStr = fugitives[0]?.month || currentMonth();
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

  return (
    <div className="fg-wrap">
      <div className="fg-desc-header">
        <FiAlertCircle className="fg-header-icon" />
        <p className="fg-desc">
          Track <strong>fugitive emissions</strong> — unintentional leaks from equipment, pipelines, valves, and other industrial sources.
        </p>
      </div>

      <div className="fg-table-wrap">
        <table className="fg-table">
          <thead>
            <tr>
              <th>Emission Source</th>
              <th>Gas Type</th>
              <th>Quantity</th>
              <th>Month</th>
              <th></th>
              </tr>
            </thead>
          <tbody>
            {fugitives.length === 0 && (
              <tr>
                <td colSpan={5} className="fg-empty">
                  No entries yet. Add a row below.
                </td>
              </tr>
            )}
            {fugitives.map((f) => (
              <tr key={f.id}>
                <td>{f.source}</td>
                <td>
                  <span className="fg-badge">{f.sourceType || "methane"}</span>
                </td>
                <td>
                  <span className="fg-qty">{f.emissionKg?.toLocaleString()}</span>
                  <span className="fg-unit"> kg</span>
                </td>
                <td>{f.month || "—"}</td>
                <td>
                  <button className="fg-delete" onClick={() => deleteFugitive(f.id)} title="Remove">
                    <FiTrash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}

            <tr className="fg-add-row">
              <td>
                <select value={source} onChange={(e) => setSource(e.target.value)} className="fg-select">
                  <option value="">Select Source</option>
                  {SOURCE_TYPES.map((s) => (
                    <option key={s.label} value={s.label}>{s.label}</option>
                  ))}
                </select>
              </td>
              <td>
                <span className="fg-preview">
                  {selectedSource ? selectedSource.key : "—"}
                </span>
              </td>
              <td>
                <div className="fg-qty-input">
                  <input
                    type="number"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="fg-input"
                    min="0"
                    step="0.01"
                  />
                  <span className="fg-unit-tag">kg</span>
                </div>
              </td>
              <td>
                <select value={month} onChange={(e) => setMonth(e.target.value)} className="fg-select">
                  {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="fg-footer">
        <button className="fg-add-btn" onClick={handleAddRow}>+ Add Row</button>
        <div className="fg-footer-right">
          {submitError && <span className="fg-error">{submitError}</span>}
          <button
            className={`fg-submit-btn ${submitted ? "submitted" : ""}`}
            onClick={handleCalculateSubmit}
            disabled={submitting || submitted || fugitives.length === 0}
          >
            {submitted ? "✅ Submitted!" : submitting ? "Calculating..." : (
              <><FiSend size={14} /> Calculate & Submit</>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .fg-wrap { width: 100%; }

        .fg-desc-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        .fg-header-icon {
          font-size: 20px;
          color: #2E7D64;
        }

        .fg-desc {
          font-size: 13px;
          color: #6B7280;
          margin: 0;
        }
        .fg-desc strong { color: #1B4D3E; }

        .fg-table-wrap { border: 1px solid #E5E7EB; border-radius: 10px; overflow: hidden; }

        .fg-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .fg-table thead tr { background: #F9FAFB; }
        .fg-table th {
          text-align: left; padding: 11px 14px; font-size: 12px;
          font-weight: 600; color: #6B7280; border-bottom: 1px solid #E5E7EB;
        }
        .fg-table td {
          padding: 11px 14px; color: #111827;
          border-bottom: 1px solid #F3F4F6; vertical-align: middle;
        }
        .fg-table tbody tr:last-child td { border-bottom: none; }

        .fg-empty { text-align: center; color: #9CA3AF; font-size: 13px; padding: 28px 0 !important; }

        .fg-badge {
          display: inline-block; padding: 2px 8px;
          background: #F3F4F6; border-radius: 20px;
          font-size: 12px; color: #374151;
        }

        .fg-qty { font-weight: 500; }
        .fg-unit { font-size: 12px; color: #6B7280; }
        .fg-preview { font-size: 13px; color: #6B7280; }

        .fg-delete {
          background: none; border: none; color: #9CA3AF;
          cursor: pointer; padding: 4px; border-radius: 4px;
          display: flex; align-items: center;
        }
        .fg-delete:hover { color: #DC2626; background: #FEF2F2; }

        .fg-add-row td { background: #FAFAFA; border-top: 1px solid #E5E7EB; }

        .fg-select {
          width: 100%; padding: 7px 10px; border: 1px solid #E5E7EB;
          border-radius: 7px; font-size: 13px; background: white;
          color: #374151; outline: none;
        }
        .fg-select:focus { border-color: #2E7D64; }

        .fg-qty-input {
          display: flex; align-items: center; border: 1px solid #E5E7EB;
          border-radius: 7px; background: white; overflow: hidden;
        }
        .fg-qty-input:focus-within { border-color: #2E7D64; }

        .fg-input {
          flex: 1; border: none; outline: none; padding: 7px 10px;
          font-size: 13px; background: transparent; min-width: 60px;
        }

        .fg-unit-tag {
          padding: 0 10px; font-size: 12px; color: #6B7280;
          background: #F3F4F6; border-left: 1px solid #E5E7EB;
          display: flex; align-items: center; min-height: 33px; white-space: nowrap;
        }

        .fg-footer {
          display: flex; justify-content: space-between;
          align-items: center; padding: 16px 0 0 0; margin-top: 16px;
        }
        .fg-footer-right { display: flex; align-items: center; gap: 12px; }

        .fg-add-btn {
          background: none; border: none; font-size: 14px;
          font-weight: 500; color: #2E7D64; cursor: pointer; padding: 8px 0;
        }
        .fg-add-btn:hover { text-decoration: underline; }

        .fg-error { font-size: 13px; color: #DC2626; }

        .fg-submit-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 20px; background: #1B4D3E; color: white;
          border: none; border-radius: 8px; font-size: 14px;
          font-weight: 500; cursor: pointer; transition: background 0.15s;
        }
        .fg-submit-btn:hover:not(:disabled) { background: #2E7D64; }
        .fg-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .fg-submit-btn.submitted { background: #059669; }

        @media (max-width: 640px) {
          .fg-table th:nth-child(2), .fg-table td:nth-child(2),
          .fg-table th:nth-child(4), .fg-table td:nth-child(4) { display: none; }
        }
      `}</style>
    </div>
  );
}