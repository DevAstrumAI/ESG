import React, { useEffect, useState } from "react";
import SecondaryButton from "./SecondaryButton";

export default function Modal({ title, children, isOpen, onClose }) {
  const [visible, setVisible] = useState(isOpen);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setTimeout(() => setAnimate(true), 10); // trigger animation
    } else {
      setAnimate(false);
      const timer = setTimeout(() => setVisible(false), 200); // match transition
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.4)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        opacity: animate ? 1 : 0,
        transition: "opacity 0.2s ease",
      }}
    >
      {/* Modal Box */}
      <div
        style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "12px",
          width: "400px",
          maxWidth: "90%",
          boxShadow: "0px 4px 12px rgba(0,0,0,0.15)",
          transform: animate ? "scale(1)" : "scale(0.95)",
          transition: "transform 0.2s ease",
        }}
      >
        {/* Header */}
        <h2 style={{ fontSize: "18px", fontWeight: "700" }}>{title}</h2>

        {/* Content */}
        <div style={{ marginTop: "12px", marginBottom: "20px" }}>{children}</div>

        {/* Footer */}
        <SecondaryButton onClick={onClose}>Close</SecondaryButton>
      </div>
    </div>
  );
}
