// src/pages/TermsOfServicePage.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiCalendar, FiCheckCircle, FiShield, FiUsers, FiLock, FiAlertCircle } from "react-icons/fi";
import { BiLeaf } from "react-icons/bi";

export default function TermsOfServicePage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const lastUpdated = "March 15, 2026";
  const effectiveDate = "March 15, 2026";

  const sections = [
    {
      id: "acceptance",
      icon: <FiCheckCircle />,
      title: "Acceptance of Terms",
      content: "By accessing or using Lumyna's ESG Calculator platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services."
    },
    {
      id: "eligibility",
      icon: <FiUsers />,
      title: "Eligibility",
      content: "You must be at least 18 years old and have the authority to bind your organization to these terms. By using our services, you represent and warrant that you meet these requirements."
    },
    {
      id: "account",
      icon: <FiLock />,
      title: "Account Responsibilities",
      content: "You are responsible for maintaining the security of your account credentials and for all activities that occur under your account. Notify us immediately of any unauthorized use."
    },
    {
      id: "data",
      icon: <BiLeaf />,
      title: "Your Data & Emissions",
      content: "You retain ownership of all emissions data you submit. We use this data solely to provide our services and improve accuracy. We do not share your data with third parties without your consent."
    },
    {
      id: "prohibited",
      icon: <FiAlertCircle />,
      title: "Prohibited Activities",
      content: "You may not misuse our services, including attempting to interfere with operations, uploading malicious code, or using the platform for any illegal purpose."
    },
    {
      id: "termination",
      icon: <FiShield />,
      title: "Termination",
      content: "We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time, which will remove your data as per our Privacy Policy."
    }
  ];

  return (
    <div className="terms-page-wrapper" style={{ overflowY: "auto", height: "100vh" }}>
      <div className="terms-container">
        <div className={`terms-card ${isVisible ? 'visible' : ''}`}>
          {/* Header */}
          <div className="header">
            <Link to="/" className="back-link">
              <FiArrowLeft /> Back to Home
            </Link>
            <div className="brand-section">
              <div className="logo-wrapper">
                <BiLeaf className="logo-icon" />
                <span className="logo-text">Lumyna</span>
              </div>
            </div>
            <h1>Terms of Service</h1>
            <p className="last-updated">
              <FiCalendar className="calendar-icon" />
              Last updated: {lastUpdated}
            </p>
            <p className="effective-date">Effective: {effectiveDate}</p>
          </div>

          {/* Introduction */}
          <div className="intro-section">
            <p>
              Welcome to Lumyna. These Terms of Service govern your use of our ESG Calculator platform. 
              By using our services, you agree to these terms. Please read them carefully.
            </p>
          </div>

          {/* Sections Grid */}
          <div className="sections-grid">
            {sections.map((section) => (
              <div key={section.id} className="section-card">
                <div className="section-icon">{section.icon}</div>
                <h2>{section.title}</h2>
                <p>{section.content}</p>
              </div>
            ))}
          </div>

          {/* Limitation of Liability */}
          <div className="liability-section">
            <h3>Limitation of Liability</h3>
            <p>
              To the maximum extent permitted by law, Lumyna shall not be liable for any indirect, incidental, 
              special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred 
              directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting 
              from your use of our services.
            </p>
          </div>

          {/* Governing Law */}
          <div className="governing-section">
            <h3>Governing Law</h3>
            <p>
              These terms shall be governed by the laws of the United Arab Emirates, without regard to its 
              conflict of law provisions. Any disputes arising under these terms shall be resolved exclusively 
              in the courts of Dubai, UAE.
            </p>
          </div>

          {/* Changes to Terms */}
          <div className="changes-section">
            <h3>Changes to These Terms</h3>
            <p>
              We may modify these terms at any time. We will notify you of significant changes by posting a 
              notice on our platform or sending an email. Your continued use of the platform after changes 
              constitutes acceptance of the modified terms.
            </p>
          </div>

          {/* Contact Section */}
          <div className="contact-section">
            <h3>Contact Us</h3>
            <p>
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="contact-info">
              <a href="mailto:legal@lumyna.com">legal@lumyna.com</a>
            </div>
          </div>

          {/* Footer */}
          <div className="footer">
            <p>
              By using Lumyna, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
            <div className="footer-links">
              <Link to="/privacy">Privacy Policy</Link>
              <span className="separator">•</span>
              <Link to="/help">Help Center</Link>
              <span className="separator">•</span>
              <Link to="/contact">Contact Us</Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .terms-page-wrapper {
          overflow-y: auto;
          height: 100vh;
        }

        .terms-container {
          min-height: 100vh;
          width: 100%;
          background: #F8FAF8;
          padding: 40px 20px;
        }

        .terms-card {
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

        .terms-card.visible {
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
          margin: 0 0 8px;
        }

        .last-updated {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #6B7280;
          margin: 0;
        }

        .effective-date {
          font-size: 14px;
          color: #6B7280;
          margin: 4px 0 0;
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

        /* Liability, Governing, Changes Sections */
        .liability-section,
        .governing-section,
        .changes-section {
          margin-bottom: 24px;
          padding: 24px;
          background: #F8FAF8;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
        }

        .liability-section h3,
        .governing-section h3,
        .changes-section h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1B4D3E;
          margin: 0 0 12px;
        }

        .liability-section p,
        .governing-section p,
        .changes-section p {
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
          .terms-card {
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
          .terms-card {
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

          .liability-section,
          .governing-section,
          .changes-section {
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