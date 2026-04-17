import { useEffect, useMemo, useRef, useState } from "react";
import { FiChevronDown } from "react-icons/fi";

export default function ThemedSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  disabled = false,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selectedLabel = useMemo(() => {
    const selected = options.find((opt) => opt.value === value);
    return selected?.label || placeholder;
  }, [options, placeholder, value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (nextValue) => {
    setOpen(false);
    onChange?.(nextValue);
  };

  return (
    <div ref={rootRef} className={`ts-root ${className}`.trim()}>
      <button
        type="button"
        className={`ts-trigger ${open ? "open" : ""}`}
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
      >
        <span className={`ts-label ${!value ? "placeholder" : ""}`}>{selectedLabel}</span>
        <FiChevronDown className={`ts-chevron ${open ? "open" : ""}`} />
      </button>

      {open && !disabled && (
        <div className="ts-menu" role="listbox">
          <button
            type="button"
            className={`ts-option ${value === "" ? "active" : ""}`}
            onClick={() => handleSelect("")}
          >
            {placeholder}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`ts-option ${value === opt.value ? "active" : ""}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .ts-root {
          position: relative;
          width: 100%;
        }
        .ts-trigger {
          width: 100%;
          min-height: 42px;
          padding: 10px 12px;
          border: 1px solid #D1D5DB;
          border-radius: 10px;
          background: #FFFFFF;
          color: #111827;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          cursor: pointer;
          transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        .ts-trigger:hover:not(:disabled) {
          border-color: #9CA3AF;
          background: #FCFDFD;
        }
        .ts-trigger.open {
          border-color: #2E7D64;
          box-shadow: 0 0 0 3px rgba(46, 125, 100, 0.14);
          background: #FFFFFF;
        }
        .ts-trigger:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .ts-label {
          font-size: 14px;
          font-weight: 500;
          text-align: left;
        }
        .ts-label.placeholder {
          color: #6B7280;
          font-weight: 400;
        }
        .ts-chevron {
          flex-shrink: 0;
          color: #6B7280;
          transition: transform 0.18s ease;
        }
        .ts-chevron.open {
          transform: rotate(180deg);
        }
        .ts-menu {
          position: absolute;
          z-index: 50;
          left: 0;
          right: 0;
          margin-top: 6px;
          max-height: 260px;
          overflow-y: auto;
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.14);
          padding: 4px;
        }
        .ts-option {
          width: 100%;
          border: none;
          background: transparent;
          color: #111827;
          text-align: left;
          padding: 9px 10px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }
        .ts-option:hover {
          background: #F3F4F6;
        }
        .ts-option.active {
          background: #E8F5F0;
          color: #1F6F5B;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
