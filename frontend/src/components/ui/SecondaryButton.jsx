// src/components/ui/SecondaryButton.jsx
import React from "react";

export default function SecondaryButton({ children, onClick, disabled = false, style = {}, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        padding: "0.5rem 1rem",
        fontSize: "14px",
        fontWeight: 600,
        borderRadius: "6px",
        backgroundColor: "#E5E7EB",
        color: "#111827",
        border: "1px solid #D1D5DB",
        cursor: "pointer",
        transition: "0.2s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
