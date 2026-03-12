import React from "react";
import { FiArrowUp, FiArrowDown } from "react-icons/fi";

export default function KPIDelta({ value }) {
  const isPositive = value >= 0;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "12px",
        fontWeight: 600,
        color: isPositive ? "#16A34A" : "#EF4444",
      }}
    >
      {isPositive ? <FiArrowUp /> : <FiArrowDown />}
      {Math.abs(value)}%
    </span>
  );
}
