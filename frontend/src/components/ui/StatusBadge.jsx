import React from "react";

const colors = {
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
};

export default function StatusBadge({ text, variant = "info" }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "9999px",
        backgroundColor: colors[variant] || colors.info,
        color: "white",
        fontSize: "12px",
        fontWeight: 500,
      }}
    >
      {text}
    </span>
  );
}
