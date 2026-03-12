// src/pages/LoginPage.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import PrimaryButton from "../components/ui/PrimaryButton";
import { FiMail, FiLock, FiArrowRight, FiSun, FiCloud } from "react-icons/fi";
import { BiLeaf } from "react-icons/bi";
import { GiEarthAmerica, GiForest, GiPlantSeed } from "react-icons/gi";
import { MdOutlineEnergySavingsLeaf } from "react-icons/md";
import { RiTreeLine } from "react-icons/ri";
import { useAuthStore } from "../store/authStore";
import { useCompanyStore } from "../store/companyStore";
import { useEmissionStore } from "../store/emissionStore";
import loginBg from "../assets/backgrounds/login.jpg";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { login, loading, error, clearError } = useAuthStore();
  const { fetchCompany } = useCompanyStore();

  useEffect(() => {
    return () => clearError();
  }, []);

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

   const { token: authToken } = useAuthStore.getState();
   const companyResult = await fetchCompany(authToken);
   console.log("Company result:", companyResult);
   console.log("Company in store:", useCompanyStore.getState().company);
   console.log("Company result:", companyResult);
   console.log("Company in store:", useCompanyStore.getState().company); 

  const { fetchSummary } = useEmissionStore.getState();
  await fetchSummary(authToken);
  console.log("scope1Results:", useEmissionStore.getState().scope1Results);
   
