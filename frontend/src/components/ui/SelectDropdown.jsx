import React from "react";

export default function SelectDropdown({
  label,
  value,
  onChange,
  options = [],
  error = "",
}) {
  return (
    <div style={{ marginBottom: "16px" }}>
      {/* Label */}
      {label && (
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontWeight: "600",
            color: "#111827",
          }}
        >
          {label}
        </label>
      )}

      {/* Dropdown */}
      <select
        value={value}
        onChange={onChange}
        style={{
          width: "50%",
          padding: "10px",
          borderRadius: "8px",
          border: error ? "1px solid #DC2626" : "1px solid #D1D5DB",
          fontSize: "14px",
          backgroundColor: "white",
        }}
      >
        {/* Default Placeholder */}
        <option value="">Select an option</option>

        {/* Options */}
        {options.map((opt, index) => (
          <option key={index} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Error Message */}
      {error && (
        <p style={{ color: "#DC2626", marginTop: "6px", fontSize: "13px" }}>
          {error}
        </p>
      )}
    </div>
  );
}
