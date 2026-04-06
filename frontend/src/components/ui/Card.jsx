// src/components/ui/Card.jsx
import React, { forwardRef } from "react";

const Card = forwardRef(({ children, className = "", style = {} }, ref) => {
  return (
    <div
      ref={ref}
      className={`card ${className}`}
      style={{
        background: "white",
        borderRadius: "var(--radius-xl, 24px)",
        boxShadow: "var(--shadow-card, 0 10px 25px -5px rgba(46, 125, 50, 0.1))",
        overflow: "hidden",
        marginBottom: "24px",
        border: "1px solid rgba(46, 125, 50, 0.1)",
        transition: "all 0.2s ease",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  );
});

export default Card;