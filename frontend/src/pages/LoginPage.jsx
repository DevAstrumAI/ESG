// src/pages/LoginPage.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import PrimaryButton from "../components/ui/PrimaryButton";
import { FiMail, FiLock, FiArrowRight, FiEye, FiEyeOff } from "react-icons/fi";
import { BiLeaf } from "react-icons/bi";
import { useAuthStore } from "../store/authStore";
import { useCompanyStore } from "../store/companyStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { login, loading, error, clearError } = useAuthStore();
  const { fetchCompany } = useCompanyStore();

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      const token = useAuthStore.getState().token;
      const companyResult = await fetchCompany(token);
      if (companyResult.success) {
        navigate("/dashboard");
      } else {
        navigate("/setup");
      }
    }
  };

  return (
    <div className="login-container">
      <div className={`login-card ${isVisible ? 'visible' : ''}`}>
        {/* Logo */}
        <div className="brand-section">
          <div className="logo-wrapper">
            <BiLeaf className="logo-icon" />
            <span className="logo-text">Lumyina</span>
          </div>
          <h2 className="welcome-text">Welcome back</h2>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <FiMail className="input-icon" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <FiLock className="input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" className="forgot-link">
              Forgot password?
            </Link>
          </div>

          <PrimaryButton type="submit" className="login-button" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
            {!loading && <FiArrowRight className="button-icon" />}
          </PrimaryButton>
        </form>

        {/* Sign Up Link */}
        <p className="signup-link">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>

        {/* Legal Links */}
        <div className="legal-links">
          <Link to="/privacy">Privacy Policy</Link>
          <span className="separator">•</span>
          <Link to="/terms">Terms of Service</Link>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F8FAF8;
          padding: 20px;
        }

        .login-card {
          background: white;
          padding: 40px;
          border-radius: 12px;
          width: 100%;
          max-width: 400px;
          border: 1px solid #E5E7EB;
          transform: translateY(20px);
          opacity: 0;
          transition: all 0.6s ease;
        }

        .login-card.visible {
          transform: translateY(0);
          opacity: 1;
        }

        .brand-section {
          text-align: center;
          margin-bottom: 32px;
        }

        .logo-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 24px;
        }

        .logo-icon {
          font-size: 28px;
          color: #2E7D64;
        }

        .logo-text {
          font-size: 24px;
          font-weight: 700;
          color: #1B4D3E;
        }

        .welcome-text {
          font-size: 28px;
          font-weight: 600;
          color: #1B4D3E;
          margin: 0;
        }

        .error-message {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #DC2626;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 24px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-group label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          color: #9CA3AF;
          font-size: 18px;
        }

        .input-wrapper input {
          width: 100%;
          padding: 12px 44px 12px 44px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 15px;
          transition: all 0.2s ease;
          background: white;
        }

        .input-wrapper input:focus {
          outline: none;
          border-color: #2E7D64;
        }

        .input-wrapper input::placeholder {
          color: #9CA3AF;
        }

        .toggle-password-btn {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #9CA3AF;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }

        .toggle-password-btn:hover {
          color: #4B5563;
        }

        .form-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #4A5568;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: #2E7D64;
        }

        .forgot-link {
          color: #2E7D64;
          text-decoration: none;
          font-weight: 500;
        }

        .forgot-link:hover {
          text-decoration: underline;
        }

        .login-button {
          width: 100% !important;
          padding: 12px !important;
          font-size: 16px !important;
          background: #2E7D64 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
        }

        .login-button:hover {
          background: #1B4D3E !important;
        }

        .button-icon {
          transition: transform 0.2s ease;
        }

        .login-button:hover .button-icon {
          transform: translateX(4px);
        }

        .signup-link {
          text-align: center;
          font-size: 14px;
          color: #4A5568;
          margin-bottom: 16px;
        }

        .signup-link a {
          color: #2E7D64;
          font-weight: 600;
          text-decoration: none;
        }

        .signup-link a:hover {
          text-decoration: underline;
        }

        .legal-links {
          text-align: center;
          font-size: 12px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #E5E7EB;
        }

        .legal-links a {
          color: #6B7280;
          text-decoration: none;
        }

        .legal-links a:hover {
          color: #2E7D64;
        }

        .separator {
          color: #E5E7EB;
          margin: 0 8px;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 30px 20px;
          }

          .welcome-text {
            font-size: 24px;
          }

          .logo-text {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
}
