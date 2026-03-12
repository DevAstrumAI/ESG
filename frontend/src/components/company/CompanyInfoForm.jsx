// src/components/company/CompanyInfoForm.jsx
import InputField from "../ui/InputField";
import { FiInfo } from "react-icons/fi";

export default function CompanyInfoForm({ data, updateField }) {
  return (
    <div className="form-step">
      <div className="step-header">
        <span className="step-icon">🏢</span>
        <h3>Company Information</h3>
      </div>
      
      <p className="step-description">
        Tell us about your company to get started with accurate emissions calculations.
      </p>

      <div className="form-fields">
        <div className="field-group">
          <InputField
            label="Company Name "
            value={data.name}
            placeholder="e.g., Acme Corporation"
            onChange={(e) => updateField("name", e.target.value)}
            required
            error={!data.name && "Company name is required"}
          />
          {!data.name && <span className="field-hint">This will be used for all reports</span>}
        </div>

        <div className="field-group">
          <InputField
            label="Company Description "
            value={data.description}
            placeholder="Brief description of your business activities"
            onChange={(e) => updateField("description", e.target.value)}
            multiline
            rows={3}
          />
          <span className="field-hint">
            <FiInfo /> Optional but helps with industry benchmarking
          </span>
        </div>
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

        .form-fields {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-hint {
          font-size: 12px;
          color: #6B7280;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}