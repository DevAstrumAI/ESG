// src/pages/HelpPage.jsx
import { Link } from "react-router-dom";
import { FiMail, FiMessageCircle, FiBook, FiHelpCircle } from "react-icons/fi";
import { BiLeaf } from "react-icons/bi";

export default function HelpPage() {
  const faqs = [
    { q: "How do I calculate Scope 1 emissions?", a: "Enter fuel consumption data in the Scope 1 tab. Select vehicle type, fuel type, enter consumption, and click 'Add Row'." },
    { q: "What's the difference between Scope 1 and 2?", a: "Scope 1 covers direct emissions from owned sources (vehicles, equipment). Scope 2 covers indirect emissions from purchased energy (electricity, heating, cooling)." },
    { q: "How often should I update data?", a: "Monthly updates are recommended for accurate tracking and timely reporting." },
    { q: "What emission factors are used?", a: "We use region-specific factors from UAE MoCCaE, Singapore NEA, Saudi Arabia IEA, and IPCC AR5 for refrigerants." },
    { q: "Can I export my data?", a: "Yes! Use the Reports page to export emissions data as PDF, CSV, or Excel." },
  ];

  return (
    <div className="help-container">
      <div className="help-header">
        <BiLeaf className="header-leaf" />
        <h1>Help Center</h1>
        <p>How can we help you today?</p>
      </div>

      <div className="help-grid">
        <Link to="/guide" className="help-card">
          <FiBook className="card-icon" />
          <h3>User Guide</h3>
          <p>Step-by-step instructions</p>
        </Link>

        <Link to="/contact" className="help-card">
          <FiMail className="card-icon" />
          <h3>Contact Us</h3>
          <p>support@esgcalculator.com</p>
        </Link>
      </div>

      <div className="faq-section">
        <h2>Frequently Asked Questions</h2>
        {faqs.map((faq, i) => (
          <div key={i} className="faq-item">
            <h4>{faq.q}</h4>
            <p>{faq.a}</p>
          </div>
        ))}
      </div>

      <style jsx>{`
        .help-container {
          min-height: 100vh;
          background: #F8FAF8;
          padding: 60px 20px;
        }

        .help-header {
          text-align: center;
          margin-bottom: 50px;
        }

        .header-leaf {
          font-size: 40px;
          color: #2E7D64;
          margin-bottom: 16px;
        }

        .help-header h1 {
          color: #1B4D3E;
          font-size: 36px;
          margin: 0 0 8px;
        }

        .help-header p {
          color: #4A5568;
          font-size: 16px;
        }

        .help-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
          max-width: 900px;
          margin: 0 auto 50px;
        }

        .help-card {
          background: white;
          padding: 30px;
          border-radius: 12px;
          text-align: center;
          text-decoration: none;
          border: 1px solid #E5E7EB;
          transition: all 0.3s ease;
        }

        .help-card:hover {
          transform: translateY(-3px);
          border-color: #2E7D64;
        }

        .card-icon {
          font-size: 32px;
          color: #2E7D64;
          margin-bottom: 16px;
        }

        .help-card h3 {
          color: #1B4D3E;
          margin: 0 0 8px;
          font-size: 18px;
        }

        .help-card p {
          color: #4A5568;
          font-size: 14px;
          margin: 0;
        }

        .faq-section {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 40px;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
        }

        .faq-section h2 {
          color: #1B4D3E;
          margin: 0 0 30px;
          text-align: center;
          font-size: 24px;
        }

        .faq-item {
          padding: 20px 0;
          border-bottom: 1px solid #E5E7EB;
        }

        .faq-item:last-child {
          border-bottom: none;
        }

        .faq-item h4 {
          color: #1B4D3E;
          margin: 0 0 8px;
          font-size: 16px;
          font-weight: 600;
        }

        .faq-item p {
          color: #4A5568;
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          .help-container { padding: 40px 16px; }
          .help-header h1 { font-size: 28px; }
          .faq-section { padding: 24px; }
        }
      `}</style>
    </div>
  );
}