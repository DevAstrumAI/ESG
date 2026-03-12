// src/components/company/EmployeeForm.jsx
import InputField from "../ui/InputField";
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
        <InputField
          label="Employees"
          type="number"
          value={data.employees}
          placeholder="e.g., 250"
          onChange={(e) => updateField("employees", e.target.value)}
          min="1"
          required
        />

        <div className="employee-size-badge">
          <FiUsers />
          <span>
            {data.employees ? (
              <>
                {data.employees < 50 ? "Small Business" :
                 data.employees < 250 ? "Medium Business" :
                 data.employees < 1000 ? "Large Business" : "Enterprise"}
              </>
            ) : (
              "Enter employee count"
            )}
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

        .employee-input {
          max-width: 300px;
        }

        .employee-size-badge {
          margin-top: 16px;
          padding: 12px 16px;
          background: #F0FDF4;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #15803D;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }
      `}</style>
    </div>
  );
}