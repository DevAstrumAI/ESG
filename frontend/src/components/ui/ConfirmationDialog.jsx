// src/components/ui/ConfirmationDialog.jsx
import React from 'react';
import { FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';

export default function ConfirmationDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "info",
  options = null
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <FiAlertCircle className="icon danger" />;
      case 'success':
        return <FiCheck className="icon success" />;
      default:
        return <div className="icon info">?</div>;
    }
  };

  const getButtonStyle = () => {
    switch (type) {
      case 'danger':
        return 'btn-danger';
      case 'success':
        return 'btn-success';
      default:
        return 'btn-primary';
    }
  };

  const handleOptionClick = (value) => {
    if (onConfirm) onConfirm(value);
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-container" onClick={(e) => e.stopPropagation()}>
        <button className="dialog-close" onClick={onClose}>
          <FiX />
        </button>
        
        <div className="dialog-header">
          {getIcon()}
          <h3>{title}</h3>
        </div>
        
        <div className="dialog-body">
          <p>{message}</p>
          {options && (
            <div className="dialog-options">
              {options.map((option, index) => (
                <button
                  key={index}
                  className="dialog-option-btn"
                  onClick={() => handleOptionClick(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {!options && (
          <div className="dialog-footer">
            <button className="btn-secondary" onClick={onClose}>
              {cancelText}
            </button>
            <button className={getButtonStyle()} onClick={() => onConfirm && onConfirm()}>
              {confirmText}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .dialog-container {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 420px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          animation: slideUp 0.3s ease;
          position: relative;
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .dialog-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          cursor: pointer;
          color: #9CA3AF;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s;
        }
        
        .dialog-close:hover {
          background: #F3F4F6;
          color: #374151;
        }
        
        .dialog-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 24px 24px 16px 24px;
          border-bottom: 1px solid #E5E7EB;
        }
        
        .icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 18px;
          font-weight: 600;
        }
        
        .icon.info {
          background: #E0F2FE;
          color: #0284C7;
        }
        
        .icon.danger {
          background: #FEE2E2;
          color: #DC2626;
        }
        
        .icon.success {
          background: #D1FAE5;
          color: #059669;
        }
        
        .dialog-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1F2937;
          margin: 0;
        }
        
        .dialog-body {
          padding: 20px 24px;
        }
        
        .dialog-body p {
          margin: 0;
          font-size: 14px;
          color: #4B5563;
          line-height: 1.5;
        }
        
        .dialog-options {
          display: flex;
          gap: 12px;
          margin-top: 20px;
          flex-wrap: wrap;
        }
        
        .dialog-option-btn {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          background: white;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .dialog-option-btn:hover {
          border-color: #2E7D64;
          background: #F0FDF4;
          color: #2E7D64;
        }
        
        .dialog-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px 24px 24px;
          border-top: 1px solid #E5E7EB;
        }
        
        .btn-secondary {
          padding: 10px 20px;
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #6B7280;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-secondary:hover {
          background: #F9FAFB;
          border-color: #D1D5DB;
        }
        
        .btn-primary {
          padding: 10px 20px;
          background: #2E7D64;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-primary:hover {
          background: #1B4D3E;
        }
        
        .btn-danger {
          padding: 10px 20px;
          background: #DC2626;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-danger:hover {
          background: #B91C1C;
        }
        
        .btn-success {
          padding: 10px 20px;
          background: #059669;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-success:hover {
          background: #047857;
        }
      `}</style>
    </div>
  );
}