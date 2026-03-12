import React from "react";

export default function EmptyState({ message = "No data available" }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "40px 20px",
        color: "#6B7280", // Gray text
      }}
    >
      <p style={{ fontSize: "16px", fontWeight: "500" }}>{message}</p>
    </div>
  );
}
