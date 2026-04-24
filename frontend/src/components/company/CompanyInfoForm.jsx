// src/components/company/CompanyInfoForm.jsx
import { useRef, useState } from "react";
import { FiInfo, FiUpload, FiX } from "react-icons/fi";

export default function CompanyInfoForm({ data, updateField }) {
  const [logoError, setLogoError] = useState("");
  const fileInputRef = useRef(null);

  const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
  const MAX_LOGO_BYTES = 2 * 1024 * 1024;
  const MIN_DIMENSION = 64;
  const MAX_DIMENSION = 1024;

  const readImageDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read logo file."));
      reader.readAsDataURL(file);
    });

  const getImageDimensions = (dataUrl) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => reject(new Error("Invalid image file."));
      img.src = dataUrl;
    });

  const handleLogoSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogoError("");

    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      setLogoError("Use PNG, JPG, WEBP, or SVG format.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Logo must be 2MB or smaller.");
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await readImageDataUrl(file);
      if (file.type !== "image/svg+xml") {
        const { width, height } = await getImageDimensions(dataUrl);
        if (
          width < MIN_DIMENSION ||
          height < MIN_DIMENSION ||
          width > MAX_DIMENSION ||
          height > MAX_DIMENSION
        ) {
          setLogoError("Logo dimensions must be between 64px and 1024px.");
          event.target.value = "";
          return;
        }
      }
      updateField("logo", dataUrl);
    } catch (error) {
      setLogoError(error.message || "Could not process logo.");
    }
  };

  const clearLogo = () => {
    updateField("logo", "");
    setLogoError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="form-step">
      <div className="step-header">
        <span className="step-icon">🏢</span>
        <h3>Company Information</h3>
      </div>
      
      <p className="step-description">
        Tell us about your company to get started with accurate emissions calculations.
      </p>

      <div className="form-fields">
        <div className="field-group">
          <label className="field-label">
            Company Name <span className="required">*</span>
          </label>
          <input
            type="text"
            className="field-input"
            value={data.name}
            placeholder="e.g., Acme Corporation"
            onChange={(e) => updateField("name", e.target.value)}
          />
          <span className="field-hint">This will be used for all reports</span>
        </div>

        <div className="field-group">
          <label className="field-label">Company Description</label>
          <textarea
            className="field-textarea"
            value={data.description}
            placeholder="Brief description of your business activities"
            onChange={(e) => updateField("description", e.target.value)}
            rows={3}
          />
          <span className="field-hint">
            <FiInfo /> Optional but helps with industry benchmarking
          </span>
        </div>

        <div className="field-group">
          <label className="field-label">Company Logo</label>
          <div className="logo-upload-row">
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.svg"
              className="logo-file-input"
              onChange={handleLogoSelect}
            />
            <button type="button" className="logo-upload-btn" onClick={() => fileInputRef.current?.click()}>
              <FiUpload /> Upload Logo
            </button>
            {data.logo ? (
              <button type="button" className="logo-remove-btn" onClick={clearLogo}>
                <FiX /> Remove
              </button>
            ) : null}
          </div>
          <span className="field-hint">
            Accepted: PNG/JPG/WEBP/SVG, max 2MB. Recommended: 320 x 320 px (or 400 x 200 px for wide logos). Allowed range: 64 x 64 px to 1024 x 1024 px.
          </span>
          {logoError ? <div className="logo-error">{logoError}</div> : null}
          {data.logo ? (
            <div className="logo-preview-wrap">
              <img src={data.logo} alt="Company logo preview" className="logo-preview" />
            </div>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        .form-step {
          animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .step-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .step-icon {
          font-size: 32px;
        }

        .step-header h3 {
          font-size: 22px;
          font-weight: 700;
          color: #1B4D3E;
          margin: 0;
        }

        .step-description {
          color: #4A5568;
          margin-bottom: 32px;
          font-size: 15px;
          line-height: 1.6;
        }

        .form-fields {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .required {
          color: #DC2626;
        }

        .field-input, .field-textarea {
          padding: 12px 16px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s ease;
          font-family: inherit;
          background: white;
        }

        .field-input:focus, .field-textarea:focus {
          outline: none;
          border-color: #2E7D64;
        }

        .field-textarea {
          resize: vertical;
        }

        .field-hint {
          font-size: 12px;
          color: #6B7280;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
        }
        .logo-upload-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .logo-file-input {
          display: none;
        }
        .logo-upload-btn,
        .logo-remove-btn {
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          background: #FFFFFF;
          color: #374151;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        .logo-upload-btn:hover,
        .logo-remove-btn:hover {
          border-color: #9CA3AF;
        }
        .logo-preview-wrap {
          margin-top: 6px;
          border: 1px dashed #D1D5DB;
          border-radius: 10px;
          padding: 10px;
          background: #F9FAFB;
          width: fit-content;
        }
        .logo-preview {
          max-width: 180px;
          max-height: 80px;
          object-fit: contain;
          display: block;
        }
        .logo-error {
          font-size: 12px;
          color: #B91C1C;
        }

        @media (max-width: 768px) {
          .step-header {
            gap: 10px;
            margin-bottom: 12px;
          }
          .step-icon {
            font-size: 26px;
          }
          .step-header h3 {
            font-size: 18px;
          }
          .step-description {
            margin-bottom: 20px;
            font-size: 14px;
            line-height: 1.5;
          }
          .form-fields {
            gap: 16px;
          }
          .field-input,
          .field-textarea {
            font-size: 16px; /* prevent iOS zoom */
            padding: 11px 12px;
          }
          .field-hint {
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}