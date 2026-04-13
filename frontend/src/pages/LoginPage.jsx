// src/pages/LoginPage.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { FiMail, FiLock, FiLogIn, FiAlertCircle, FiWifiOff } from "react-icons/fi";
import { BiLeaf } from "react-icons/bi";
import Card from "../components/ui/Card";
import PrimaryButton from "../components/ui/PrimaryButton";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error: storeError, clearError } = useAuthStore();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  // Map Firebase/auth errors to user-friendly messages
  const getFriendlyAuthError = (error) => {
    const code = error?.code || error?.message || "";
    
    if (code.includes("wrong-password") || code.includes("invalid-credential") || code.includes("invalid-login-credentials")) {
      return "Incorrect email or password. Please try again.";
    }
    if (code.includes("user-not-found")) {
      return "No account found with this email address.";
    }
    if (code.includes("too-many-requests")) {
      return "Too many failed attempts. Please try again in a few minutes.";
    }
    if (code.includes("user-disabled")) {
      return "This account has been disabled. Please contact support.";
    }
    if (code.includes("network-request-failed")) {
      return "Connection failed. Please check your internet and try again.";
    }
    return "Login failed. Please try again.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setLocalError("");
    
    // ✅ TC-005: Check network connectivity first
    if (!navigator.onLine) {
      setLocalError("You appear to be offline. Please check your internet connection and try again.");
      return;
    }
    
    if (!email || !password) {
      setLocalError("Please enter both email and password.");
      return;
    }
    
    try {
      const result = await login(email, password);
      if (result.success) {
        navigate("/dashboard");
      } else {
        // ✅ TC-003 & TC-005: Use friendly error message
        setLocalError(getFriendlyAuthError(result.error));
      }
    } catch (error) {
      console.error("Login error:", error);
      
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

  const displayError = localError || storeError;

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="brand-section">
          <div className="logo">
            <BiLeaf size={32} color="#fff" />
            <span>Lumyna</span>
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in to continue to your ESG dashboard</p>
        </div>
        <div className="features-list">
          <div className="feature-item">
            <div className="feature-icon">📊</div>
            <div>
              <h4>Track Emissions</h4>
              <p>Monitor Scope 1, 2, and 3 emissions</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🎯</div>
            <div>
              <h4>Set Targets</h4>
              <p>Define and track reduction goals</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">📈</div>
            <div>
              <h4>AI Insights</h4>
              <p>Get actionable recommendations</p>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <Card className="login-card">
          <div className="card-header">
            <h2>Sign In</h2>
            <p>Enter your credentials to access your account</p>
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
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <FiMail className="input-icon" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <FiLock className="input-icon" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  required
                />
              </div>
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
              className="login-btn"
            >
              {loading ? "Signing in..." : "Sign In"}
              <FiLogIn size={16} />
            </PrimaryButton>
          </form>

          <div className="card-footer">
            <p>
              Don't have an account? <Link to="/signup">Create one</Link>
            </p>
          </div>
        </Card>
      </div>

      <style jsx>{`
        .login-container {
          display: flex;
          min-height: 100vh;
        }
        
        .login-left {
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
        
        .features-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .feature-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }
        
        .feature-icon {
          font-size: 28px;
        }
        
        .feature-item h4 {
          font-size: 16px;
          margin: 0 0 4px;
        }
        
        .feature-item p {
          font-size: 13px;
          opacity: 0.8;
          margin: 0;
        }
        
        .login-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F9FAFB;
          padding: 48px;
        }
        
        .login-card {
          width: 100%;
          max-width: 440px;
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
        
        .login-btn {
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
          .login-container {
            flex-direction: column;
          }
          .login-left {
            padding: 32px;
            min-height: 300px;
          }
          .features-list {
            display: none;
          }
          .login-right {
            padding: 32px;
          }
        }
      `}</style>
    </div>
  );
}