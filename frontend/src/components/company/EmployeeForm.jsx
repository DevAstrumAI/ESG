// src/components/company/EmployeeForm.jsx
import { FiUsers } from "react-icons/fi";

export default function EmployeeForm({ data, updateField }) {
  return (
    <div className="form-step">
      <div className="step-header">
        <span className="step-icon">👥</span>
        <h3>Number of Employees</h3>
      </div>

      <p className="step-description">
        Company size helps us calculate emissions intensity and benchmarks.
      </p>

      <div className="employee-input">
        <div className="field-group">
          <label className="field-label">
            Number of Employees <span className="required">*</span>
          </label>
          <input
            type="number"
            className="field-input"
            value={data.employees}
            placeholder="e.g., 250"
            onChange={(e) => updateField("employees", e.target.value)}
            min="1"
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
      `}</style>
    </div>
  );
}