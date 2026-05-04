// src/components/company/RevenueForm.jsx
import { useMemo, useState } from "react";
import { FiDollarSign } from "react-icons/fi";
import ThemedSelect from "../ui/ThemedSelect";

export default function RevenueForm({ data, updateField }) {
  const locations = data.locations || [];
  const branchRevenue = data.branchRevenue || [];
  const currency = data.revenueCurrency || "USD";

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [entryAmount, setEntryAmount] = useState("");

  const currencyOptions = [
    { value: "USD", label: "USD ($)" },
    { value: "EUR", label: "EUR (€)" },
    { value: "GBP", label: "GBP (£)" },
    { value: "AED", label: "AED (د.إ)" },
  ];

  const keyFor = (loc) =>
    `${String(loc.region || "").toLowerCase()}|${String(loc.country || "").toLowerCase()}|${String(loc.city || "").toLowerCase()}|${String(loc.branch || "").toLowerCase()}`;

  const revenueFor = (loc) => {
    const k = keyFor(loc);
    const found = branchRevenue.find((b) => keyFor(b) === k);
    const v = found?.revenue;
    return v === undefined || v === null ? "" : String(found.revenue);
  };

  const updateBranchRevenue = (loc, value) => {
    const parsed = Number(value);
    const sanitized = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    const k = keyFor(loc);
    const next = [...branchRevenue];
    const idx = next.findIndex((b) => keyFor(b) === k);
    const row = {
      region: loc.region || data.region || "",
      country: loc.country,
      city: loc.city,
      branch: loc.branch || "",
      revenue: sanitized,
    };
    if (idx >= 0) next[idx] = row;
    else next.push(row);
    updateField("branchRevenue", next);
    const total = next.reduce((sum, b) => sum + (Number(b.revenue) || 0), 0);
    updateField("revenue", total > 0 ? String(total) : "");
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

  const formatRevenue = (value) => {
    if (value === "" || value === null || value === undefined) return "";
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return "";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  };

  return (
    <div className="form-step">
      <div className="step-header">
        <FiDollarSign className="step-icon" />
        <h3>Annual Revenue</h3>
      </div>

      <p className="step-description">
        Enter annual revenue for each branch. Total revenue is calculated automatically and supports intensity-based reporting.
      </p>

      <div className="revenue-input">
        <div className="field-group">
          <label className="field-label">Currency</label>
          <ThemedSelect
            value={currency}
            onChange={(nextCurrency) => updateField("revenueCurrency", nextCurrency || "USD")}
            options={currencyOptions}
            placeholder="Select currency"
            className="field-select"
          />
        </div>

        {locations.length === 0 ? (
          <div className="revenue-size-badge">Add locations first to map branch-level revenue.</div>
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
                <label className="field-label">Amount</label>
                <input
                  type="number"
                  className="field-input"
                  min="0"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
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
                    updateBranchRevenue(selectedLoc, entryAmount);
                    setEntryAmount("");
                  }}
                  disabled={!selectedLoc || entryAmount === ""}
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
                    value={revenueFor(loc)}
                    placeholder="0"
                    min="0"
                    onChange={(e) => updateBranchRevenue(loc, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        <div className="field-group total-group">
          <label className="field-label">
            Total Annual Revenue <span className="required">*</span>
          </label>
          <input
            type="text"
            className="field-input"
            value={data.revenue}
            placeholder="0"
            readOnly
          />
        </div>

        {data.revenue && Number(data.revenue) > 0 && (
          <div className="revenue-formatted">{formatRevenue(data.revenue)}</div>
        )}
      </div>

      <style jsx>{`
        .form-step {
          animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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
          color: #1b4d3e;
          margin: 0;
        }

        .step-description {
          color: #4a5568;
          margin-bottom: 32px;
          font-size: 15px;
          line-height: 1.6;
        }

        .revenue-input {
          max-width: 100%;
          display: flex;
          flex-direction: column;
          gap: 20px;
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
          background: #2e7d64;
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
          color: #dc2626;
        }

        .field-input,
        .field-select {
          padding: 12px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s ease;
          background: #ffffff;
          color: #111827;
        }

        .field-input:focus,
        .field-select:focus {
          outline: none;
          border-color: #2e7d64;
        }

        .field-select {
          cursor: pointer;
          color-scheme: light;
          -webkit-appearance: none;
          appearance: none;
        }

        .field-select option {
          background: #ffffff;
          color: #111827;
        }

        .revenue-formatted {
          padding: 12px 16px;
          background: #f8faf8;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          color: #2e7d64;
          border: 1px solid #e5e7eb;
          text-align: center;
        }

        .revenue-size-badge {
          padding: 12px 16px;
          background: #fefce8;
          border-radius: 8px;
          font-size: 14px;
          color: #854d0e;
          border: 1px solid #fde047;
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
          .revenue-input {
            gap: 14px;
          }
          .field-input,
          .field-select {
            width: 100%;
            font-size: 16px;
            padding: 11px 12px;
          }
          .revenue-formatted {
            font-size: 16px;
            padding: 10px 12px;
          }
        }
      `}</style>
    </div>
  );
}
