// src/components/company/EmployeeForm.jsx
import { useMemo, useState } from "react";
import { FiUsers } from "react-icons/fi";
import ThemedSelect from "../ui/ThemedSelect";

export default function EmployeeForm({ data, updateField }) {
  const locations = data.locations || [];
  const branchEmployees = data.branchEmployees || [];

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [entryCount, setEntryCount] = useState("");

  const keyFor = (loc) =>
    `${String(loc.region || "").toLowerCase()}|${String(loc.country || "").toLowerCase()}|${String(loc.city || "").toLowerCase()}|${String(loc.branch || "").toLowerCase()}`;

  const employeesFor = (loc) => {
    const k = keyFor(loc);
    const found = branchEmployees.find((b) => keyFor(b) === k);
    return found?.employees ?? "";
  };

  const updateBranchEmployees = (loc, value) => {
    const parsed = Number(value);
    const sanitized = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    const k = keyFor(loc);
    const next = [...branchEmployees];
    const idx = next.findIndex((b) => keyFor(b) === k);
    const row = {
      region: loc.region || data.region || "",
      country: loc.country,
      city: loc.city,
      branch: loc.branch || "",
      employees: sanitized,
    };
    if (idx >= 0) next[idx] = row;
    else next.push(row);
    updateField("branchEmployees", next);
    const total = next.reduce((sum, b) => sum + (Number(b.employees) || 0), 0);
    updateField("employees", total);
  };

  const countries = useMemo(() => {
    const seen = new Set();
    return locations
      .filter((loc) => {
        const key = String(loc.country || "").toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((loc) => ({ value: loc.country, label: String(loc.country || "").toUpperCase() }));
  }, [locations]);

  const cities = useMemo(() => {
    if (!selectedCountry) return [];
    const seen = new Set();
    return locations
      .filter((loc) => loc.country === selectedCountry)
      .filter((loc) => {
        const key = String(loc.city || "").toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((loc) => ({ value: loc.city, label: loc.city }));
  }, [locations, selectedCountry]);

  const branches = useMemo(() => {
    if (!selectedCountry || !selectedCity) return [];
    return locations
      .filter((loc) => loc.country === selectedCountry && loc.city === selectedCity)
      .map((loc) => ({ value: loc.branch || "", label: loc.branch || "Main" }));
  }, [locations, selectedCountry, selectedCity]);

  const selectedLoc = locations.find(
    (loc) => loc.country === selectedCountry && loc.city === selectedCity && (loc.branch || "") === selectedBranch
  );

  return (
    <div className="form-step">
      <div className="step-header">
        <span className="step-icon">👥</span>
        <h3>Number of Employees</h3>
      </div>

      <p className="step-description">
        Enter employee count for each branch. Total employees are calculated automatically.
      </p>

      <div className="employee-input">
        {locations.length === 0 ? (
          <div className="employee-size-badge">Add locations first to map branch-level employees.</div>
        ) : (
          <>
            <div className="selector-grid">
              <div className="field-group">
                <label className="field-label">Region</label>
                <input className="field-input" value={data.region || ""} readOnly />
              </div>
              <div className="field-group">
                <label className="field-label">Country</label>
                <ThemedSelect
                  value={selectedCountry}
                  onChange={(v) => {
                    setSelectedCountry(v);
                    setSelectedCity("");
                    setSelectedBranch("");
                  }}
                  options={countries}
                  placeholder="Select country"
                />
              </div>
              <div className="field-group">
                <label className="field-label">City</label>
                <ThemedSelect
                  value={selectedCity}
                  onChange={(v) => {
                    setSelectedCity(v);
                    setSelectedBranch("");
                  }}
                  options={cities}
                  placeholder="Select city"
                  disabled={!selectedCountry}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Branch</label>
                <ThemedSelect
                  value={selectedBranch}
                  onChange={setSelectedBranch}
                  options={branches}
                  placeholder="Select branch"
                  disabled={!selectedCountry || !selectedCity}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Employees</label>
                <input
                  type="number"
                  className="field-input"
                  min="0"
                  value={entryCount}
                  onChange={(e) => setEntryCount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="field-group apply-group">
                <label className="field-label"> </label>
                <button
                  type="button"
                  className="apply-btn"
                  onClick={() => {
                    if (!selectedLoc) return;
                    updateBranchEmployees(selectedLoc, entryCount);
                    setEntryCount("");
                  }}
                  disabled={!selectedLoc || entryCount === ""}
                >
                  Apply
                </button>
              </div>
            </div>
            <div className="branch-grid">
            {locations.map((loc) => (
              <div key={keyFor(loc)} className="branch-row">
                <div className="branch-label">
                  {loc.country?.toUpperCase()} / {loc.city} / {loc.branch || "Main"}
                </div>
                <input
                  type="number"
                  className="field-input"
                  value={employeesFor(loc)}
                  placeholder="0"
                  min="0"
                  onChange={(e) => updateBranchEmployees(loc, e.target.value)}
                />
              </div>
            ))}
            </div>
          </>
        )}

        <div className="field-group total-group">
          <label className="field-label">
            Total Employees <span className="required">*</span>
          </label>
          <input
            type="number"
            className="field-input"
            value={data.employees}
            placeholder="0"
            min="0"
            readOnly
          />
        </div>

        {data.employees && (
          <div className="employee-size-badge">
            <FiUsers />
            <span>
              {data.employees < 50 ? "Small Business" :
               data.employees < 250 ? "Medium Business" :
               data.employees < 1000 ? "Large Business" : "Enterprise"}
            </span>
          </div>
        )}
      </div>

      <style jsx>{`
        .form-step {
          animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .step-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .step-icon {
          font-size: 32px;
        }

        .step-header h3 {
          font-size: 22px;
          font-weight: 700;
          color: #1B4D3E;
          margin: 0;
        }

        .step-description {
          color: #4A5568;
          margin-bottom: 32px;
          font-size: 15px;
          line-height: 1.6;
        }

        .employee-input {
          max-width: 100%;
        }
        .branch-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          margin-bottom: 16px;
        }
        .branch-row {
          display: grid;
          grid-template-columns: minmax(240px, 1fr) 180px;
          gap: 12px;
          align-items: center;
        }
        .selector-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 18px;
        }
        .apply-group {
          justify-content: flex-end;
        }
        .apply-group .field-label {
          visibility: hidden;
        }
        .apply-btn {
          border: none;
          border-radius: 8px;
          background: #2E7D64;
          color: white;
          padding: 10px 12px;
          font-weight: 600;
          cursor: pointer;
          min-height: 44px;
        }
        .apply-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .branch-label {
          font-size: 13px;
          color: #374151;
          font-weight: 600;
        }
        .total-group {
          max-width: 300px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .required {
          color: #DC2626;
        }

        .field-input {
          padding: 12px 16px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s ease;
          background: white;
        }

        .field-input:focus {
          outline: none;
          border-color: #2E7D64;
        }

        .employee-size-badge {
          margin-top: 16px;
          padding: 12px 16px;
          background: #F8FAF8;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #2E7D64;
          border: 1px solid #E5E7EB;
        }

        @media (max-width: 768px) {
          .branch-row {
            grid-template-columns: 1fr;
          }
          .selector-grid {
            grid-template-columns: 1fr;
          }
          .step-header {
            gap: 10px;
            margin-bottom: 12px;
          }
          .step-icon {
            font-size: 26px;
          }
          .step-header h3 {
            font-size: 18px;
          }
          .step-description {
            margin-bottom: 20px;
            font-size: 14px;
            line-height: 1.5;
          }
          .employee-input {
            max-width: 100%;
          }
          .field-input {
            width: 100%;
            font-size: 16px; /* prevent iOS zoom */
            padding: 11px 12px;
          }
          .employee-size-badge {
            font-size: 13px;
            padding: 10px 12px;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}