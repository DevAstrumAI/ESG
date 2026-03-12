import React, { useState } from "react";
import { FiEye, FiEyeOff, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

export default function InputField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  disabled = false,
  error = "",
  success = false,
  helperText = "",
  icon = null,
  size = "md",
  variant = "default",
  className = "",
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  // Size configurations
  const sizeStyles = {
    sm: {
      container: "min-h-[36px]",
      input: "text-xs",
      icon: "text-base",
      padding: "px-3 py-2",
    },
    md: {
      container: "min-h-[42px]",
      input: "text-sm",
      icon: "text-lg",
      padding: "px-4 py-2.5",
    },
    lg: {
      container: "min-h-[48px]",
      input: "text-base",
      icon: "text-xl",
      padding: "px-5 py-3",
    },
  };

  // Variant configurations
  const variantStyles = {
    default: {
      container: "bg-white border border-gray-200 hover:border-gray-300",
      focus: "border-green-500 ring-2 ring-green-100",
    },
    outlined: {
      container: "bg-transparent border-2 border-gray-200 hover:border-gray-300",
      focus: "border-green-500 ring-0",
    },
    filled: {
      container: "bg-gray-50 border border-transparent hover:bg-gray-100",
      focus: "bg-white border-green-500 ring-2 ring-green-100",
    },
  };

  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];

  // Status styles
  const statusStyles = error 
    ? "border-red-500 hover:border-red-600 focus:border-red-500 focus:ring-red-100" 
    : success 
    ? "border-green-500" 
    : "";

  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label 
            htmlFor={name} 
            className="text-sm font-medium text-gray-700"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {helperText && !error && (
            <span className="text-xs text-gray-400">{helperText}</span>
          )}
        </div>
      )}

      {/* Input Container */}
      <div
        className={`
          relative flex items-center
          ${currentSize.container}
          ${currentVariant.container}
          ${statusStyles}
          rounded-xl
          transition-all duration-200
          ${disabled ? 'bg-gray-50 cursor-not-allowed opacity-60' : ''}
          ${isFocused && !error ? currentVariant.focus : ''}
        `}
      >
        {/* Left Icon */}
        {icon && (
          <span className={`absolute left-4 ${currentSize.icon} text-gray-400`}>
            {icon}
          </span>
        )}

        {/* Input */}
        <input
          type={inputType}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`
            w-full bg-transparent outline-none
            ${currentSize.input}
            ${currentSize.padding}
            ${icon ? 'pl-11' : 'pl-4'}
            ${isPassword || success || error ? 'pr-11' : 'pr-4'}
            placeholder:text-gray-400
            disabled:cursor-not-allowed
            ${error ? 'text-red-900' : 'text-gray-900'}
          `}
          {...props}
        />

        {/* Right Icons */}
        <div className="absolute right-4 flex items-center gap-2">
          {/* Password Toggle */}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
              tabIndex="-1"
            >
              {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          )}

          {/* Status Icons */}
          {success && !error && !isPassword && (
            <FiCheckCircle size={18} className="text-green-500" />
          )}
          {error && !isPassword && (
            <FiAlertCircle size={18} className="text-red-500" />
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 flex items-start gap-1.5 text-sm text-red-600">
          <FiAlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {success && !error && helperText && (
        <div className="mt-2 flex items-center gap-1.5 text-sm text-green-600">
          <FiCheckCircle size={14} />
          <span>{helperText}</span>
        </div>
      )}

      <style jsx>{`
        /* Remove number input spinners */
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }

        /* Autofill styles */
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px white inset;
          transition: background-color 5000s ease-in-out 0s;
        }

        /* Smooth transitions */
        input, .relative {
          transition: all 0.2s ease-in-out;
        }

        /* Focus animation */
        @keyframes gentlePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        .relative:focus-within {
          animation: gentlePulse 2s infinite;
        }
      `}</style>
    </div>
  );
}