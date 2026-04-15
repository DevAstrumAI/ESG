// src/pages/SignupPage.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import PrimaryButton from "../components/ui/PrimaryButton";
import { useAuthStore } from "../store/authStore";
import { FiUser, FiMail, FiLock, FiArrowRight, FiEye, FiEyeOff } from "react-icons/fi";
import { BiLeaf } from "react-icons/bi";

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const { register, loading, error, clearError } = useAuthStore();

  const [localError, setLocalError] = useState("");

  // Clear error on component mount
  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // ✅ Fixed: validateSignupFields function
  const validateSignupFields = () => {
    const errors = {};
    if (!name || name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters.";
    }
    if (!email || !email.includes("@") || !email.includes(".")) {
      errors.email = "Enter a valid email address.";
    }
    if (!password || password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    } else if (!/[A-Z]/.test(password)) {
      errors.password = "Password must contain at least one uppercase letter.";
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    if (!agreeTerms) {
      errors.terms = "You must agree to the Terms of Service.";
    }
    return errors;
  };

  // ✅ Fixed: Friendly error message mapping
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
    
    // Clear previous error before new submission
    clearError();
    setFieldErrors({});
    
    // Validate fields
    const errors = validateSignupFields();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    
    const result = await register(email, password, name);
    if (result.success) {
      navigate("/setup");
    } else {
  const friendlyError = getFriendlyAuthError(result.error);
  setLocalError(friendlyError); // ← was missing, this is why it didn't show
    }

    // Replace the error display div at the top of the form JSX:
    {(localError || error || fieldErrors.general) && (
      <div className="error-message">
        ⚠️ {localError || error || fieldErrors.general}
      </div>
    )}
  };

  return (
    <div className="signup-container">
      <div className={`signup-card ${isVisible ? 'visible' : ''}`}>
        {/* Logo */}
        <div className="brand-section">
          <div className="logo-wrapper">
            <BiLeaf className="logo-icon" />
            <span className="logo-text">Lumyina</span>
          </div>
          <h2 className="welcome-text">Create your account</h2>
        </div>

        {(error || fieldErrors.general) && (
          <div className="error-message">
            ⚠️ {error || fieldErrors.general}
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="signup-form">
          <div className="input-group">
            <label htmlFor="name">Full Name</label>
            <div className="input-wrapper">
              <FiUser className="input-icon" />
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: "" });
                }}
                placeholder="Enter your full name"
                required
              />
            </div>
            {fieldErrors.name && (
              <div className="field-error">{fieldErrors.name}</div>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <FiMail className="input-icon" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: "" });
                }}
                placeholder="you@company.com"
                required
              />
            </div>
            {fieldErrors.email && (
              <div className="field-error">{fieldErrors.email}</div>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <FiLock className="input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: "" });
                }}
                placeholder="Create a strong password"
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
            {fieldErrors.password && (
              <div className="field-error">{fieldErrors.password}</div>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrapper">
              <FiLock className="input-icon" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: "" });
                }}
                placeholder="Confirm your password"
                required
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <div className="field-error">{fieldErrors.confirmPassword}</div>
            )}
            {confirmPassword && !fieldErrors.confirmPassword && (
              <div className="password-match">
                {password === confirmPassword ? (
                  <span className="match-success">✓ Passwords match</span>
                ) : (
                  <span className="match-error">✗ Passwords do not match</span>
                )}
              </div>
            )}
          </div>

          <div className="terms-checkbox">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked);
                  if (fieldErrors.terms) setFieldErrors({ ...fieldErrors, terms: "" });
                }}
                required
              />
              <span>
                I agree to the <Link to="/terms">Terms of Service</Link> and{' '}
                <Link to="/privacy">Privacy Policy</Link>
              </span>
            </label>
            {fieldErrors.terms && (
              <div className="field-error">{fieldErrors.terms}</div>
            )}
          </div>

          <PrimaryButton type="submit" className="signup-button" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up"}
            {!loading && <FiArrowRight className="button-icon" />}
          </PrimaryButton>
        </form>

        {/* Login Link */}
        <p className="login-link">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>

      <style jsx>{`
        .signup-container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F8FAF8;
          padding: 20px;
        }

        .signup-card {
          background: white;
          padding: 40px;
          border-radius: 12px;
          width: 100%;
          max-width: 440px;
          border: 1px solid #E5E7EB;
          transform: translateY(20px);
          opacity: 0;
          transition: all 0.6s ease;
        }

        .signup-card.visible {
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

        .field-error {
          font-size: 12px;
          color: #EF4444;
          margin-top: 6px;
        }

        .signup-form {
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

        .password-match {
          margin-top: 6px;
          font-size: 12px;
        }

        .match-success {
          color: #10B981;
        }

        .match-error {
          color: #EF4444;
        }

        .terms-checkbox {
          margin-top: 4px;
        }

        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 14px;
          color: #4A5568;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 16px;
          height: 16px;
          margin-top: 2px;
          accent-color: #2E7D64;
        }

        .checkbox-label a {
          color: #2E7D64;
          font-weight: 500;
          text-decoration: none;
        }

        .checkbox-label a:hover {
          text-decoration: underline;
        }

        .signup-button {
          width: 100% !important;
          padding: 12px !important;
          font-size: 16px !important;
          background: #2E7D64 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
        }

        .signup-button:hover {
          background: #1B4D3E !important;
        }

        .button-icon {
          transition: transform 0.2s ease;
        }

        .signup-button:hover .button-icon {
          transform: translateX(4px);
        }

        .login-link {
          text-align: center;
          font-size: 14px;
          color: #4A5568;
        }

        .login-link a {
          color: #2E7D64;
          font-weight: 600;
          text-decoration: none;
        }

        .login-link a:hover {
          text-decoration: underline;
        }

        @media (max-width: 480px) {
          .signup-card {
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