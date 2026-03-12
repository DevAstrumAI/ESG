import React from "react";

export default function SetupPrompt({ isComplete = false }) {
  console.log("SetupPrompt loaded");

  if (isComplete) return null;

  return (
    <div style={{
      background: "#FFEB3B",
      padding: "15px",
      borderRadius: "8px",
      marginTop: "20px"
    }}>
      <strong>Setup Incomplete:</strong> Please complete company setup to unlock full features.
    </div>
  );
}
