// src/pages/PrivacyPolicyPage.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiCalendar, FiMail, FiLock, FiDatabase, FiShield, FiEye } from "react-icons/fi";
import { BiLeaf } from "react-icons/bi";

export default function PrivacyPolicyPage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const lastUpdated = "March 15, 2026";

  const sections = [
    {
      id: "information",
      icon: <FiDatabase />,
      title: "Information We Collect",
      content: "We collect information that you provide directly to us, such as when you create an account, complete your company profile, or input emissions data. This includes company name, industry, location, employee count, revenue, and all emissions activity data (fuel consumption, electricity usage, refrigerant leakage, etc.)."
    },
    {
      id: "usage",
      icon: <FiEye />,
      title: "How We Use Your Information",
      content: "We use your information to calculate emissions, generate reports, improve our services, and communicate with you about your account. Your emissions data is used to provide you with accurate GHG calculations and analytics. We do not sell your personal information to third parties."
    },
    {
      id: "security",
      icon: <FiShield />,
      title: "Data Security",
      content: "We implement industry-standard security measures including encryption, secure authentication, and regular security audits. Your data is stored on secure servers with Firebase Firestore, which provides encryption at rest and in transit. Access to your data is restricted to authorized personnel only."
    },
    {
      id: "sharing",
      icon: <FiMail />,
      title: "Information Sharing",
      content: "We do not share your personal information with third parties except as necessary to provide our services, comply with the law, or with your consent. Your emissions data remains confidential to your organization unless you choose to share reports."
    },
    {
      id: "retention",
      icon: <FiDatabase />,
      title: "Data Retention",
      content: "We retain your data as long as your account is active or as needed to provide you with our services. You may request deletion of your data at any time. We also retain data as required for compliance with applicable laws and regulations."
    },
    {
      id: "rights",
      icon: <FiLock />,
      title: "Your Rights",
      content: "You have the right to access, correct, or delete your personal information. You can manage your data through your account settings or by contacting our support team. For users in the UAE, Singapore, and Saudi Arabia, we comply with local data protection regulations."
    }
  ];

  return (
    <div className="privacy-page-wrapper" style={{ overflowY: "auto", height: "100vh" }}>
      <div className="privacy-container">
        <div className={`privacy-card ${isVisible ? 'visible' : ''}`}>
          {/* Header */}
          <div className="header">
            <Link to="/" className="back-link">
              <FiArrowLeft /> Back to Home
            </Link>
            <div className="brand-section">
              <div className="logo-wrapper">
                <BiLeaf className="logo-icon" />
                <span className="logo-text">Lumyina</span>
              </div>
            </div>
            <h1>Privacy Policy</h1>
            <p className="last-updated">
              <FiCalendar className="calendar-icon" />
              Last updated: {lastUpdated}
            </p>
          </div>

          {/* Introduction */}
          <div className="intro-section">
            <p>
              At Lumyina, we take your privacy seriously. This Privacy Policy explains how we collect, 
              use, disclose, and safeguard your information when you use our ESG Calculator platform. 
              Please read this privacy policy carefully. If you do not agree with the terms of this 
              privacy policy, please do not access the platform.
            </p>
          </div>

          {/* Sections */}
          <div className="sections-grid">
            {sections.map((section) => (
              <div key={section.id} className="section-card">
                <div className="section-icon">{section.icon}</div>
                <h2>{section.title}</h2>
                <p>{section.content}</p>
              </div>
            ))}
          </div>

          {/* Contact Section */}
          <div className="contact-section">
            <h3>Contact Us</h3>
            <p>
              If you have questions or concerns about this Privacy Policy or our data practices,
              please contact us at:
            </p>
            <div className="contact-info">
              <a href="mailto:privacy@lumyina.com">privacy@lumyina.com</a>
            </div>
          </div>

          {/* Footer */}
          <div className="footer">
            <p>
              By using Lumyina, you acknowledge that you have read and understood this Privacy Policy.
            </p>
            <div className="footer-links">
              <Link to="/terms">Terms of Service</Link>
              <span className="separator">•</span>
              <Link to="/help">Help Center</Link>
              <span className="separator">•</span>
              <Link to="/contact">Contact Us</Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .privacy-page-wrapper {
          overflow-y: auto;
          height: 100vh;
        }

        .privacy-container {
          min-height: 100vh;
          width: 100%;
          background: #F8FAF8;
          padding: 40px 20px;
        }

        .privacy-card {
          max-width: 1000px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
          padding: 48px;
          transform: translateY(20px);
          opacity: 0;
          transition: all 0.6s ease;
        }

        .privacy-card.visible {
          transform: translateY(0);
          opacity: 1;
        }

        /* Header */
        .header {
          text-align: center;
          margin-bottom: 40px;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #2E7D64;
          text-decoration: none;
          font-size: 14px;
          margin-bottom: 24px;
          transition: all 0.2s ease;
        }

        .back-link:hover {
          color: #1B4D3E;
          gap: 12px;
        }

        .brand-section {
          margin-bottom: 20px;
        }

        .logo-wrapper {
          display: inline-flex;
          align-items: center;
          gap: 8px;
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

        .header h1 {
          font-size: 32px;
          font-weight: 700;
          color: #1B4D3E;
          margin: 0 0 12px;
        }

        .last-updated {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #6B7280;
          margin: 0;
        }

        .calendar-icon {
          font-size: 14px;
        }

        /* Introduction */
        .intro-section {
          background: #F8FAF8;
          padding: 24px;
          border-radius: 8px;
          margin-bottom: 40px;
          border: 1px solid #E5E7EB;
        }

        .intro-section p {
          margin: 0;
          color: #4A5568;
          line-height: 1.6;
          font-size: 15px;
        }

        /* Sections Grid */
        .sections-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-bottom: 40px;
        }

        .section-card {
          padding: 24px;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .section-card:hover {
          border-color: #2E7D64;
        }

        .section-icon {
          width: 48px;
          height: 48px;
          background: #F8FAF8;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          font-size: 24px;
          color: #2E7D64;
          border: 1px solid #E5E7EB;
        }

        .section-card h2 {
          font-size: 20px;
          font-weight: 600;
          color: #1B4D3E;
          margin: 0 0 12px;
        }

        .section-card p {
          color: #4A5568;
          line-height: 1.6;
          font-size: 14px;
          margin: 0;
        }

        /* Contact Section */
        .contact-section {
          background: #F8FAF8;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 32px;
          text-align: center;
          border: 1px solid #E5E7EB;
        }

        .contact-section h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1B4D3E;
          margin: 0 0 12px;
        }

        .contact-section p {
          color: #4A5568;
          margin: 0 0 12px;
          font-size: 14px;
        }

        .contact-info a {
          color: #2E7D64;
          text-decoration: none;
          font-weight: 500;
          font-size: 16px;
        }

        .contact-info a:hover {
          text-decoration: underline;
        }

        /* Footer */
        .footer {
          text-align: center;
          padding-top: 24px;
          border-top: 1px solid #E5E7EB;
        }

        .footer p {
          color: #6B7280;
          font-size: 13px;
          margin: 0 0 16px;
        }

        .footer-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
        }

        .footer-links a {
          color: #2E7D64;
          text-decoration: none;
        }

        .footer-links a:hover {
          text-decoration: underline;
        }

        .separator {
          color: #E5E7EB;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .privacy-card {
            padding: 32px 24px;
          }

          .sections-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .header h1 {
            font-size: 28px;
          }

          .logo-text {
            font-size: 20px;
          }

          .section-card h2 {
            font-size: 18px;
          }
        }

        @media (max-width: 480px) {
          .privacy-card {
            padding: 24px 20px;
          }

          .header h1 {
            font-size: 24px;
          }

          .intro-section {
            padding: 20px;
          }

          .section-card {
            padding: 20px;
          }

          .footer-links {
            flex-direction: column;
            gap: 8px;
          }

          .separator {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}