// src/pages/LandingPage.jsx
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import { 
  FiWind, 
  FiSun, 
  FiCloud, 
  FiTrendingUp, 
  FiCheckCircle,
  FiArrowRight,
  FiGlobe,
  FiDroplet,
  FiActivity,
  FiBarChart2
} from "react-icons/fi";
import { BiLeaf, BiRecycle } from "react-icons/bi";
import { GiEarthAmerica, GiSolarPower, GiWindTurbine, GiForest, GiPlantSeed } from "react-icons/gi";
import { MdOutlineEnergySavingsLeaf, MdEco } from "react-icons/md";
import { RiLeafLine, RiRecycleLine, RiTreeLine } from "react-icons/ri";

export default function LandingPage() {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    setIsVisible(true);
    
    const handleMouseMove = (e) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePosition({
          x: ((e.clientX - rect.left) / rect.width - 0.5) * 20,
          y: ((e.clientY - rect.top) / rect.height - 0.5) * 20,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const features = [
    { icon: <GiPlantSeed className="feature-icon" />, title: "Track Emissions", description: "Monitor your carbon footprint in real-time" },
    { icon: <GiWindTurbine className="feature-icon" />, title: "Renewable Energy", description: "Optimize your clean energy usage" },
    { icon: <FiBarChart2 className="feature-icon" />, title: "Progress Reports", description: "Visualize your sustainability journey" },
    { icon: <GiEarthAmerica className="feature-icon" />, title: "Global Standards", description: "Align with international ESG frameworks" },
  ];

  const stats = [
    { value: "10k+", label: "Companies", icon: <FiGlobe /> },
    { value: "2M t", label: "CO₂ Reduced", icon: <MdEco /> },
    { value: "98%", label: "Satisfaction", icon: <FiCheckCircle /> },
  ];

  return (
    <div className="landing-container">
      {/* Floating Background Elements */}
      <div className="floating-bg">
        <div className="floating-leaf leaf-1"><RiLeafLine /></div>
        <div className="floating-leaf leaf-2"><BiLeaf /></div>
        <div className="floating-leaf leaf-3"><RiTreeLine /></div>
        <div className="floating-cloud cloud-1"><FiCloud /></div>
        <div className="floating-cloud cloud-2"><FiCloud /></div>
        <div className="floating-sun"><FiSun /></div>
      </div>

      {/* Hero Section */}
      <div 
        ref={heroRef}
        className={`hero-section ${isVisible ? 'visible' : ''}`}
        style={{
          transform: `perspective(1000px) rotateX(${mousePosition.y * 0.5}deg) rotateY(${mousePosition.x * 0.5}deg)`,
        }}
      >
        <div className="hero-badge">
          <span className="badge-dot"></span>
          <span>AI-Powered Sustainability Platform</span>
        </div>

        <h1 className="hero-title">
          Welcome to 
          <span className="gradient-text"> ESG Calculator</span>
        </h1>

        <p className="hero-description">
          Track, manage, and reduce your company's emissions efficiently. 
          Join thousands of businesses leading the transition to a sustainable future.
        </p>

        <div className="cta-container">
          <PrimaryButton 
            onClick={() => navigate("/signup")}
            className="cta-primary"
          >
            <span>Get Started Free</span>
            <FiArrowRight className="cta-icon" />
          </PrimaryButton>

          <SecondaryButton 
            onClick={() => navigate("/login")}
            className="cta-secondary"
          >
            <span>Log In</span>
          </SecondaryButton>
        </div>

        <div className="trust-badge">
          <div className="avatar-group">
            <div className="avatar">JD</div>
            <div className="avatar">MK</div>
            <div className="avatar">SL</div>
            <div className="avatar">+2k</div>
          </div>
          <p>Trusted by 2,000+ companies worldwide</p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="stats-section">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon">{stat.icon}</div>
            <div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Features Grid */}
      <div className="features-section">
        <h2 className="section-title">
          Everything you need to manage <span className="gradient-text">sustainability</span>
        </h2>
        <p className="section-subtitle">
          Comprehensive tools to measure, report, and reduce your environmental impact
        </p>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon-wrapper">
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <div className="feature-hover-effect"></div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Banner */}
      <div className="cta-banner">
        <div className="cta-content">
          <h2>Ready to start your sustainability journey?</h2>
          <p>Join thousands of companies already using ESG Calculator</p>
          <PrimaryButton 
            onClick={() => navigate("/signup")}
            className="banner-cta"
          >
            Create Free Account
            <FiArrowRight className="cta-icon" />
          </PrimaryButton>
        </div>
        <div className="cta-decoration">
          <GiForest className="decoration-icon" />
          <MdOutlineEnergySavingsLeaf className="decoration-icon" />
          <GiSolarPower className="decoration-icon" />
        </div>
      </div>

      <style jsx>{`
        .landing-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 50%, #BBF7D0 100%);
          position: relative;
          overflow-x: hidden;
          padding: 40px 20px;
        }

        /* Floating Background Elements */
        .floating-bg {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 0;
        }

        .floating-leaf {
          position: absolute;
          color: rgba(34, 197, 94, 0.1);
          font-size: 4rem;
          animation: float 20s infinite linear;
        }

        .floating-cloud {
          position: absolute;
          color: rgba(255, 255, 255, 0.3);
          font-size: 5rem;
          animation: float 30s infinite linear;
        }

        .floating-sun {
          position: absolute;
          top: 100px;
          right: 100px;
          color: rgba(250, 204, 21, 0.15);
          font-size: 6rem;
          animation: rotate 60s infinite linear;
        }

        .leaf-1 { top: 10%; left: 5%; animation-delay: 0s; }
        .leaf-2 { bottom: 20%; right: 8%; animation-delay: -5s; }
        .leaf-3 { top: 40%; right: 15%; animation-delay: -10s; }
        .cloud-1 { top: 20%; right: 20%; animation-delay: -2s; }
        .cloud-2 { bottom: 30%; left: 10%; animation-delay: -15s; }

        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Hero Section */
        .hero-section {
          position: relative;
          z-index: 1;
          max-width: 900px;
          margin: 0 auto;
          padding: 60px 20px;
          text-align: center;
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 40px;
          border: 1px solid rgba(34, 197, 94, 0.2);
          box-shadow: 0 20px 40px rgba(0, 100, 0, 0.1);
        }

        .hero-section.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(34, 197, 94, 0.1);
          padding: 8px 16px;
          border-radius: 30px;
          margin-bottom: 24px;
          border: 1px solid rgba(34, 197, 94, 0.3);
          backdrop-filter: blur(5px);
        }

        .badge-dot {
          width: 8px;
          height: 8px;
          background: #22C55E;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }

        .hero-title {
          font-size: clamp(2.5rem, 8vw, 4.5rem);
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 24px;
          color: #14532D;
        }

        .gradient-text {
          background: linear-gradient(135deg, #15803D 0%, #22C55E 50%, #4ADE80 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          display: inline-block;
        }

        .hero-description {
          font-size: 1.125rem;
          color: #166534;
          max-width: 600px;
          margin: 0 auto 32px;
          line-height: 1.6;
        }

        .cta-container {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 40px;
        }

        .cta-primary {
          padding: 16px 32px !important;
          font-size: 1.1rem !important;
          background: linear-gradient(135deg, #15803D 0%, #22C55E 100%) !important;
          border: none !important;
          box-shadow: 0 10px 20px rgba(34, 197, 94, 0.3) !important;
          transition: all 0.3s ease !important;
        }

        .cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(34, 197, 94, 0.4) !important;
        }

        .cta-secondary {
          padding: 16px 32px !important;
          font-size: 1.1rem !important;
          background: white !important;
          color: #15803D !important;
          border: 2px solid #22C55E !important;
        }

        .cta-secondary:hover {
          background: #F0FDF4 !important;
        }

        .cta-icon {
          transition: transform 0.3s ease;
        }

        .cta-primary:hover .cta-icon {
          transform: translateX(5px);
        }

        /* Trust Badge */
        .trust-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .avatar-group {
          display: flex;
          align-items: center;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #22C55E, #15803D);
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 12px;
          margin-left: -8px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        .avatar:first-child {
          margin-left: 0;
        }

        .trust-badge p {
          color: #166534;
          font-size: 14px;
          font-weight: 500;
        }

        /* Stats Section */
        .stats-section {
          display: flex;
          justify-content: center;
          gap: 30px;
          flex-wrap: wrap;
          max-width: 800px;
          margin: 60px auto;
          position: relative;
          z-index: 1;
        }

        .stat-card {
          background: white;
          padding: 24px 32px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 10px 30px rgba(0, 50, 0, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(34, 197, 94, 0.2);
        }

        .stat-icon {
          font-size: 2rem;
          color: #22C55E;
        }

        .stat-value {
          font-size: 1.8rem;
          font-weight: 700;
          color: #14532D;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #166534;
          opacity: 0.8;
        }

        /* Features Section */
        .features-section {
          max-width: 1200px;
          margin: 80px auto;
          position: relative;
          z-index: 1;
        }

        .section-title {
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 700;
          text-align: center;
          color: #14532D;
          margin-bottom: 16px;
        }

        .section-subtitle {
          font-size: 1.1rem;
          color: #166534;
          text-align: center;
          max-width: 600px;
          margin: 0 auto 48px;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 30px;
          padding: 20px;
        }

        .feature-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 32px 24px;
          border-radius: 24px;
          text-align: center;
          border: 1px solid rgba(34, 197, 94, 0.2);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .feature-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 20px 40px rgba(34, 197, 94, 0.2);
        }

        .feature-icon-wrapper {
          width: 70px;
          height: 70px;
          background: linear-gradient(135deg, #22C55E20, #15803D20);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          transition: all 0.3s ease;
        }

        .feature-card:hover .feature-icon-wrapper {
          transform: scale(1.1);
          background: linear-gradient(135deg, #22C55E, #15803D);
        }

        .feature-icon {
          font-size: 2rem;
          color: #22C55E;
          transition: all 0.3s ease;
        }

        .feature-card:hover .feature-icon {
          color: white;
        }

        .feature-card h3 {
          font-size: 1.3rem;
          font-weight: 600;
          color: #14532D;
          margin-bottom: 12px;
        }

        .feature-card p {
          color: #166534;
          line-height: 1.6;
          font-size: 0.95rem;
        }

        .feature-hover-effect {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #22C55E10, transparent);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }

        .feature-card:hover .feature-hover-effect {
          opacity: 1;
        }

        /* CTA Banner */
        .cta-banner {
          background: linear-gradient(135deg, #14532D 0%, #166534 50%, #15803D 100%);
          border-radius: 30px;
          padding: 60px 40px;
          margin: 80px auto 40px;
          max-width: 1000px;
          position: relative;
          z-index: 1;
          overflow: hidden;
          box-shadow: 0 30px 50px rgba(0, 50, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 40px;
        }

        .cta-content {
          flex: 1;
          min-width: 300px;
        }

        .cta-content h2 {
          font-size: clamp(1.8rem, 4vw, 2.5rem);
          font-weight: 700;
          color: white;
          margin-bottom: 16px;
        }

        .cta-content p {
          font-size: 1.1rem;
          color: rgba(255,255,255,0.9);
          margin-bottom: 24px;
        }

        .banner-cta {
          padding: 16px 32px !important;
          font-size: 1.1rem !important;
          background: white !important;
          color: #14532D !important;
          border: none !important;
        }

        .banner-cta:hover {
          background: #F0FDF4 !important;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.2) !important;
        }

        .cta-decoration {
          display: flex;
          gap: 30px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .decoration-icon {
          font-size: 4rem;
          color: rgba(255,255,255,0.2);
          animation: float 6s infinite ease-in-out;
        }

        .decoration-icon:nth-child(2) {
          animation-delay: -2s;
        }

        .decoration-icon:nth-child(3) {
          animation-delay: -4s;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .hero-section {
            padding: 40px 20px;
          }

          .cta-banner {
            padding: 40px 20px;
            text-align: center;
          }

          .cta-decoration {
            display: none;
          }

          .stats-section {
            gap: 15px;
          }

          .stat-card {
            width: 100%;
            max-width: 280px;
          }
        }

        @media (max-width: 480px) {
          .hero-badge {
            font-size: 0.8rem;
          }

          .trust-badge {
            flex-direction: column;
            gap: 10px;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}