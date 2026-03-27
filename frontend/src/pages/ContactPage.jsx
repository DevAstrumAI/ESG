// src/pages/ContactPage.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  FiMail, 
  FiPhone, 
  FiMapPin, 
  FiSend, 
  FiUser, 
  FiMessageSquare,
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiTwitter,
  FiLinkedin,
  FiGithub
} from "react-icons/fi";
import { BiLeaf, BiSupport } from "react-icons/bi";
import { GiEarthAmerica } from "react-icons/gi";
import { useAuthStore } from "../store/authStore";

export default function ContactPage() {
  const user = useAuthStore((s) => s.user);

  const [formData, setFormData] = useState({
    name: user?.displayName || "",
    email: user?.email || "",
    subject: "",
    message: ""
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email is invalid";
    if (!formData.subject.trim()) newErrors.subject = "Subject is required";
    if (!formData.message.trim()) newErrors.message = "Message is required";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    await new Promise((res) => setTimeout(res, 800));
    setLoading(false);
    setSubmitted(true);
  };

  const handleSendAnother = () => {
    setSubmitted(false);
    setFormData({
      name: user?.displayName || "",
      email: user?.email || "",
      subject: "",
      message: "",
    });
  };

  return (
    <div className="contact-container">
      <Link to="/help" className="back-link">
        <FiArrowLeft /> Back to Help Center
      </Link>

      <div className="contact-header">
        <div className="header-icon"><BiSupport /></div>
        <h1>Contact Us</h1>
        <p>We're here to help with any questions or concerns</p>
      </div>

      <div className="contact-grid">
        {/* Contact Form */}
        <div className="contact-form-card">
          <h2>Send us a message</h2>

          {submitted ? (
            <div className="success-message">
              <FiCheckCircle className="success-icon" />
              <h3>Message Sent!</h3>
              <p>Thank you for contacting us. We'll get back to you within 24 hours.</p>
              <button onClick={handleSendAnother} className="send-another-btn">
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">
                    <FiUser className="label-icon" />Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className={errors.name ? "error" : ""}
                  />
                  {errors.name && <span className="error-text">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="email">
                    <FiMail className="label-icon" />Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@company.com"
                    className={errors.email ? "error" : ""}
                  />
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="subject">
                  <FiMessageSquare className="label-icon" />Subject
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className={errors.subject ? "error" : ""}
                >
                  <option value="">Select a subject</option>
                  <option value="technical">Technical Support</option>
                  <option value="billing">Billing Question</option>
                  <option value="feature">Feature Request</option>
                  <option value="data">Data Correction</option>
                  <option value="other">Other</option>
                </select>
                {errors.subject && <span className="error-text">{errors.subject}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="message">
                  <BiLeaf className="label-icon" />Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="How can we help you?"
                  rows="5"
                  className={errors.message ? "error" : ""}
                />
                {errors.message && <span className="error-text">{errors.message}</span>}
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <span className="loading-dots">Sending</span>
                ) : (
                  <><FiSend /> Send Message</>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Contact Information */}
        <div className="contact-info-card">
          <h2>Other ways to reach us</h2>

          <div className="info-list">
            <div className="info-item">
              <div className="info-icon"><FiMail /></div>
              <div>
                <h4>Email</h4>
                <a href="mailto:support@esgcalculator.com">support@esgcalculator.com</a>
                <p className="info-note">Response within 24 hours</p>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon"><FiPhone /></div>
              <div>
                <h4>Phone</h4>
                <a href="tel:+1234567890">+1 (234) 567-890</a>
                <p className="info-note">Mon-Fri, 9am-6pm EST</p>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon"><FiMapPin /></div>
              <div>
                <h4>Office</h4>
                <p>123 Green Street, Suite 100<br />Dubai, UAE</p>
              </div>
            </div>
          </div>

          <div className="office-hours">
            <FiClock className="hours-icon" />
            <div>
              <h4>Support Hours</h4>
              <p>Monday - Friday: 9:00 AM - 6:00 PM GST</p>
              <p>Saturday - Sunday: Closed</p>
            </div>
          </div>

          <div className="social-links">
            <h4>Connect with us</h4>
            <div className="social-icons">
              <a href="#" className="social-icon twitter"><FiTwitter /></a>
              <a href="#" className="social-icon linkedin"><FiLinkedin /></a>
              <a href="#" className="social-icon github"><FiGithub /></a>
              <a href="#" className="social-icon earth"><GiEarthAmerica /></a>
            </div>
          </div>

          <div className="emergency-note">
            <BiLeaf className="emergency-icon" />
            <p>
              <strong>For urgent emission reporting issues,</strong><br />
              please call our emergency support line.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .contact-container {
          min-height: 100vh;
          background: #F8FAF8;
          padding: 40px 20px;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #2E7D64;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 30px;
          transition: all 0.2s ease;
        }

        .back-link:hover { gap: 12px; color: #1B4D3E; }

        .contact-header {
          text-align: center;
          margin-bottom: 50px;
        }

        .header-icon {
          width: 80px;
          height: 80px;
          background: #F8FAF8;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          color: #2E7D64;
          margin: 0 auto 20px;
          border: 1px solid #E5E7EB;
        }

        .contact-header h1 {
          color: #1B4D3E;
          font-size: 36px;
          margin: 0 0 8px;
        }

        .contact-header p { color: #4A5568; font-size: 16px; }

        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .contact-form-card,
        .contact-info-card {
          background: white;
          border-radius: 12px;
          padding: 40px;
          border: 1px solid #E5E7EB;
        }

        .contact-form-card h2,
        .contact-info-card h2 {
          color: #1B4D3E;
          font-size: 24px;
          margin: 0 0 30px;
        }

        .success-message {
          text-align: center;
          padding: 40px 20px;
        }

        .success-icon {
          font-size: 64px;
          color: #2E7D64;
          margin-bottom: 20px;
          animation: scaleIn 0.5s ease;
        }

        @keyframes scaleIn {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }

        .success-message h3 { color: #1B4D3E; font-size: 24px; margin: 0 0 10px; }
        .success-message p { color: #4A5568; margin: 0 0 20px; }

        .send-another-btn {
          padding: 12px 24px;
          background: #2E7D64;
          color: white;
          border: none;
          border-radius: 30px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .send-another-btn:hover {
          background: #1B4D3E;
        }

        .contact-form { display: flex; flex-direction: column; gap: 20px; }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group { display: flex; flex-direction: column; gap: 8px; }

        .form-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #4A5568;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .label-icon { color: #2E7D64; }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 12px 16px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s ease;
          background: white;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #2E7D64;
        }

        .form-group input.error,
        .form-group select.error,
        .form-group textarea.error { border-color: #DC2626; }

        .error-text { color: #DC2626; font-size: 12px; }

        .submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 24px;
          background: #2E7D64;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 10px;
        }

        .submit-btn:hover:not(:disabled) {
          background: #1B4D3E;
        }

        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        @keyframes ellipsis {
          0% { content: "Sending"; }
          33% { content: "Sending."; }
          66% { content: "Sending.."; }
          100% { content: "Sending..."; }
        }

        .loading-dots::after {
          content: "";
          animation: ellipsis 1.2s steps(4, end) infinite;
        }

        .info-list { display: flex; flex-direction: column; gap: 30px; margin-bottom: 30px; }

        .info-item { display: flex; gap: 16px; }

        .info-icon {
          width: 48px;
          height: 48px;
          background: #F8FAF8;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: #2E7D64;
          border: 1px solid #E5E7EB;
          flex-shrink: 0;
        }

        .info-item h4 { color: #1B4D3E; font-size: 16px; margin: 0 0 6px; }
        .info-item a { color: #2E7D64; text-decoration: none; font-size: 15px; display: block; margin-bottom: 4px; }
        .info-item a:hover { text-decoration: underline; }
        .info-item p { color: #4A5568; font-size: 14px; margin: 0; }
        .info-note { color: #6B7280; font-size: 13px; margin: 0; }

        .office-hours {
          display: flex;
          gap: 16px;
          padding: 20px;
          background: #F8FAF8;
          border-radius: 12px;
          margin-bottom: 30px;
          border: 1px solid #E5E7EB;
        }

        .hours-icon { font-size: 24px; color: #2E7D64; flex-shrink: 0; }
        .office-hours h4 { color: #1B4D3E; font-size: 16px; margin: 0 0 8px; }
        .office-hours p { color: #4A5568; font-size: 14px; margin: 4px 0; }

        .social-links { margin-bottom: 30px; }
        .social-links h4 { color: #1B4D3E; font-size: 16px; margin: 0 0 16px; }
        .social-icons { display: flex; gap: 12px; }

        .social-icon {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: white;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .social-icon:hover { transform: translateY(-3px); }
        .social-icon.twitter { background: #1DA1F2; }
        .social-icon.linkedin { background: #0077B5; }
        .social-icon.github { background: #333; }
        .social-icon.earth { background: #2E7D64; }

        .emergency-note {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: #FEF3C7;
          border-radius: 12px;
          border: 1px solid #FCD34D;
        }

        .emergency-icon { font-size: 32px; color: #F59E0B; flex-shrink: 0; }
        .emergency-note p { color: #92400E; font-size: 14px; margin: 0; }

        @media (max-width: 768px) {
          .contact-grid { grid-template-columns: 1fr; }
          .form-row { grid-template-columns: 1fr; }
          .contact-form-card, .contact-info-card { padding: 30px 20px; }
          .contact-header h1 { font-size: 28px; }
          .info-item { flex-direction: column; }
          .social-icons { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}