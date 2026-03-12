// src/pages/HelpPage.jsx
import { Link } from "react-router-dom";
import { FiMail, FiMessageCircle, FiBook, FiHelpCircle } from "react-icons/fi";
import { BiLeaf } from "react-icons/bi";

export default function HelpPage() {
  const faqs = [
    { q: "How do I calculate Scope 1 emissions?", a: "Enter fuel consumption data in the Scope 1 tab." },
    { q: "What's the difference between Scope 1 and 2?", a: "Scope 1: direct emissions, Scope 2: indirect from purchased energy." },
    { q: "How often should I update data?", a: "Monthly updates recommended for accurate tracking." },
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
          background: linear-gradient(135deg, #F0FDF4, #DCFCE7);
          padding: 60px 20px;
        }

        .help-header {
          text-align: center;
          margin-bottom: 50px;
        }

        .header-leaf {
          font-size: 40px;
          color: #22C55E;
          margin-bottom: 16px;
        }

        .help-header h1 {
          color: #14532D;
          font-size: 36px;
          margin: 0 0 8px;
        }

        .help-header p {
          color: #166534;
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
          border-radius: 20px;
          text-align: center;
          text-decoration: none;
          border: 1px solid rgba(34,197,94,0.2);
          transition: all 0.3s ease;
        }

        .help-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(34,197,94,0.2);
        }

        .card-icon {
          font-size: 32px;
          color: #22C55E;
          margin-bottom: 16px;
        }

        .help-card h3 {
          color: #14532D;
          margin: 0 0 8px;
        }

        .help-card p {
          color: #4B5563;
          font-size: 14px;
          margin: 0;
        }

        .faq-section {
          max-width: 700px;
          margin: 0 auto;
          background: white;
          padding: 40px;
          border-radius: 24px;
          border: 1px solid rgba(34,197,94,0.2);
        }

        .faq-section h2 {
          color: #14532D;
          margin: 0 0 30px;
          text-align: center;
        }

        .faq-item {
          padding: 20px 0;
          border-bottom: 1px solid #E5E7EB;
        }

        .faq-item:last-child {
          border-bottom: none;
        }

        .faq-item h4 {
          color: #14532D;
          margin: 0 0 8px;
          font-size: 16px;
        }

        .faq-item p {
          color: #4B5563;
          margin: 0;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}