// src/components/company/RevenueForm.jsx
import { useState } from "react";
import { FiDollarSign } from "react-icons/fi";
import ThemedSelect from "../ui/ThemedSelect";

export default function RevenueForm({ data, updateField }) {
  const [currency, setCurrency] = useState("USD");
  const currencyOptions = [
    { value: "USD", label: "USD ($)" },
    { value: "EUR", label: "EUR (€)" },
    { value: "GBP", label: "GBP (£)" },
    { value: "AED", label: "AED (د.إ)" },
  ];

  const formatRevenue = (value) => {
    if (!value) return "";
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="form-step">
      <div className="step-header">
        <FiDollarSign className="step-icon" />
        <h3>Annual Revenue</h3>
      </div>

      <p className="step-description">
        Revenue data helps with intensity-based emissions tracking.
      </p>

      <div className="revenue-input">
        <div className="field-group">
          <label className="field-label">Currency</label>
          <ThemedSelect
            value={currency}
            onChange={(nextCurrency) => setCurrency(nextCurrency || "USD")}
            options={currencyOptions}
            placeholder="Select currency"
            className="field-select"
          />
        </div>

        <div className="field-group">
          <label className="field-label">
            Annual Revenue <span className="required">*</span>
          </label>
          <input
            type="number"
            className="field-input"
            value={data.revenue}
            placeholder="e.g., 5000000"
            onChange={(e) => updateField("revenue", e.target.value)}
            min="0"
          />
        </div>

        {data.revenue && (
          <div className="revenue-formatted">
            {formatRevenue(data.revenue)}
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

        .revenue-input {
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 20px;
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

        .field-input, .field-select {
          padding: 12px 16px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s ease;
          background: #FFFFFF;
          color: #111827;
        }

        .field-input:focus, .field-select:focus {
          outline: none;
          border-color: #2E7D64;
        }

        .field-select {
          cursor: pointer;
          color-scheme: light;
          -webkit-appearance: none;
          appearance: none;
        }

        .field-select option {
          background: #FFFFFF;
          color: #111827;
        }

        .revenue-formatted {
          padding: 12px 16px;
          background: #F8FAF8;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          color: #2E7D64;
          border: 1px solid #E5E7EB;
          text-align: center;
        }

        @media (max-width: 768px) {
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
            max-width: 100%;
            gap: 14px;
          }
          .field-input,
          .field-select {
            width: 100%;
            font-size: 16px; /* prevent iOS zoom */
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