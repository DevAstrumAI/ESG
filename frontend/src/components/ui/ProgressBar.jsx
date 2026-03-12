import React from "react";

export default function ProgressBar({ value }) {
  return (
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
          width: `${value}%`,
          height: "100%",
          background: "green",
          borderRadius: "6px",
        }}
      />
    </div>
  );
}
