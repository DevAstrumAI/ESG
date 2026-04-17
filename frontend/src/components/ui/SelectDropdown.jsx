import React from "react";
import ThemedSelect from "./ThemedSelect";

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
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <ThemedSelect
          value={value}
          onChange={(nextValue) => onChange?.({ target: { value: nextValue } })}
          options={options}
          placeholder="Select an option"
        />
      </div>

      {/* Error Message */}
      {error && (
        <p style={{ color: "#DC2626", marginTop: "6px", fontSize: "13px" }}>
          {error}
        </p>
      )}
    </div>
  );
}
