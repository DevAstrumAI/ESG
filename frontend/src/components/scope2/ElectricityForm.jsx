// src/components/scope2/ElectricityForm.jsx
import React, { useState } from "react";
import { useEmissionStore } from "../../store/emissionStore";
import { FiTrash2, FiSend, FiZap, FiDroplet } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";

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

export default function ElectricityForm({ onSubmitSuccess }) {
  const electricity = useEmissionStore((s) => s.scope2Electricity || []);
  const addElectricity = useEmissionStore((s) => s.addScope2Electricity);
  const deleteElectricity = useEmissionStore((s) => s.deleteScope2Electricity);
  const submitScope2 = useEmissionStore((s) => s.submitScope2);
  const token = useAuthStore((s) => s.token);

  const [consumption, setConsumption] = useState("");
  const [certificateKey, setCertificateKey] = useState("grid_average");
  const [month, setMonth] = useState(currentMonth());

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const selectedCertificate = CERTIFICATE_TYPES.find((c) => c.key === certificateKey);

  const handleAddRow = () => {
  if (!consumption || Number(consumption) <= 0) return;
  
  // Determine method based on certificate type
  const method = certificateKey === "grid_average" ? "location" : "market";
  
  console.log("Adding entry:", { consumption, certificateKey, method }); // Debug log
  
  addElectricity({
    id: Date.now(),
    consumption: Number(consumption),
    certificateType: certificateKey,
    certificateLabel: selectedCertificate?.label,
    method: method,  // This must be present
    month,
  });
  
  setConsumption("");
  setMonth(currentMonth());
};

  const handleCalculateSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const monthStr = electricity[0]?.month || currentMonth();
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
              <th>Consumption (kWh)</th>
              <th>Certificate Type</th>
              <th>Month</th>
              <th></th>
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
            {electricity.map((e) => (
              <tr key={e.id}>
                <td>
                  <span className="el-qty">{e.consumption?.toLocaleString()}</span>
                  <span className="el-unit"> kWh</span>
                </td>
                <td>
                  <span className="el-badge">
                    {e.certificateLabel || (e.certificateType === "grid_average" ? "Grid Average" : "Renewable Certificate")}
                  </span>
                </td>
                <td>{e.month || "—"}</td>
                <td>
                  <button
                    className="el-delete"
                    onClick={() => deleteElectricity(e.id)}
                    title="Remove"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}

            <tr className="el-add-row">
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
                <select
                  value={certificateKey}
                  onChange={(e) => setCertificateKey(e.target.value)}
                  className="el-select"
                >
                  {CERTIFICATE_TYPES.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="el-select"
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

      <div className="el-footer">
        <button className="el-add-btn" onClick={handleAddRow}>
          + Add Row
        </button>
        <div className="el-footer-right">
          {submitError && <span className="el-error">{submitError}</span>}
          <button
            className={`el-submit-btn ${submitted ? "submitted" : ""}`}
            onClick={handleCalculateSubmit}
            disabled={submitting || submitted || electricity.length === 0}
          >
            {submitted ? "✅ Submitted!" : submitting ? "Calculating..." : (
              <><FiSend size={14} /> Calculate & Submit</>
            )}
          </button>
        </div>
      </div>

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
          overflow: hidden;
        }

        .el-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .el-table thead tr { background: #F9FAFB; }

        .el-table th {
          text-align: left;
          padding: 11px 14px;
          font-size: 12px;
          font-weight: 600;
          color: #6B7280;
          border-bottom: 1px solid #E5E7EB;
        }

        .el-table td {
          padding: 11px 14px;
          color: #111827;
          border-bottom: 1px solid #F3F4F6;
          vertical-align: middle;
        }

        .el-table tbody tr:last-child td { border-bottom: none; }

        .el-empty {
          text-align: center;
          color: #9CA3AF;
          font-size: 13px;
          padding: 28px 0 !important;
        }

        .el-qty { font-weight: 500; }
        .el-unit { font-size: 12px; color: #6B7280; }

        .el-badge {
          display: inline-block;
          padding: 2px 8px;
          background: #F3F4F6;
          border-radius: 20px;
          font-size: 12px;
          color: #374151;
        }

        .el-delete {
          background: none;
          border: none;
          color: #9CA3AF;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
        }
        .el-delete:hover { color: #DC2626; background: #FEF2F2; }

        .el-add-row td { background: #FAFAFA; border-top: 1px solid #E5E7EB; }

        .el-select {
          width: 100%;
          padding: 7px 10px;
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
          padding: 7px 10px;
          font-size: 13px;
          background: transparent;
          min-width: 60px;
        }

        .el-unit-tag {
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

        .el-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0 0 0;
          margin-top: 16px;
        }

        .el-footer-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .el-add-btn {
          background: none;
          border: none;
          font-size: 14px;
          font-weight: 500;
          color: #2E7D64;
          cursor: pointer;
          padding: 8px 0;
        }
        .el-add-btn:hover { text-decoration: underline; }

        .el-error { font-size: 13px; color: #DC2626; }

        .el-submit-btn {
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
        .el-submit-btn:hover:not(:disabled) { background: #2E7D64; }
        .el-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .el-submit-btn.submitted { background: #059669; }

        @media (max-width: 640px) {
          .el-table th:nth-child(2),
          .el-table td:nth-child(2) { display: none; }
        }
      `}</style>
    </div>
  );
}