// src/pages/LandingPage.jsx
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import PrimaryButton from "../components/ui/PrimaryButton";
import { FiArrowRight, FiGlobe, FiCheckCircle } from "react-icons/fi";
import { BiLeaf } from "react-icons/bi";
import { GiPlantSeed } from "react-icons/gi";

export default function LandingPage() {
  const navigate = useNavigate();
  const [heroVisible, setHeroVisible]       = useState(false);
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const [footerVisible, setFooterVisible]   = useState(false);
  const featuresRef = useRef(null);
  const footerRef   = useRef(null);

  useEffect(() => {
    // Hero animates immediately on mount
    const heroTimer = setTimeout(() => setHeroVisible(true), 50);

    // Use IntersectionObserver for features and footer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target === featuresRef.current) setFeaturesVisible(true);
            if (entry.target === footerRef.current)   setFooterVisible(true);
          }
        });
      },
      { threshold: 0.15 }
    );

    if (featuresRef.current) observer.observe(featuresRef.current);
    if (footerRef.current)   observer.observe(footerRef.current);

    return () => {
      clearTimeout(heroTimer);
      observer.disconnect();
    };
  }, []);

  const features = [
    {
      icon: <GiPlantSeed className="feature-icon" />,
      title: "Comprehensive Tracking",
      description: "Track Scope 1 and Scope 2 emissions with region-specific factors",
    },
    {
      icon: <FiGlobe className="feature-icon" />,
      title: "Regional Compliance",
      description: "Built for UAE, Singapore, and Saudi Arabia regulations",
    },
    {
      icon: <FiCheckCircle className="feature-icon" />,
      title: "Secure & Reliable",
      description: "Your data is encrypted and securely stored",
    },
  ];

  return (
    <div className="landing-wrapper">
      <div className="landing-container">

        {/* Navbar */}
        <nav className="navbar">
          <div className="nav-brand">
            <BiLeaf className="brand-icon" />
            <span>Lumyna</span>
          </div>
          <div className="nav-buttons">
            <button onClick={() => navigate("/login")} className="login-btn">
              Log In
            </button>
            <PrimaryButton onClick={() => navigate("/signup")} className="signup-btn">
              Sign Up
            </PrimaryButton>
          </div>
        </nav>

        {/* Hero */}
        <div className={`hero-section ${heroVisible ? "visible" : ""}`}>
          <div className="hero-badge">
            <span className="badge-dot" />
            <span>ESG Intelligence Platform</span>
          </div>

          <h1 className="hero-title">Lumyna</h1>

          <p className="hero-description">
            Track Your Carbon Footprint with Precision
          </p>

          <p className="hero-sub">
            Lumyna helps sustainability managers across UAE, Singapore, and Saudi
            Arabia measure, monitor, and reduce their organization's emissions
            with our comprehensive ESG calculator.
          </p>

          <div className="cta-container">
            <PrimaryButton
              onClick={() => navigate("/signup")}
              className="cta-primary"
            >
              Get Started
              <FiArrowRight className="cta-icon" />
            </PrimaryButton>
          </div>

          {/* Animated stat strip */}
          <div className="stat-strip">
            {[
              { value: "3", label: "Regions" },
              { value: "GHG", label: "Protocol Compliant" },
              { value: "Scope 1+2", label: "Coverage" },
            ].map((stat, i) => (
              <div key={i} className="stat-item">
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div
          ref={featuresRef}
          className={`features-section ${featuresVisible ? "visible" : ""}`}
        >
          <div className="features-grid">
            {features.map((feature, index) => (
              <div
                key={index}
                className="feature-card"
                style={{ transitionDelay: `${index * 0.1}s` }}
              >
                <div className="feature-icon-wrapper">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer
          ref={footerRef}
          className={`landing-footer ${footerVisible ? "visible" : ""}`}
        >
          <div className="footer-content">
            <div className="footer-brand">
              <BiLeaf className="footer-icon" />
              <span>Lumyna</span>
            </div>
            <div className="footer-links">
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
              <Link to="/help">Help Center</Link>
              <Link to="/contact">Contact Us</Link>
            </div>
            <div className="footer-copyright">
              © {new Date().getFullYear()} Lumyna. All rights reserved.
            </div>
          </div>
        </footer>

      </div>

      <style jsx>{`
        /* ── Scroll fix ── */
        .landing-wrapper {
          width: 100%;
          min-height: 100vh;
          overflow-y: auto;
          background: white;
        }

        .landing-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px 0;
        }

        /* ── Keyframes ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(1.15); }
        }

        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        /* ── Navbar ── */
        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 0;
          border-bottom: 1px solid #E5E7EB;
          animation: fadeDown 0.4s ease forwards;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 22px;
          font-weight: 700;
          color: #1B4D3E;
        }

        .brand-icon {
          font-size: 26px;
          color: #2E7D64;
        }

        .nav-buttons {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .login-btn {
          padding: 8px 20px;
          background: transparent;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #4A5568;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
        }
        .login-btn:hover { border-color: #2E7D64; color: #2E7D64; }

        .signup-btn {
          padding: 8px 20px !important;
          background: #2E7D64 !important;
          font-size: 14px !important;
        }

        /* ── Hero ── */
        .hero-section {
          text-align: center;
          padding: 80px 20px 60px;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .hero-section.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #F8FAF8;
          padding: 6px 14px;
          border-radius: 30px;
          margin-bottom: 32px;
          border: 1px solid #E5E7EB;
          animation: scaleIn 0.4s ease 0.2s both;
        }

        .badge-dot {
          width: 8px;
          height: 8px;
          background: #2E7D64;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .hero-badge span {
          font-size: 13px;
          color: #1B4D3E;
          font-weight: 500;
        }

        .hero-title {
          font-size: 64px;
          font-weight: 700;
          color: #1B4D3E;
          margin: 0 0 16px;
          animation: fadeUp 0.5s ease 0.1s both;
          /* Subtle shimmer on the title text */
          background: linear-gradient(
            90deg,
            #1B4D3E 0%,
            #2E7D64 40%,
            #1B4D3E 60%,
            #1B4D3E 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: fadeUp 0.5s ease 0.1s both, shimmer 4s linear 1s infinite;
        }

        .hero-description {
          font-size: 26px;
          font-weight: 600;
          color: #1B4D3E;
          margin-bottom: 20px;
          animation: fadeUp 0.5s ease 0.2s both;
        }

        .hero-sub {
          font-size: 16px;
          color: #4A5568;
          max-width: 580px;
          margin: 0 auto 36px;
          line-height: 1.7;
          animation: fadeUp 0.5s ease 0.3s both;
        }

        .cta-container {
          animation: fadeUp 0.5s ease 0.4s both;
        }

        .cta-primary {
          padding: 14px 36px !important;
          font-size: 16px !important;
          background: #2E7D64 !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
          transition: background 0.2s, transform 0.1s !important;
        }
        .cta-primary:hover { background: #1B4D3E !important; }
        .cta-primary:active { transform: scale(0.98) !important; }

        .cta-icon {
          transition: transform 0.2s ease;
        }
        .cta-primary:hover .cta-icon {
          transform: translateX(4px);
        }

        /* ── Stat strip ── */
        .stat-strip {
          display: flex;
          justify-content: center;
          gap: 48px;
          margin-top: 56px;
          padding-top: 32px;
          border-top: 1px solid #E5E7EB;
          animation: fadeUp 0.5s ease 0.55s both;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .stat-value {
          font-size: 22px;
          font-weight: 700;
          color: #1B4D3E;
        }

        .stat-label {
          font-size: 12px;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* ── Features ── */
        .features-section {
          padding: 60px 0;
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .features-section.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .feature-card {
          background: white;
          padding: 32px 24px;
          border-radius: 12px;
          text-align: center;
          border: 1px solid #E5E7EB;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.5s ease, transform 0.5s ease, border-color 0.2s;
        }

        .features-section.visible .feature-card {
          opacity: 1;
          transform: translateY(0);
        }

        .feature-card:hover {
          border-color: #2E7D64;
          transform: translateY(-4px);
        }

        .feature-icon-wrapper {
          width: 60px;
          height: 60px;
          background: #F8FAF8;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          border: 1px solid #E5E7EB;
          transition: background 0.2s, border-color 0.2s;
        }

        .feature-card:hover .feature-icon-wrapper {
          background: #EDF7F2;
          border-color: #2E7D64;
        }

        .feature-icon {
          font-size: 26px;
          color: #2E7D64;
        }

        .feature-card h3 {
          font-size: 17px;
          font-weight: 600;
          color: #1B4D3E;
          margin: 0 0 10px;
        }

        .feature-card p {
          color: #4A5568;
          line-height: 1.6;
          font-size: 14px;
          margin: 0;
        }

        /* ── Footer ── */
        .landing-footer {
          border-top: 1px solid #E5E7EB;
          padding: 40px 0 28px;
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .landing-footer.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .footer-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .footer-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 600;
          color: #1B4D3E;
        }

        .footer-icon { font-size: 20px; color: #2E7D64; }

        .footer-links {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .footer-links a {
          color: #6B7280;
          text-decoration: none;
          font-size: 14px;
          transition: color 0.2s;
        }
        .footer-links a:hover { color: #2E7D64; }

        .footer-copyright {
          color: #9CA3AF;
          font-size: 12px;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .landing-container { padding: 0 16px; }
          .hero-section { padding: 60px 0 40px; }
          .hero-title { font-size: 44px; }
          .hero-description { font-size: 20px; }
          .features-grid { grid-template-columns: 1fr; gap: 16px; }
          .stat-strip { gap: 28px; }
          .footer-links { gap: 16px; }
        }

        @media (max-width: 480px) {
          .hero-title { font-size: 34px; }
          .hero-description { font-size: 17px; }
          .stat-strip { flex-direction: column; gap: 20px; }
          .cta-primary { width: 100%; justify-content: center !important; }
          .footer-links { flex-direction: column; align-items: center; gap: 12px; }
        }
      `}</style>
    </div>
  );
}