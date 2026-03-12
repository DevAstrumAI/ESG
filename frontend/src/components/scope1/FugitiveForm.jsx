import React, { useState, useMemo } from "react";
import Card from "../ui/Card";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";
import EmptyState from "../ui/EmptyState";
import { useEmissionStore } from "../../store/emissionStore";
import { FiSearch, FiPlus, FiTrash2, FiAlertCircle, FiDroplet } from "react-icons/fi";

export default function FugitiveForm() {
  const fugitiveEntries = useEmissionStore((s) => s.scope1Fugitive);
  const addFugitive = useEmissionStore((s) => s.addScope1Fugitive);
  const deleteFugitive = useEmissionStore((s) => s.deleteScope1Fugitive);

  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const sourceOptions = [
    "Pipeline Leaks",
    "Valve Leaks",
    "Flange Leaks",
    "Compressor Seals",
    "Storage Tanks",
    "Pressure Relief Devices",
    "Open-ended Lines",
    "Sampling Connections",
    "Wastewater Treatment",
    "Cooling Towers",
    "Coal Mining",
    "Oil & Gas Extraction",
    "Landfills",
    "Other"
  ];

  const handleAdd = () => {
    if (!source || !amount) {
      alert("Enter all fields");
      return;
    }
    addFugitive({
      id: Date.now(),
      source,
      amount: Number(amount),
    });
    setSource("");
    setAmount("");
  };

  const handleDelete = (id) => deleteFugitive(id);

  const displayedEntries = useMemo(() => {
    if (!searchTerm) return fugitiveEntries;
    return fugitiveEntries.filter(f =>
      f.source.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [fugitiveEntries, searchTerm]);

  const totalAmount = fugitiveEntries.reduce((sum, f) => sum + f.amount, 0);
  const totalCO2e = totalAmount * 1.1;

  return (
    <div className="fugitive-container">
      {/* Header with description */}
      <div className="section-description">
        <div className="description-icon">💨</div>
        <div className="description-content">
          <h3>Fugitive Emissions</h3>
          <p>
            Track <span className="highlight">unintentional leaks and releases</span> from equipment, 
            pipelines, valves, and other industrial sources.
          </p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="search-filter-bar">
        <div className="search-box">
          <FiSearch className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Search emission sources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div style = {{margin: "25px"}}className="filter-badge">
          {fugitiveEntries.length} {fugitiveEntries.length === 1 ? 'source' : 'sources'}
        </div>
      </div>

      {/* Add Fugitive Form Card */}
      <Card className="add-fugitive-card">
        <div className="card-header-compact">
          <h4>Add Fugitive Emission Source</h4>
          <p>Enter source details and estimated amount</p>
        </div>
        
        <div className="add-fugitive-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Emission Source</label>
              <div className="select-wrapper">
                <FiAlertCircle className="select-icon" />
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="fugitive-select"
                >
                  <option value="">Select emission source</option>
                  {sourceOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Amount (kg)</label>
              <div className="input-wrapper">
                <FiDroplet className="input-icon" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter estimated amount"
                  className="clean-input"
                />
              </div>
            </div>
          </div>

          {/* Source category hint */}
          {source && (
            <div className="source-hint">
              <span className="hint-icon">ℹ️</span>
              <span className="hint-text">
                {source === "Landfills" && "Methane from decomposing organic waste"}
                {source === "Coal Mining" && "Fugitive methane from mining operations"}
                {source === "Oil & Gas Extraction" && "Leaks during extraction and processing"}
                {source === "Pipeline Leaks" && "Natural gas leaks from transmission pipelines"}
                {(source === "Valve Leaks" || source === "Flange Leaks") && "Common sources in industrial facilities"}
                {![
                  "Landfills", "Coal Mining", "Oil & Gas Extraction", 
                  "Pipeline Leaks", "Valve Leaks", "Flange Leaks"
                ].includes(source) && "Enter estimated fugitive emissions"}
              </span>
            </div>
          )}

          {/* Preview calculation if amount is filled */}
          {amount && Number(amount) > 0 && (
            <div className="preview-calculation">
              <span className="preview-label">Estimated CO₂e:</span>
              <span className="preview-value">
                {(Number(amount) * 1.1).toFixed(2)} tCO₂e
              </span>
              <span className="preview-note">(using default factor 1.1)</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="form-actions">
            <PrimaryButton onClick={handleAdd} className="submit-btn">
              <FiPlus size={20} /> Add Fugitive Source
            </PrimaryButton>
          </div>
        </div>
      </Card>

      {/* Entries Table */}
      {displayedEntries.length === 0 ? (
        <EmptyState 
          message="No fugitive emission sources added yet" 
          icon="💨"
          className="empty-state-custom"
        />
      ) : (
        <Card className="table-card">
          <div className="table-wrapper">
            <table className="entries-table">
              <thead>
                <tr>
                  <th>Emission Source</th>
                  <th>Amount (kg)</th>
                  <th>CO₂e (t)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedEntries.map(f => {
                  const co2e = (f.amount * 1.1).toFixed(2);
                  
                  return (
                    <tr key={f.id} className="entry-row">
                      <td>
                        <span className="source-badge">{f.source}</span>
                      </td>
                      <td className="number-cell">{f.amount.toLocaleString()}</td>
                      <td>
                        <span className="co2e-indicator">{co2e}</span>
                      </td>
                      <td className="actions-cell">
                        <SecondaryButton 
                          onClick={() => alert("Edit coming soon")} 
                          className="edit-btn"
                        >
                          Edit
                        </SecondaryButton>
                        <button 
                          onClick={() => handleDelete(f.id)} 
                          className="delete-btn"
                          title="Delete"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Emissions Summary Footer */}
      <Card className="summary-footer">
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Total Sources</span>
            <span className="summary-value">{fugitiveEntries.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Amount</span>
            <span className="summary-value">{totalAmount.toLocaleString()} kg</span>
          </div>
          <div className="summary-item highlight">
            <span className="summary-label">Total CO₂e</span>
            <span className="summary-value emission">
              {totalCO2e.toFixed(2)} tCO₂e
            </span>
          </div>
        </div>
        <div className="footer-note">
          <p>🌱 Based on IPCC default emission factors for fugitive sources</p>
          <p className="footnote">*Fugitive emissions include methane (CH₄) and other greenhouse gases</p>
        </div>
      </Card>

      <style jsx>{`
        .fugitive-container {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        /* Section Description */
        .section-description {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
          padding: 20px 24px;
          background: linear-gradient(135deg, #f0f9f0 0%, #e6f3e6 100%);
          border-radius: 20px;
          border-left: 6px solid #2E7D32;
          box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1);
        }

        .description-icon {
          font-size: 32px;
          line-height: 1;
        }

        .description-content h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 700;
          color: #1B5E20;
        }

        .description-content p {
          margin: 0;
          color: #374151;
          font-size: 15px;
          line-height: 1.6;
        }

        .highlight {
          background: rgba(46, 125, 50, 0.1);
          padding: 2px 8px;
          border-radius: 20px;
          font-weight: 600;
          color: #2E7D32;
        }

        /* Search Bar */
        .search-filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          gap: 16px;
        }

        .search-box {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: white;
          border-radius: 60px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
          transition: all 0.2s ease;
        }

        .search-box:focus-within {
          border-color: #2E7D32;
          box-shadow: 0 0 0 4px rgba(46, 125, 50, 0.15);
        }

        .search-icon {
          flex-shrink: 0;
          color: #9CA3AF;
        }

        .search-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 15px;
          background: transparent;
        }

        .filter-badge {
          padding: 8px 20px;
          background: #2E7D32;
          color: white;
          border-radius: 30px;
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
        }

        /* Add Fugitive Card */
        .add-fugitive-card {
          margin-bottom: 24px;
          border: 1px solid rgba(46, 125, 50, 0.2);
          border-radius: 20px;
          overflow: hidden;
        }

        .card-header-compact {
          padding: 16px 20px;
          background: #f8faf8;
          border-bottom: 1px solid #e5e7eb;
        }

        .card-header-compact h4 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: #2E7D32;
        }

        .card-header-compact p {
          margin: 0;
          font-size: 13px;
          color: #6B7280;
        }

        .add-fugitive-form {
          padding: 24px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 4px;
        }

        /* Select Wrapper */
        .select-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 12px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          transition: all 0.2s ease;
          height: 45px;
        }

        .select-wrapper:focus-within {
          border-color: #2E7D32;
          box-shadow: 0 0 0 4px rgba(46, 125, 50, 0.15);
        }

        .select-icon {
          color: #9CA3AF;
          font-size: 16px;
        }

        .fugitive-select {
          flex: 1;
          border: none;
          outline: none;
          font-size: 14px;
          background: transparent;
          color: #1F2937;
          height: 100%;
          cursor: pointer;
        }

        /* Input Wrapper */
        .input-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 16px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          transition: all 0.2s ease;
          height: 45px;
        }

        .input-wrapper:focus-within {
          border-color: #2E7D32;
          box-shadow: 0 0 0 4px rgba(46, 125, 50, 0.15);
        }

        .input-icon {
          color: #9CA3AF;
          font-size: 16px;
        }

        .clean-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 14px;
          background: transparent;
          color: #1F2937;
          height: 100%;
        }

        .clean-input::placeholder {
          color: #9CA3AF;
        }

        .clean-input[type="number"] {
          -moz-appearance: textfield;
        }

        .clean-input[type="number"]::-webkit-outer-spin-button,
        .clean-input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .source-hint {
          padding: 12px 16px;
          background: #f0f9f0;
          border-radius: 12px;
          margin: 20px 0;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #374151;
          border-left: 3px solid #2E7D32;
        }

        .hint-icon {
          font-size: 16px;
        }

        .hint-text {
          line-height: 1.5;
        }

        .preview-calculation {
          padding: 16px 20px;
          background: #f0f9f0;
          border-radius: 12px;
          margin: 20px 0;
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          border: 1px solid rgba(46, 125, 50, 0.2);
        }

        .preview-label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .preview-value {
          font-size: 18px;
          font-weight: 700;
          color: #2E7D32;
        }

        .preview-note {
          font-size: 12px;
          color: #6B7280;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 16px;
        }

        .submit-btn {
          min-width: 220px;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          padding: 12px 24px !important;
          border-radius: 30px !important;
        }

        /* Table Card */
        .table-card {
          margin-bottom: 24px;
          overflow: hidden;
          border: 1px solid rgba(46, 125, 50, 0.2);
          border-radius: 20px;
        }

        .table-wrapper {
          overflow-x: auto;
          max-width: 100%;
        }

        .entries-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 8px;
          padding: 8px;
        }

        .entries-table th {
          text-align: left;
          padding: 16px 20px;
          background: #f8faf8;
          font-size: 13px;
          font-weight: 600;
          color: #4B5563;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .entries-table td {
          padding: 16px 20px;
          background: white;
          border-bottom: 1px solid #f0f0f0;
        }

        .entry-row {
          transition: all 0.2s ease;
        }

        .entry-row:hover {
          background: #f8faf8;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .source-badge {
          display: inline-block;
          padding: 4px 12px;
          background: #e0f2fe;
          color: #0369a1;
          border-radius: 30px;
          font-size: 13px;
          font-weight: 500;
        }

        .co2e-indicator {
          font-weight: 600;
          color: #2E7D32;
          font-size: 14px;
        }

        .number-cell {
          font-family: 'Inter', monospace;
          font-weight: 500;
        }

        .actions-cell {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .edit-btn {
          padding: 6px 16px !important;
          font-size: 13px !important;
          border-radius: 30px !important;
        }

        .delete-btn {
          padding: 8px;
          background: white;
          border: 1px solid #fee2e2;
          border-radius: 8px;
          color: #ef4444;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
        }

        .delete-btn:hover {
          background: #fee2e2;
          transform: scale(1.1);
        }

        /* Summary Footer */
        .summary-footer {
          margin-top: 24px;
          padding: 0;
          overflow: hidden;
          border: 1px solid rgba(46, 125, 50, 0.2);
          border-radius: 20px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: #e5e7eb;
        }

        .summary-item {
          background: white;
          padding: 24px;
          text-align: center;
        }

        .summary-item.highlight {
          background: linear-gradient(135deg, #f0f9f0 0%, #e6f3e6 100%);
        }

        .summary-label {
          display: block;
          font-size: 14px;
          color: #6B7280;
          margin-bottom: 8px;
        }

        .summary-value {
          display: block;
          font-size: 28px;
          font-weight: 700;
          color: #1B5E20;
        }

        .summary-value.emission {
          color: #2E7D32;
          font-size: 32px;
        }

        .footer-note {
          padding: 16px 24px;
          background: #f8faf8;
          border-top: 1px solid #e5e7eb;
          font-size: 13px;
          color: #6B7280;
        }

        .footer-note p {
          margin: 4px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .footnote {
          font-size: 11px;
          color: #9ca3af;
          margin-top: 4px;
        }

        /* Empty State */
        .empty-state-custom {
          padding: 48px;
          background: white;
          border-radius: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border: 1px dashed #2E7D32;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .fugitive-container {
            padding: 12px;
          }

          .section-description {
            flex-direction: column;
            align-items: flex-start;
          }

          .form-row {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .summary-grid {
            grid-template-columns: 1fr;
          }

          .summary-value {
            font-size: 24px;
          }

          .summary-value.emission {
            font-size: 28px;
          }

          .actions-cell {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 480px) {
          .search-filter-bar {
            flex-direction: column;
          }

          .filter-badge {
            align-self: flex-start;
          }

          .submit-btn {
            width: 100%;
          }

          .preview-calculation {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}