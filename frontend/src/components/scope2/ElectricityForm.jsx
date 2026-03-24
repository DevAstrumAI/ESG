import React, { useState } from "react";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";
import EmptyState from "../ui/EmptyState";
import { useEmissionStore } from "../../store/emissionStore";

export default function ElectricityForm() {
  const methods = [
    { label: "Location-based (Grid Average)", value: "location" },
    { label: "Market-based (Supplier Specific)", value: "market" },
  ];

  const [certificateType, setCertificateType] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [consumption, setConsumption] = useState("");
  const [method, setMethod] = useState("location");
  const [search, setSearch] = useState("");

  const electricityEntries = useEmissionStore((s) => s.scope2Electricity);
  const addElectricity = useEmissionStore((s) => s.addScope2Electricity);
  const deleteElectricity = useEmissionStore((s) => s.deleteScope2Electricity);

  const handleAddElectricity = () => {
    if (!consumption || Number(consumption) <= 0) return;

    addElectricity({
      id: Date.now(),
      facilityName: facilityName || "Main Facility",
      consumption: Number(consumption),
      method,
      certificateType: method === "market" ? certificateType : undefined,

    });

    setFacilityName("");
    setConsumption("");
    setMethod("location");
  };

  const filteredEntries = electricityEntries.filter(
    (e) =>
      (e.facilityName || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.method || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="electricity-form">
      <div className="form-header">
        <h2>Purchased Electricity</h2>
        <p className="header-description">
          Record your purchased electricity consumption per facility
        </p>
      </div>

      <div className="search-wrapper">
        <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M19 19L15 15" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <input
          type="text"
          placeholder="Search by facility or method..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="input-section">
        <div className="input-grid">
          <div className="input-group">
            <label className="input-label">Facility Name</label>
            <input
              type="text"
              value={facilityName}
              onChange={(e) => setFacilityName(e.target.value)}
              placeholder="e.g. HQ Office"
              className="text-input"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Consumption (kWh)</label>
            <div className="input-wrapper">
              <input
                type="number"
                min="0"
                value={consumption}
                onChange={(e) => setConsumption(e.target.value)}
                placeholder="e.g. 5000"
                className="text-input"
              />
              <span className="input-suffix">kWh</span>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Accounting Method</label>
            <div className="select-wrapper">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="fuel-select"
              >
                {methods.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <svg className="select-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6L8 10L12 6" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          
          {method === "market" && (
            <div className="input-group">
              <label className="input-label">Certificate Type</label>
              <div className="select-wrapper">
                <select
                  value={certificateType}
                  onChange={(e) => setCertificateType(e.target.value)}
                  className="fuel-select"
                >
                  <option value="rec_ppa">RECs / PPA</option>
                  <option value="solar_ppa">Solar PPA</option>
                  <option value="wind_ppa">Wind PPA</option>
                  <option value="hydro_go">Hydro GO</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="add-button-wrapper">
          <PrimaryButton onClick={handleAddElectricity} className="add-button">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 4V16M4 10H16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Add Electricity Entry
          </PrimaryButton>
        </div>
      </div>

      <div className="table-section">
        <div className="table-header">
          <h3>Electricity Entries</h3>
          <span className="entry-count">{filteredEntries.length} entries</span>
        </div>

        {filteredEntries.length === 0 ? (
          <EmptyState message="No electricity entries added yet." />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Consumption</th>
                  <th>Method</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <span className="provider-badge">{e.facilityName}</span>
                    </td>
                    <td>
                      <span className="consumption-value">{Number(e.consumption).toLocaleString()}</span>
                      <span className="consumption-unit"> kWh</span>
                    </td>
                    <td>
                      <span className="method-badge">
                        {e.method === "market" ? "Market-based" : "Location-based"}
                      </span>
                    </td>
                    <td>
                      <SecondaryButton
                        onClick={() => deleteElectricity(e.id)}
                        className="remove-button"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M2 4H14M12 4V13C12 14 11 15 10 15H6C5 15 4 14 4 13V4M5.5 2.5V2C5.5 1 6.5 0 7.5 0H8.5C9.5 0 10.5 1 10.5 2V2.5" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M6.5 7V11M9.5 7V11" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Remove
                      </SecondaryButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .electricity-form { width: 100%; }
        .form-header { margin-bottom: 24px; }
        .form-header h2 { margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #1B5E20; }
        .header-description { margin: 0; font-size: 14px; color: #6B7280; }
        .search-wrapper { position: relative; margin-bottom: 24px; }
        .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); pointer-events: none; }
        .search-input { width: 100%; padding: 12px 16px 12px 44px; font-size: 14px; border: 1px solid #E5E7EB; border-radius: 30px; background: white; transition: all 0.2s ease; outline: none; }
        .search-input:focus { border-color: #2E7D32; box-shadow: 0 0 0 3px rgba(46,125,50,0.1); }
        .search-input::placeholder { color: #9CA3AF; }
        .input-section { background: #F9FAFB; border-radius: 16px; padding: 24px; margin-bottom: 32px; border: 1px solid rgba(46,125,50,0.1); }
        .input-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 24px; }
        .input-group { display: flex; flex-direction: column; gap: 8px; }
        .input-label { font-size: 13px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.3px; }
        .input-wrapper { position: relative; width: 100%; }
        .text-input { width: 100%; padding: 12px 16px; font-size: 14px; border: 1px solid #E5E7EB; border-radius: 12px; background: white; transition: all 0.2s ease; outline: none; box-sizing: border-box; }
        .text-input:focus { border-color: #2E7D32; box-shadow: 0 0 0 3px rgba(46,125,50,0.1); }
        .text-input::placeholder { color: #9CA3AF; }
        .input-suffix { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: #6B7280; font-size: 14px; font-weight: 500; }
        .select-wrapper { position: relative; width: 100%; }
        .fuel-select { width: 100%; padding: 12px 40px 12px 16px; font-size: 14px; border: 1px solid #E5E7EB; border-radius: 12px; background: white; cursor: pointer; outline: none; transition: all 0.2s ease; appearance: none; -webkit-appearance: none; }
        .fuel-select:hover { border-color: #2E7D32; }
        .fuel-select:focus { border-color: #2E7D32; box-shadow: 0 0 0 3px rgba(46,125,50,0.1); }
        .select-arrow { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); pointer-events: none; }
        .add-button-wrapper { display: flex; justify-content: flex-end; border-top: 1px solid #E5E7EB; padding-top: 24px; }
        .add-button { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; font-size: 14px; font-weight: 600; }
        .table-section { background: white; border-radius: 16px; border: 1px solid rgba(46,125,50,0.1); overflow: hidden; }
        .table-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; background: #F9FAFB; border-bottom: 1px solid rgba(46,125,50,0.1); }
        .table-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #1B5E20; }
        .entry-count { font-size: 13px; color: #6B7280; background: white; padding: 4px 12px; border-radius: 30px; border: 1px solid rgba(46,125,50,0.1); }
        .table-wrapper { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .data-table th { text-align: left; padding: 16px 24px; background: white; color: #374151; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.3px; border-bottom: 2px solid rgba(46,125,50,0.1); }
        .data-table td { padding: 16px 24px; color: #1F2937; border-bottom: 1px solid #F3F4F6; }
        .data-table tr:last-child td { border-bottom: none; }
        .data-table tr:hover td { background: #F9FAFB; }
        .provider-badge { background: rgba(46,125,50,0.1); color: #1B5E20; padding: 4px 12px; border-radius: 30px; font-size: 13px; font-weight: 500; }
        .method-badge { background: #EFF6FF; color: #1D4ED8; padding: 4px 12px; border-radius: 30px; font-size: 13px; font-weight: 500; }
        .consumption-value { font-weight: 600; color: #1B5E20; }
        .consumption-unit { color: #6B7280; font-size: 13px; }
        .remove-button { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 13px; color: #DC2626; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 30px; transition: all 0.2s ease; }
        .remove-button:hover { background: #FEE2E2; border-color: #F87171; }
        @media (max-width: 768px) {
          .input-grid { grid-template-columns: 1fr; gap: 16px; }
          .add-button-wrapper { justify-content: center; }
          .add-button { width: 100%; justify-content: center; }
          .table-header { flex-direction: column; gap: 12px; align-items: flex-start; }
          .data-table th, .data-table td { padding: 12px 16px; }
        }
      `}</style>
    </div>
  );
}