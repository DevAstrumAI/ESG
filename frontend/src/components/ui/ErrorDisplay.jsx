import React from "react";

export default function ErrorDisplay({ message }) {
  if (!message) return null; // Nothing to show

  return (
    <p
      style={{
        color: "#DC2626", // Red color
        fontSize: "13px",
        marginTop: "6px",
        marginBottom: "0",
      }}
    >
      {message}
    </p>
  );
}
