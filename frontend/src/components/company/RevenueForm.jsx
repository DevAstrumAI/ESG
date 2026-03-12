// src/components/company/RevenueForm.jsx
import InputField from "../ui/InputField";
import { FiDollarSign } from "react-icons/fi";
import { useState } from "react";

export default function RevenueForm({ data, updateField }) {
  const [currency, setCurrency] = useState("USD");

  return (
    <div className="form-step">
      <div className="step-header">
        <span className="step-icon">💰</span>
        <h3>Annual Revenue</h3>
      </div>

      <p className="step-description">
        Revenue data helps with intensity-based emissions tracking.
      </p>

      <div className="revenue-input">
        <div className="currency-selector">
          <select 
            value={currency} 
            onChange={(e) => setCurrency(e.target.value)}
            className="currency-select"
          >
            <option value="USD">USD $</option>
            <option value="EUR">EUR €</option>
            <option value="GBP">GBP £</option>
            <option value="AED">AED د.إ</option>
            <option value="INR">INR ₹</option>
          </select>
        </div>

        <InputField
          label="Annual Revenue"
          type="number"
          value={data.revenue}
          placeholder="e.g., 5000000"
          onChange={(e) => updateField("revenue", e.target.value)}
          min="0"
          required
        />

        {data.revenue && (
          <div className="revenue-formatted">
            {new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: currency,
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(data.revenue)}
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
          color: #14532D;
          margin: 0;
        }

        .step-description {
          color: #4B5563;
          margin-bottom: 32px;
          font-size: 15px;
          line-height: 1.6;
        }

        .revenue-input {
          max-width: 400px;
        }

        .currency-selector {
          margin-bottom: 12px;
        }

        .currency-select {
          padding: 10px 16px;
          border: 2px solid #E5E7EB;
          border-radius: 12px;
          font-size: 14px;
          color: #1F2937;
          background: white;
          cursor: pointer;
          outline: none;
          width: 120px;
        }

        .currency-select:focus {
          border-color: #22C55E;
        }

        .revenue-formatted {
          margin-top: 16px;
          padding: 12px 16px;
          background: #F0FDF4;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 600;
          color: #15803D;
          border: 1px solid rgba(34, 197, 94, 0.2);
          text-align: center;
        }
      `}</style>
    </div>
  );
}