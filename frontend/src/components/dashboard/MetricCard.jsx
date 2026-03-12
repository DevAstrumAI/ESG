import React from "react";

export default function MetricCard({ title, subtitle, percent, color }) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #E0E0E0",
        borderRadius: "8px",
        padding: "20px",
      }}
    >
      {/* Title */}
      <h3 style={{ fontSize: "18px", fontWeight: "700" }}>{title}</h3>

      {/* Subtitle */}
      <p
        style={{
          fontSize: "14px",
          color: "#666",
          marginTop: "4px",
        }}
      >
        {subtitle}
      </p>

      {/* Percentage */}
      <p
        style={{
          fontSize: "24px",
          fontWeight: "800",
          marginTop: "12px",
          color: color,
        }}
      >
        {percent}%
      </p>

      {/* Progress Bar */}
      <div
        style={{
          width: "100%",
          height: "8px",
          background: "#EAEAEA",
          borderRadius: "6px",
          overflow: "hidden",
          marginTop: "8px",
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background: color,
          }}
        />
      </div>
    </div>
  );
}
