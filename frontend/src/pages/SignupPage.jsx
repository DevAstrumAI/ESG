// src/pages/SignupPage.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { FiMail, FiLock, FiUser, FiUserPlus, FiAlertCircle, FiCheckCircle, FiWifiOff } from "react-icons/fi";
import { BiLeaf } from "react-icons/bi";
import Card from "../components/ui/Card";
import PrimaryButton from "../components/ui/PrimaryButton";

export default function SignupPage() {
  const navigate = useNavigate();
  const { register, loading, error: storeError, clearError } = useAuthStore();
  
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, message: "" });

  // Monitor online/offline status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ✅ TC-004: Validate signup fields
  const validateSignupFields = () => {
    const errors = {};
    
    if (!displayName || displayName.trim().length < 2) {
      errors.displayName = "Name must be at least 2 characters.";
    }
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address.";
    }
    
    if (!password || password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    } else if (!/[A-Z]/.test(password)) {
      errors.password = "Password must contain at least one uppercase letter.";
    } else if (!/[0-9]/.test(password)) {
      errors.password = "Password must contain at least one number.";
    }
    
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    
    return errors;
  };

  // ✅ TC-004: Calculate password strength
  const calculatePasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    
    let message = "";
    if (pwd.length === 0) {
      message = "";
    } else if (score <= 2) {
      message = "Weak password";
    } else if (score <= 4) {
      message = "Medium password";
    } else {
      message = "Strong password";
    }
    
    return { score, message };
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(calculatePasswordStrength(newPassword));
    
    // Clear field error when user starts typing
    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: "" }));
    }
  };

  // Map Firebase/auth errors to user-friendly messages
  const getFriendlyAuthError = (error) => {
    const code = error?.code || error?.message || "";
    
    if (code.includes("email-already-in-use")) {
      return "An account with this email already exists. Please login instead.";
    }
    if (code.includes("weak-password")) {
      return "Password is too weak. Please use a stronger password.";
    }
    if (code.includes("invalid-email")) {
      return "Please enter a valid email address.";
    }
    if (code.includes("network-request-failed")) {
      return "Connection failed. Please check your internet.";
    }
    return "Registration failed. Please try again.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setLocalError("");
    setFieldErrors({});
    
    // ✅ TC-005: Check network connectivity first
    if (!navigator.onLine) {
      setLocalError("You appear to be offline. Please check your internet connection and try again.");
      return;
    }
    
    // ✅ TC-004: Validate fields before API call
    const errors = validateSignupFields();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    
    try {
      const result = await register(email, password, displayName.trim());
      if (result.success) {
        navigate("/company-setup");
      } else {
        setLocalError(getFriendlyAuthError(result.error));
      }
    } catch (error) {
      console.error("Signup error:", error);
      
      // ✅ TC-005: Handle network/fetch errors specifically
      if (!navigator.onLine) {
        setLocalError("You appear to be offline. Please check your internet connection.");
      } else if (error.message?.includes("fetch") || error.name === "TypeError") {
        setLocalError("Cannot reach the server. Please check if the backend is running at http://localhost:8001");
      } else {
        setLocalError(getFriendlyAuthError(error));
      }
    }
  };

  const clearFieldError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const displayError = localError || storeError;

  return (
    <div className="signup-container">
      <div className="signup-left">
        <div className="brand-section">
          <div className="logo">
            <BiLeaf size={32} color="#fff" />
            <span>Lumyna</span>
          </div>
          <h1>Create Account</h1>
          <p>Join Lumyna to start tracking your ESG journey</p>
        </div>
        <div className="benefits-list">
          <div className="benefit-item">
            <div className="benefit-icon">✓</div>
            <div>
              <h4>Free Trial</h4>
              <p>30 days free access to all features</p>
            </div>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">✓</div>
            <div>
              <h4>No Credit Card Required</h4>
              <p>Start immediately, upgrade anytime</p>
            </div>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">✓</div>
            <div>
              <h4>Full Access</h4>
              <p>All features included in trial</p>
            </div>
          </div>
        </div>
      </div>

      <div className="signup-right">
        <Card className="signup-card">
          <div className="card-header">
            <h2>Sign Up</h2>
            <p>Enter your details to create your account</p>
          </div>

          {/* ✅ TC-005: Offline warning banner */}
          {!isOnline && (
            <div className="offline-banner">
              <FiWifiOff size={16} />
              <span>You are currently offline. Please check your internet connection.</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="displayName">Full Name</label>
              <div className={`input-wrapper ${fieldErrors.displayName ? 'error' : ''}`}>
                <FiUser className="input-icon" />
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    clearFieldError("displayName");
                  }}
                  placeholder="John Doe"
                  disabled={loading}
                />
              </div>
              {fieldErrors.displayName && (
                <div className="field-error">{fieldErrors.displayName}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className={`input-wrapper ${fieldErrors.email ? 'error' : ''}`}>
                <FiMail className="input-icon" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError("email");
                  }}
                  placeholder="you@company.com"
                  disabled={loading}
                />
              </div>
              {fieldErrors.email && (
                <div className="field-error">{fieldErrors.email}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className={`input-wrapper ${fieldErrors.password ? 'error' : ''}`}>
                <FiLock className="input-icon" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
              {password && (
                <div className={`password-strength strength-${passwordStrength.score}`}>
                  <span>{passwordStrength.message}</span>
                  <div className="strength-bar">
                    <div className="strength-fill" style={{ width: `${(passwordStrength.score / 5) * 100}%` }} />
                  </div>
                </div>
              )}
              {fieldErrors.password && (
                <div className="field-error">{fieldErrors.password}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className={`input-wrapper ${fieldErrors.confirmPassword ? 'error' : ''}`}>
                <FiLock className="input-icon" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearFieldError("confirmPassword");
                  }}
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
              {fieldErrors.confirmPassword && (
                <div className="field-error">{fieldErrors.confirmPassword}</div>
              )}
              {confirmPassword && password === confirmPassword && password.length > 0 && (
                <div className="field-success">
                  <FiCheckCircle size={14} /> Passwords match
                </div>
              )}
            </div>

            {displayError && (
              <div className="error-message">
                <FiAlertCircle size={16} />
                <span>{displayError}</span>
              </div>
            )}

            <PrimaryButton 
              type="submit" 
              disabled={loading || !isOnline}
              className="signup-btn"
            >
              {loading ? "Creating account..." : "Create Account"}
              <FiUserPlus size={16} />
            </PrimaryButton>
          </form>

          <div className="card-footer">
            <p>
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </Card>
      </div>

      <style jsx>{`
        .signup-container {
          display: flex;
          min-height: 100vh;
        }
        
        .signup-left {
          flex: 1;
          background: linear-gradient(135deg, #1B4D3E 0%, #2E7D64 100%);
          padding: 48px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          color: white;
        }
        
        .brand-section .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 48px;
        }
        
        .brand-section .logo span {
          font-size: 24px;
          font-weight: 700;
        }
        
        .brand-section h1 {
          font-size: 36px;
          margin-bottom: 16px;
        }
        
        .brand-section p {
          font-size: 16px;
          opacity: 0.9;
        }
        
        .benefits-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .benefit-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }
        
        .benefit-icon {
          width: 28px;
          height: 28px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
        }
        
        .benefit-item h4 {
          font-size: 16px;
          margin: 0 0 4px;
        }
        
        .benefit-item p {
          font-size: 13px;
          opacity: 0.8;
          margin: 0;
        }
        
        .signup-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F9FAFB;
          padding: 48px;
        }
        
        .signup-card {
          width: 100%;
          max-width: 480px;
          padding: 32px;
        }
        
        .card-header {
          text-align: center;
          margin-bottom: 32px;
        }
        
        .card-header h2 {
          font-size: 28px;
          font-weight: 700;
          color: #1B4D3E;
          margin: 0 0 8px;
        }
        
        .card-header p {
          color: #6B7280;
          margin: 0;
        }
        
        .offline-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #FEF3C7;
          border: 1px solid #F59E0B;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
          font-size: 13px;
          color: #92400E;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
        }
        
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .input-wrapper.error input {
          border-color: #EF4444;
        }
        
        .input-icon {
          position: absolute;
          left: 12px;
          color: #9CA3AF;
          font-size: 18px;
        }
        
        .input-wrapper input {
          width: 100%;
          padding: 12px 12px 12px 40px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s;
        }
        
        .input-wrapper input:focus {
          outline: none;
          border-color: #2E7D64;
          box-shadow: 0 0 0 3px rgba(46, 125, 100, 0.1);
        }
        
        .input-wrapper input:disabled {
          background: #F3F4F6;
          cursor: not-allowed;
        }
        
        .field-error {
          font-size: 12px;
          color: #EF4444;
          margin-top: 6px;
        }
        
        .field-success {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #10B981;
          margin-top: 6px;
        }
        
        .password-strength {
          margin-top: 8px;
        }
        
        .password-strength span {
          font-size: 12px;
          color: #6B7280;
        }
        
        .strength-bar {
          height: 4px;
          background: #E5E7EB;
          border-radius: 2px;
          margin-top: 4px;
          overflow: hidden;
        }
        
        .strength-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s;
        }
        
        .strength-0 .strength-fill { background: #EF4444; width: 20%; }
        .strength-1 .strength-fill { background: #F59E0B; width: 40%; }
        .strength-2 .strength-fill { background: #F59E0B; width: 60%; }
        .strength-3 .strength-fill { background: #10B981; width: 80%; }
        .strength-4 .strength-fill { background: #10B981; width: 100%; }
        .strength-5 .strength-fill { background: #10B981; width: 100%; }
        
        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
          font-size: 13px;
          color: #DC2626;
        }
        
        .signup-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          font-size: 16px;
        }
        
        .card-footer {
          text-align: center;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #E5E7EB;
        }
        
        .card-footer p {
          margin: 0;
          font-size: 14px;
          color: #6B7280;
        }
        
        .card-footer a {
          color: #2E7D64;
          text-decoration: none;
          font-weight: 600;
        }
        
        .card-footer a:hover {
          text-decoration: underline;
        }
        
        @media (max-width: 768px) {
          .signup-container {
            flex-direction: column;
          }
          .signup-left {
            padding: 32px;
            min-height: 280px;
          }
          .benefits-list {
            display: none;
          }
          .signup-right {
            padding: 32px;
          }
        }
      `}</style>
    </div>
  );
}