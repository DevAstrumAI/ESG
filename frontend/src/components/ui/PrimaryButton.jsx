// src/components/ui/PrimaryButton.jsx
import React from "react";

export default function PrimaryButton({ 
  children, 
  onClick, 
  disabled = false, 
  style = {}, 
  className = "",
  type = "button"
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        padding: "0.75rem 1.5rem",
        fontSize: "15px",
        fontWeight: 600,
        borderRadius: "30px", // More rounded, pill-shaped
        background: "linear-gradient(135deg, #22C55E 0%, #15803D 100%)",
        color: "#fff",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        boxShadow: "0 4px 6px rgba(34, 197, 94, 0.2)",
        transition: "all 0.2s ease",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 6px 10px rgba(34, 197, 94, 0.3)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 6px rgba(34, 197, 94, 0.2)";
        }
      }}
    >
      {children}
    </button>
  );
}