await fetchSummary(authToken).then((r) => {
  console.log("Summary result:", r);
  console.log("Full summary data:", JSON.stringify(r));
  console.log("scope1Results:", useEmissionStore.getState().scope1Results);
});

  };




  return (
    <div className="login-container">
      {/* Floating Background Elements */}
      <div className="floating-bg">
        <div className="floating-leaf leaf-1"><BiLeaf /></div>
        <div className="floating-leaf leaf-2"><GiPlantSeed /></div>
        <div className="floating-leaf leaf-3"><RiTreeLine /></div>
        <div className="floating-cloud cloud-1"><FiCloud /></div>
        <div className="floating-cloud cloud-2"><FiCloud /></div>
        <div className="floating-sun"><FiSun /></div>
      </div>

      {/* Background Image with Overlay */}
      <div 
        className="bg-image"
        style={{
          backgroundImage: `url(${loginBg})`,
          
        }}
      />
      
      {/* Content */}
      <div className={`login-card ${isVisible ? 'visible' : ''}`}>
        {/* Logo and Brand */}
        <div className="brand-section">
          <div className="logo-wrapper">
            <GiEarthAmerica className="logo-icon" />
            <span className="logo-text">ESG Calculator</span>
          </div>
          <h2 className="welcome-text">Welcome Back</h2>
          <p className="subtitle">Continue your sustainability journey</p>
        </div>

        {/* Environmental Metrics Badge */}
        <div className="metrics-badge">
          <div className="metric-item">
            <BiLeaf className="metric-icon" />
            <span>Carbon Saved: 2.4t</span>
          </div>
          <div className="metric-divider"></div>
          <div className="metric-item">
            <GiForest className="metric-icon" />
            <span>Trees: 124</span>
          </div>
        </div>

        {error && (
          <div style={{background:"#FEF2F2", border:"1px solid #FECACA", color:"#DC2626", padding:"12px 16px", borderRadius:"12px", fontSize:"14px", marginBottom:"16px"}}>
            ⚠️ {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="email">
              <FiMail className="input-icon" />
              <span>Email Address</span>
            </label>
            <div className="input-wrapper">
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
            <label htmlFor="password">
              <FiLock className="input-icon" />
              <span>Password</span>
            </label>
            <div className="input-wrapper">
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
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
            <span>{loading ? "Logging in..." : "Log In"}</span>
            {!loading && <FiArrowRight className="button-icon" />}
           </PrimaryButton>
        </form>

        {/* Social Login */}
        <div className="social-section">
          <div className="divider">
            <span>or continue with</span>
          </div>

          <div className="social-buttons">
            <button className="social-button google">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
            <button className="social-button github">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path
                  fill="currentColor"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              GitHub
            </button>
          </div>
        </div>

        {/* Sign Up Link */}
        <p className="signup-link">
          Don't have an account? <Link to="/signup">Create free account</Link>
        </p>

        {/* Environmental Footer */}
        <div className="environmental-footer">
          <span>🌱 Together we can make a difference</span>
        </div>
      </div>

      <style>{`
        .login-container {
          min-height: 100vh;
          width: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: linear-gradient(135deg, #14532D 0%, #166534 100%);
        }

        /* Floating Background Elements */
        .floating-bg {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 1;
        }

        .floating-leaf {
          position: absolute;
          color: rgba(255, 255, 255, 0.1);
          font-size: 4rem;
          animation: float 20s infinite linear;
        }

        .floating-cloud {
          position: absolute;
          color: rgba(255, 255, 255, 0.1);
          font-size: 5rem;
          animation: float 30s infinite linear;
        }

        .floating-sun {
          position: absolute;
          top: 10%;
          right: 10%;
          color: rgba(250, 204, 21, 0.15);
          font-size: 6rem;
          animation: rotate 60s infinite linear;
        }

        .leaf-1 { top: 15%; left: 10%; animation-delay: 0s; }
        .leaf-2 { bottom: 20%; right: 15%; animation-delay: -5s; }
        .leaf-3 { top: 40%; left: 20%; animation-delay: -10s; }
        .cloud-1 { top: 25%; right: 20%; animation-delay: -2s; }
        .cloud-2 { bottom: 30%; left: 15%; animation-delay: -15s; }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Background Image */
        .bg-image {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0.3;
          filter: blur(3px);
        }

        /* Login Card */
        .login-card {
          position: relative;
          z-index: 20;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          padding: 40px;
          border-radius: 30px;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 30px 60px rgba(0, 40, 0, 0.3);
          border: 1px solid rgba(34, 197, 94, 0.3);
          transform: translateY(30px);
          opacity: 0;
          transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          margin: 20px;
        }

        .login-card.visible {
          transform: translateY(0);
          opacity: 1;
        }

        /* Brand Section */
        .brand-section {
          text-align: center;
          margin-bottom: 24px;
        }

        .logo-wrapper {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #15803D20, #22C55E20);
          padding: 8px 20px;
          border-radius: 40px;
          margin-bottom: 20px;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .logo-icon {
          font-size: 24px;
          color: #15803D;
        }

        .logo-text {
          font-weight: 600;
          color: #14532D;
          font-size: 14px;
        }

        .welcome-text {
          font-size: 28px;
          font-weight: 700;
          color: #14532D;
          margin-bottom: 8px;
        }

        .subtitle {
          color: #166534;
          font-size: 14px;
        }

        /* Metrics Badge */
        .metrics-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          background: #F0FDF4;
          padding: 12px 20px;
          border-radius: 40px;
          margin-bottom: 30px;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .metric-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #15803D;
          font-size: 13px;
          font-weight: 500;
        }

        .metric-icon {
          font-size: 16px;
        }

        .metric-divider {
          width: 1px;
          height: 20px;
          background: rgba(34, 197, 94, 0.3);
        }

        /* Form */
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 24px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-group label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .input-icon {
          color: #22C55E;
        }

        .input-wrapper {
          position: relative;
        }

        .input-wrapper input {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #E5E7EB;
          border-radius: 16px;
          font-size: 15px;
          transition: all 0.2s ease;
          background: white;
        }

        .input-wrapper input:focus {
          outline: none;
          border-color: #22C55E;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.1);
        }

        .input-wrapper input::placeholder {
          color: #9CA3AF;
        }

        /* Form Options */
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
          color: #4B5563;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: #22C55E;
        }

        .forgot-link {
          color: #15803D;
          text-decoration: none;
          font-weight: 500;
        }

        .forgot-link:hover {
          text-decoration: underline;
        }

        /* Login Button */
        .login-button {
          width: 100% !important;
          padding: 16px !important;
          font-size: 16px !important;
          background: linear-gradient(135deg, #15803D 0%, #22C55E 100%) !important;
          border: none !important;
          box-shadow: 0 10px 20px rgba(34, 197, 94, 0.3) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
        }

        .button-icon {
          transition: transform 0.3s ease;
        }

        .login-button:hover .button-icon {
          transform: translateX(5px);
        }

        /* Social Section */
        .social-section {
          margin-bottom: 24px;
        }

        .divider {
          position: relative;
          text-align: center;
          margin-bottom: 20px;
        }

        .divider::before,
        .divider::after {
          content: '';
          position: absolute;
          top: 50%;
          width: calc(50% - 70px);
          height: 1px;
          background: #E5E7EB;
        }

        .divider::before {
          left: 0;
        }

        .divider::after {
          right: 0;
        }

        .divider span {
          background: white;
          padding: 0 10px;
          color: #6B7280;
          font-size: 13px;
        }

        .social-buttons {
          display: flex;
          gap: 12px;
        }

        .social-button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border: 2px solid #E5E7EB;
          border-radius: 16px;
          background: white;
          color: #4B5563;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .social-button:hover {
          border-color: #22C55E;
          background: #F0FDF4;
        }

        .social-button.google {
          color: #EA4335;
        }

        .social-button.github {
          color: #333;
        }

        /* Sign Up Link */
        .signup-link {
          text-align: center;
          font-size: 14px;
          color: #4B5563;
          margin-bottom: 16px;
        }

        .signup-link a {
          color: #15803D;
          font-weight: 600;
          text-decoration: none;
        }

        .signup-link a:hover {
          text-decoration: underline;
        }

        /* Environmental Footer */
        .environmental-footer {
          text-align: center;
          font-size: 12px;
          color: #6B7280;
          padding-top: 16px;
          border-top: 1px solid #E5E7EB;
        }

        /* Responsive */
        @media (max-width: 480px) {
          .login-card {
            padding: 30px 20px;
          }

          .welcome-text {
            font-size: 24px;
          }

          .metrics-badge {
            flex-direction: column;
            gap: 8px;
          }

          .metric-divider {
            display: none;
          }

          .social-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}