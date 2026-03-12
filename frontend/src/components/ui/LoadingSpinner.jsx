import React from "react";

export default function LoadingSpinner({ size = 40 }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "16px" }}>
      <div
        style={{
          width: size,
          height: size,
          border: `${size / 8}px solid #E5E7EB`,
          borderTop: `${size / 8}px solid #16A34A`,
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
