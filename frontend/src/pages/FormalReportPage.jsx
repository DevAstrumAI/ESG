import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useCompanyStore } from "../store/companyStore";
import {
  FiFileText, FiDownload, FiAlertCircle, FiChevronLeft,
  FiCalendar, FiCheckCircle, FiLoader
} from "react-icons/fi";
import { BiLeaf } from "react-icons/bi";
import Card from "../components/ui/Card";

// ── Service ──────────────────────────────────────────────────────────────────
const generateFormalReport = async (token, year) => {
  const API_URL = process.env.REACT_APP_API_URL;
  const res = await fetch(`${API_URL}/api/reports/generate-formal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reporting_year: year }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to generate formal report");
  }
  return res.json();
};

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionBlock = ({ number, title, content }) => (
  <div className="fr-section">
    <div className="fr-section-header">
      <span className="fr-section-num">{number}</span>
      <h3 className="fr-section-title">{title}</h3>
    </div>
    <p className="fr-section-body">{content}</p>
  </div>
);

const EmissionsTable = ({ summary }) => {
  const rows = [
    { scope: "Scope 1", label: "Direct Emissions", value: summary.scope1_total },
    { scope: "Scope 2", label: "Indirect – Location-Based", value: summary.scope2_location_total },
    { scope: "Scope 2", label: "Indirect – Market-Based", value: summary.scope2_market_total },
  ];
  return (
    <div className="fr-table-wrap">
      <table className="fr-table">
        <thead>
          <tr>
            <th>Scope</th>
            <th>Category</th>
            <th className="text-right">tCO₂e</th>
            <th className="text-right">% of Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i % 2 === 1 ? "alt" : ""}>
              <td className="scope-label">{r.scope}</td>
              <td>{r.label}</td>
              <td className="text-right mono">{r.value?.toFixed(2) ?? "—"}</td>
              <td className="text-right">
                {summary.grand_total
                  ? ((r.value / summary.grand_total) * 100).toFixed(1) + "%"
                  : "—"}
              </td>
            </tr>
          ))}
          <tr className="total-row">
            <td colSpan={2}>Total GHG Emissions</td>
            <td className="text-right mono">{summary.grand_total?.toFixed(2)}</td>
            <td className="text-right">100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const GlossaryTable = ({ glossary }) => (
  <div className="fr-table-wrap">
    <table className="fr-table">
      <thead>
        <tr>
          <th style={{ width: "25%" }}>Term</th>
          <th>Definition</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(glossary).map(([term, def], i) => (
          <tr key={term} className={i % 2 === 1 ? "alt" : ""}>
            <td className="scope-label">{term}</td>
            <td>{def}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const MetaBadge = ({ icon, label, value }) => (
  <div className="fr-meta-badge">
    <span className="fr-meta-icon">{icon}</span>
    <div>
      <div className="fr-meta-label">{label}</div>
      <div className="fr-meta-value">{value}</div>
    </div>
  </div>
);

const TOC_ITEMS = [
  "Executive Summary",
  "Organizational Boundary",
  "Operational Boundary",
  "Methodology",
  "GHG Emissions Summary",
  "Scope 1 Emissions",
  "Scope 2 Emissions",
  "Data Quality & Limitations",
  "Regulatory Alignment",
  "Reduction Targets",
  "Assurance Statement",
  "Glossary",
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FormalReportPage() {
  const token = useAuthStore((s) => s.token);
  const { company } = useCompanyStore();
  const navigate = useNavigate();
  const reportRef = useRef(null);

  const [selectedYear, setSelectedYear] = useState("2026");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await generateFormalReport(token, parseInt(selectedYear));
      setReport(data.report);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 6000);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let yOffset = 0;
      let remaining = imgHeight;
      while (remaining > 0) {
        const sliceH = Math.min(remaining, pageHeight - margin * 2);
        const srcY = (yOffset / imgHeight) * canvas.height;
        const srcH = (sliceH / imgHeight) * canvas.height;
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = srcH;
        slice.getContext("2d").drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        pdf.addImage(slice.toDataURL("image/png"), "PNG", margin, margin, imgWidth, sliceH);
        remaining -= sliceH;
        yOffset += sliceH;
        if (remaining > 0) pdf.addPage();
      }
      pdf.save(`${report.company.name}_GHG_Formal_Report_${report.reporting_year}.pdf`);
    } catch (err) {
      setError("PDF generation failed: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const s = report?.report_sections;

  return (
    <div className="fr-page">

      {/* ── Header ── */}
      <div className="fr-page-header">
        <div className="header-left">
          <div className="header-icon"><FiFileText /></div>
          <div>
            <h1>Formal GHG Report</h1>
            <p>Regulatory-grade emissions inventory for government submission</p>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={() => navigate("/reports")} className="back-btn">
            <FiChevronLeft /> Back to Reports
          </button>
          <div className="year-selector">
            <FiCalendar className="year-icon" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="year-select"
            >
              {["2026", "2025", "2024", "2023"].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {report && (
            <button onClick={handleDownloadPDF} disabled={downloading} className="download-pdf-btn">
              <FiDownload /> {downloading ? "Generating..." : "Download PDF"}
            </button>
          )}
          <button onClick={handleGenerate} disabled={loading} className="generate-btn">
            {loading ? (
              <><FiLoader className="spin" /> Generating...</>
            ) : (
              <><BiLeaf /> {report ? "Regenerate" : "Generate Formal Report"}</>
            )}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="fr-error">
          <FiAlertCircle /> {error}
        </div>
      )}

      {/* ── Empty State ── */}
      {!report && !loading && (
        <Card className="fr-empty-card">
          <div className="fr-empty">
            <div className="fr-empty-icon">📄</div>
            <h2>Formal GHG Emissions Report</h2>
            <p>
              Generate a regulatory-grade GHG inventory report aligned with GHG Protocol
              and your regional framework — suitable for submission to government bodies
              such as MOCCAE, NEA, or PME.
            </p>
            <div className="fr-empty-badges">
              <span className="fr-badge">✅ GHG Protocol Aligned</span>
              <span className="fr-badge">✅ ISO 14064-1</span>
              <span className="fr-badge">✅ SBTi Targets</span>
              <span className="fr-badge">✅ Region-Specific Regulation</span>
            </div>
            <button onClick={handleGenerate} className="generate-btn large">
              <BiLeaf /> Generate Formal Report for {selectedYear}
            </button>
          </div>
        </Card>
      )}

      {/* ── Loading ── */}
      {loading && (
        <Card className="fr-loading-card">
          <div className="fr-loading">
            <div className="fr-loading-spinner" />
            <h3>Generating Formal Report...</h3>
            <p>Aggregating emissions data, applying regional regulatory context, and drafting report sections.</p>
            <div className="fr-loading-steps">
              {["Fetching emissions data", "Applying regional framework", "Drafting report sections", "Finalising glossary & targets"].map((step, i) => (
                <div key={i} className="fr-loading-step">
                  <FiLoader className="spin" style={{ color: "#2E7D64" }} />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ── Report Document ── */}
      {report && s && (
        <div ref={reportRef}>

          {/* Cover Card */}
          <Card className="fr-cover-card">
            <div className="fr-cover">
              <div className="fr-cover-badge">
                <BiLeaf /> {report.reporting_standard}
              </div>
              <h1 className="fr-cover-title">GHG Emissions Inventory Report</h1>
              <h2 className="fr-cover-company">{report.company.name}</h2>
              <div className="fr-cover-meta">
                <MetaBadge icon="📅" label="Reporting Year" value={report.reporting_year} />
                <MetaBadge icon="🏭" label="Industry" value={report.company.industry} />
                <MetaBadge icon="🌍" label="Region" value={report.company.region} />
                <MetaBadge icon="🏛️" label="Submitted To" value={report.regulator} />
              </div>
              <div className="fr-cover-framework">
                <FiCheckCircle className="fr-check" />
                {report.regulatory_framework}
              </div>
              <p className="fr-cover-date">
                Generated: {new Date(report.generated_at).toLocaleDateString("en-GB", {
                  day: "numeric", month: "long", year: "numeric"
                })}
              </p>
            </div>
          </Card>

          {/* Stats bar */}
          <div className="fr-stats-row">
            <Card className="fr-stat-card">
              <div className="fr-stat-label">Total Emissions</div>
              <div className="fr-stat-value">{report.emissions_summary.grand_total?.toFixed(2)}</div>
              <div className="fr-stat-unit">tCO₂e</div>
            </Card>
            <Card className="fr-stat-card">
              <div className="fr-stat-label">Scope 1 (Direct)</div>
              <div className="fr-stat-value">{report.emissions_summary.scope1_total?.toFixed(2)}</div>
              <div className="fr-stat-unit">tCO₂e</div>
            </Card>
            <Card className="fr-stat-card">
              <div className="fr-stat-label">Scope 2 Location-Based</div>
              <div className="fr-stat-value">{report.emissions_summary.scope2_location_total?.toFixed(2)}</div>
              <div className="fr-stat-unit">tCO₂e</div>
            </Card>
            <Card className="fr-stat-card">
              <div className="fr-stat-label">Scope 2 Market-Based</div>
              <div className="fr-stat-value">{report.emissions_summary.scope2_market_total?.toFixed(2)}</div>
              <div className="fr-stat-unit">tCO₂e</div>
            </Card>
          </div>

          {/* Table of Contents */}
          <Card className="fr-toc-card">
            <h3 className="fr-card-heading">Table of Contents</h3>
            <div className="fr-toc-grid">
              {TOC_ITEMS.map((item, i) => (
                <div key={i} className="fr-toc-item">
                  <span className="fr-toc-num">{i + 1}</span>
                  <span className="fr-toc-label">{item}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Report Sections */}
          <Card className="fr-sections-card">
            <SectionBlock number="1" title="Executive Summary" content={s.executive_summary} />
            <hr className="fr-divider" />
            <SectionBlock number="2" title="Organizational Boundary" content={s.organizational_boundary} />
            <hr className="fr-divider" />
            <SectionBlock number="3" title="Operational Boundary" content={s.operational_boundary} />
            <hr className="fr-divider" />
            <SectionBlock number="4" title="Methodology" content={s.methodology} />
            <hr className="fr-divider" />

            {/* Emissions Summary Table */}
            <div className="fr-section">
              <div className="fr-section-header">
                <span className="fr-section-num">5</span>
                <h3 className="fr-section-title">GHG Emissions Summary</h3>
              </div>
              <EmissionsTable summary={report.emissions_summary} />
            </div>
            <hr className="fr-divider" />

            <SectionBlock number="6" title="Scope 1 Emissions" content={s.scope1_narrative} />
            <hr className="fr-divider" />
            <SectionBlock number="7" title="Scope 2 Emissions" content={s.scope2_narrative} />
            <hr className="fr-divider" />
            <SectionBlock number="8" title="Data Quality & Limitations" content={s.data_quality} />
            <hr className="fr-divider" />
            <SectionBlock number="9" title="Regulatory Alignment" content={s.regulatory_alignment} />
            <hr className="fr-divider" />
            <SectionBlock number="10" title="Reduction Targets" content={s.reduction_targets} />
            <hr className="fr-divider" />
            <SectionBlock number="11" title="Assurance Statement" content={s.assurance_statement} />
            <hr className="fr-divider" />

            {/* Glossary */}
            <div className="fr-section">
              <div className="fr-section-header">
                <span className="fr-section-num">12</span>
                <h3 className="fr-section-title">Glossary</h3>
              </div>
              <GlossaryTable glossary={report.glossary || s.glossary || {}} />
            </div>
          </Card>

          {/* Footer */}
          <Card className="fr-footer-card">
            <div className="fr-footer">
              <span>📋 {report.reporting_standard}</span>
              <span>🏛️ Submitted to: {report.regulator}</span>
              <span>© {report.reporting_year} {report.company.name}</span>
              <span>Confidential — Regulatory Submission</span>
            </div>
          </Card>

        </div>
      )}

      <style jsx>{`
        .fr-page { padding: 24px; max-width: 1100px; margin: 0 auto; }

        /* ── Header ── */
        .fr-page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .header-left { display: flex; align-items: center; gap: 16px; }
        .header-icon { width: 48px; height: 48px; background: #F8FAF8; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #2E7D64; border: 1px solid #E5E7EB; }
        .header-left h1 { font-size: 28px; font-weight: 700; color: #1B4D3E; margin: 0 0 4px; }
        .header-left p { color: #4A5568; margin: 0; font-size: 14px; }
        .header-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }

        /* ── Buttons ── */
        .back-btn { display: flex; align-items: center; gap: 6px; padding: 10px 16px; background: white; border: 1px solid #E5E7EB; border-radius: 30px; color: #4A5568; font-weight: 500; cursor: pointer; font-size: 14px; }
        .back-btn:hover { border-color: #2E7D64; color: #2E7D64; }
        .generate-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: #2E7D64; color: white; border: none; border-radius: 30px; font-weight: 600; cursor: pointer; font-size: 14px; }
        .generate-btn:hover { background: #1B4D3E; }
        .generate-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .generate-btn.large { padding: 14px 28px; font-size: 15px; margin-top: 8px; }
        .download-pdf-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: #1B4D3E; color: white; border: none; border-radius: 30px; font-weight: 600; cursor: pointer; font-size: 14px; }
        .download-pdf-btn:hover { background: #163d31; }
        .download-pdf-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── Year selector ── */
        .year-selector { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: white; border: 1px solid #E5E7EB; border-radius: 30px; }
        .year-icon { color: #2E7D64; font-size: 14px; }
        .year-select { border: none; font-size: 14px; color: #1B4D3E; font-weight: 600; cursor: pointer; background: transparent; outline: none; }

        /* ── Error ── */
        .fr-error { display: flex; align-items: center; gap: 8px; background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }

        /* ── Empty ── */
        .fr-empty-card { margin-bottom: 24px; }
        .fr-empty { text-align: center; padding: 48px 24px; }
        .fr-empty-icon { font-size: 56px; margin-bottom: 16px; }
        .fr-empty h2 { font-size: 22px; font-weight: 700; color: #1B4D3E; margin: 0 0 12px; }
        .fr-empty p { color: #4A5568; font-size: 14px; max-width: 520px; margin: 0 auto 20px; line-height: 1.6; }
        .fr-empty-badges { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
        .fr-badge { background: #F0FDF4; border: 1px solid #BBF7D0; color: #065F46; font-size: 12px; font-weight: 500; padding: 4px 12px; border-radius: 30px; }

        /* ── Loading ── */
        .fr-loading-card { margin-bottom: 24px; }
        .fr-loading { text-align: center; padding: 48px 24px; }
        .fr-loading-spinner { width: 48px; height: 48px; border: 4px solid #E5E7EB; border-top-color: #2E7D64; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 20px; }
        .fr-loading h3 { font-size: 18px; font-weight: 600; color: #1B4D3E; margin: 0 0 8px; }
        .fr-loading p { color: #6B7280; font-size: 14px; max-width: 420px; margin: 0 auto 24px; }
        .fr-loading-steps { display: flex; flex-direction: column; gap: 10px; max-width: 280px; margin: 0 auto; text-align: left; }
        .fr-loading-step { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #4A5568; }

        /* ── Cover Card ── */
        .fr-cover-card { margin-bottom: 16px; }
        .fr-cover { text-align: center; padding: 40px 24px; }
        .fr-cover-badge { display: inline-flex; align-items: center; gap: 6px; background: #F0FDF4; border: 1px solid #BBF7D0; color: #065F46; font-size: 12px; font-weight: 600; padding: 4px 14px; border-radius: 30px; margin-bottom: 20px; }
        .fr-cover-title { font-size: 30px; font-weight: 700; color: #1B4D3E; margin: 0 0 8px; }
        .fr-cover-company { font-size: 20px; font-weight: 500; color: #2E7D64; margin: 0 0 24px; }
        .fr-cover-meta { display: flex; justify-content: center; flex-wrap: wrap; gap: 20px; margin-bottom: 20px; }
        .fr-meta-badge { display: flex; align-items: center; gap: 8px; background: #F8FAF8; border: 1px solid #E5E7EB; border-radius: 10px; padding: 10px 16px; }
        .fr-meta-icon { font-size: 18px; }
        .fr-meta-label { font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; }
        .fr-meta-value { font-size: 14px; font-weight: 600; color: #1B4D3E; }
        .fr-cover-framework { display: inline-flex; align-items: center; gap: 8px; color: #2E7D64; font-size: 13px; font-weight: 500; margin-bottom: 12px; }
        .fr-check { color: #10B981; }
        .fr-cover-date { font-size: 12px; color: #9CA3AF; margin: 0; }

        /* ── Stats row ── */
        .fr-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
        .fr-stat-card { text-align: center; padding: 20px 16px !important; }
        .fr-stat-label { font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
        .fr-stat-value { font-size: 28px; font-weight: 700; color: #1B4D3E; }
        .fr-stat-unit { font-size: 12px; color: #2E7D64; margin-top: 2px; }

        /* ── TOC ── */
        .fr-toc-card { margin-bottom: 16px; }
        .fr-card-heading { font-size: 16px; font-weight: 700; color: #1B4D3E; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 0.05em; }
        .fr-toc-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .fr-toc-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px dotted #E5E7EB; }
        .fr-toc-num { width: 24px; height: 24px; background: #F0FDF4; color: #2E7D64; border-radius: 50%; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .fr-toc-label { font-size: 13px; color: #374151; }

        /* ── Section blocks ── */
        .fr-sections-card { margin-bottom: 16px; }
        .fr-section { margin-bottom: 4px; }
        .fr-section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .fr-section-num { width: 28px; height: 28px; background: #2E7D64; color: white; border-radius: 50%; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .fr-section-title { font-size: 15px; font-weight: 700; color: #1B4D3E; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
        .fr-section-body { font-size: 14px; color: #4A5568; line-height: 1.7; margin: 0 0 0 40px; white-space: pre-line; }
        .fr-divider { border: none; border-top: 1px solid #E5E7EB; margin: 24px 0; }

        /* ── Table ── */
        .fr-table-wrap { border-radius: 10px; border: 1px solid #E5E7EB; overflow: hidden; margin-left: 40px; }
        .fr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .fr-table thead tr { background: #1B4D3E; color: white; }
        .fr-table th { padding: 12px 16px; text-align: left; font-weight: 600; letter-spacing: 0.03em; }
        .fr-table td { padding: 11px 16px; color: #374151; border-bottom: 1px solid #F3F4F6; }
        .fr-table tr.alt td { background: #F8FAF8; }
        .fr-table tr.total-row td { background: #F0FDF4; font-weight: 700; color: #1B4D3E; border-top: 2px solid #BBF7D0; }
        .fr-table .scope-label { font-weight: 600; color: #2E7D64; }
        .text-right { text-align: right !important; }
        .mono { font-family: 'Courier New', monospace; }

        /* ── Footer ── */
        .fr-footer-card { margin-bottom: 24px; }
        .fr-footer { display: flex; justify-content: center; flex-wrap: wrap; gap: 24px; font-size: 12px; color: #6B7280; padding: 8px 0; }

        /* ── Spin ── */
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .fr-stats-row { grid-template-columns: repeat(2, 1fr); }
          .fr-toc-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .fr-page { padding: 16px; }
          .fr-page-header { flex-direction: column; align-items: flex-start; }
          .fr-stats-row { grid-template-columns: 1fr 1fr; }
          .fr-cover-meta { flex-direction: column; align-items: center; }
          .fr-table-wrap { margin-left: 0; }
          .fr-section-body { margin-left: 0; }
          .header-actions { width: 100%; flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}