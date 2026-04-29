// src/pages/ReportsPage.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FiFileText, FiDownload, FiCalendar, FiFilter, FiBarChart2, 
  FiMapPin, FiZap, FiAlertCircle
} from "react-icons/fi";
import Card from "../components/ui/Card";
import { useCompanyStore } from "../store/companyStore";
import { useAuthStore } from "../store/authStore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from "recharts";
import { reportService } from "../services/reportService";

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("yearly");
  const [selectedYear, setSelectedYear] = useState(String(new Date().getMonth() + 1 >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1));
  const [selectedCity, setSelectedCity] = useState("all");
  const [cities, setCities] = useState(["all"]);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const [showAiReport, setShowAiReport] = useState(false);
  const [reportError, setReportError] = useState(null);

  const reportRef = useRef(null);
  const { company, fetchCompany } = useCompanyStore();
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();

  const [selectedMonth, setSelectedMonth] = useState("01"); // Default January
  const [selectedQuarter, setSelectedQuarter] = useState("Q1");
  const fiscalMonthOptions = useMemo(() => ([
    { value: `${selectedYear}-06`, label: `June ${selectedYear}` },
    { value: `${selectedYear}-07`, label: `July ${selectedYear}` },
    { value: `${selectedYear}-08`, label: `August ${selectedYear}` },
    { value: `${selectedYear}-09`, label: `September ${selectedYear}` },
    { value: `${selectedYear}-10`, label: `October ${selectedYear}` },
    { value: `${selectedYear}-11`, label: `November ${selectedYear}` },
    { value: `${selectedYear}-12`, label: `December ${selectedYear}` },
    { value: `${Number(selectedYear) + 1}-01`, label: `January ${Number(selectedYear) + 1}` },
    { value: `${Number(selectedYear) + 1}-02`, label: `February ${Number(selectedYear) + 1}` },
    { value: `${Number(selectedYear) + 1}-03`, label: `March ${Number(selectedYear) + 1}` },
    { value: `${Number(selectedYear) + 1}-04`, label: `April ${Number(selectedYear) + 1}` },
    { value: `${Number(selectedYear) + 1}-05`, label: `May ${Number(selectedYear) + 1}` },
  ]), [selectedYear]);

  useEffect(() => {
    if (fiscalMonthOptions.length && !fiscalMonthOptions.some((m) => m.value === selectedMonth)) {
      setSelectedMonth(fiscalMonthOptions[0].value);
    }
  }, [fiscalMonthOptions, selectedMonth]);

  useEffect(() => {
    if (token && !company) fetchCompany(token);
  }, [token, company, fetchCompany]);

  useEffect(() => {
    if (company?.locations?.length > 0) {
      const uniqueCities = ["all", ...new Set(company.locations.map(loc => loc.city))];
      setCities(uniqueCities);
    }
  }, [company]);

  const handleGenerateAIReport = async () => {
    setGeneratingAI(true);
    setReportError(null);
    try {
      let month = null;
      
      if (selectedPeriod === "monthly") {
        if (!selectedMonth) {
          setReportError("Please select a month");
          setGeneratingAI(false);
          return;
        }
        month = selectedMonth;
      } 
      else if (selectedPeriod === "quarterly") {
        // Fiscal quarter first month
        const quarterFirstMonthMap = {
          Q1: `${selectedYear}-06`,
          Q2: `${selectedYear}-09`,
          Q3: `${selectedYear}-12`,
          Q4: `${Number(selectedYear) + 1}-03`,
        };
        month = quarterFirstMonthMap[selectedQuarter];
      }

      const selectedLocation = (() => {
        if (!company?.locations?.length || selectedCity === "all") return null;
        const match = company.locations.find(
          (loc) => String(loc.city || "").toLowerCase() === String(selectedCity || "").toLowerCase()
        );
        if (!match) return { city: selectedCity };
        return {
          city: String(match.city || "").toLowerCase(),
          country: String(match.country || "").toLowerCase(),
        };
      })();
      
      const baseYear = parseInt(selectedYear) - 1;
      const result = await reportService.generateAIReport(
        parseInt(selectedYear), 
        month, 
        baseYear,
        selectedLocation,
        { period: selectedPeriod, quarter: selectedQuarter }
      );
      setAiReport(result);
      setShowAiReport(true);
    } catch (error) {
      setReportError(error.message);
      setTimeout(() => setReportError(null), 5000);
    } finally {
      setGeneratingAI(false);
    }
  };

  const downloadPDF = async () => {
    if (!aiReport || !reportRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");
    const element = reportRef.current;

    const waitForImagesToLoad = async (rootEl) => {
      const images = Array.from(rootEl.querySelectorAll("img"));
      if (!images.length) return;
      await Promise.all(
        images.map(
          (img) =>
            new Promise((resolve) => {
              // decode() improves reliability for html2canvas capture timing.
              if (img.complete && img.naturalWidth > 0) {
                if (typeof img.decode === "function") {
                  img.decode().then(resolve).catch(resolve);
                } else {
                  resolve();
                }
                return;
              }
              const done = () => {
                img.removeEventListener("load", done);
                img.removeEventListener("error", done);
                resolve();
              };
              img.addEventListener("load", done, { once: true });
              img.addEventListener("error", done, { once: true });
            })
        )
      );
    };

    const scrollable = element.querySelector(".ai-report-content");
    const originalMaxHeight = scrollable?.style.maxHeight;
    const originalOverflow = scrollable?.style.overflowY;
    if (scrollable) {
      scrollable.style.maxHeight = "none";
      scrollable.style.overflowY = "visible";
    }

    try {
      await waitForImagesToLoad(element);
      const sectionNodes = Array.from(element.querySelectorAll(".report-page"));
      const exportNodes = sectionNodes.length > 0 ? sectionNodes : [element];

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;

      for (let nodeIndex = 0; nodeIndex < exportNodes.length; nodeIndex += 1) {
        const node = exportNodes[nodeIndex];
        const canvas = await html2canvas(node, {
          scale: 1.5,
          useCORS: true,
          imageTimeout: 15000,
          backgroundColor: "#ffffff",
          logging: false,
          foreignObjectRendering: false,
          onclone: (clonedDoc) => {
            clonedDoc.querySelectorAll("svg").forEach((svg) => {
              svg.style.overflow = "visible";
            });
          },
        });

        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const printableHeight = pageHeight - margin * 2;

        // If one section overflows, paginate within that section.
        let yOffset = 0;
        let remainingHeight = imgHeight;
        while (remainingHeight > 0) {
          const sliceHeight = Math.min(remainingHeight, printableHeight);
          const srcY = (yOffset / imgHeight) * canvas.height;
          const srcH = (sliceHeight / imgHeight) * canvas.height;
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = srcH;
          sliceCanvas.getContext("2d").drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
          pdf.addImage(sliceCanvas.toDataURL("image/jpeg", 0.82), "JPEG", margin, margin, imgWidth, sliceHeight);
          remainingHeight -= sliceHeight;
          yOffset += sliceHeight;
          if (remainingHeight > 0) pdf.addPage();
        }

        if (nodeIndex < exportNodes.length - 1) {
          pdf.addPage();
        }
      }
      pdf.save(`esg_report_${selectedYear}.pdf`);
    } finally {
      if (scrollable) {
        scrollable.style.maxHeight = originalMaxHeight;
        scrollable.style.overflowY = originalOverflow;
      }
    }
  };

  const downloadCSV = async () => {
    if (!aiReport) return;
    setExportingCsv(true);
    setReportError(null);
    try {
      const selectedLocation = (() => {
        if (!company?.locations?.length || selectedCity === "all") return null;
        const match = company.locations.find(
          (loc) => String(loc.city || "").toLowerCase() === String(selectedCity || "").toLowerCase()
        );
        if (!match) return { city: selectedCity };
        return {
          city: String(match.city || "").toLowerCase(),
          country: String(match.country || "").toLowerCase(),
        };
      })();

      const monthForPeriod =
        selectedPeriod === "monthly" ? selectedMonth : null;
      const { blob, filename } = await reportService.exportCSV({
        year: parseInt(selectedYear, 10),
        period: selectedPeriod,
        month: monthForPeriod,
        quarter: selectedPeriod === "quarterly" ? selectedQuarter : null,
        location: selectedLocation,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setReportError(error.message || "CSV export failed");
      setTimeout(() => setReportError(null), 5000);
    } finally {
      setExportingCsv(false);
    }
  };

  const getDangerLevelClass = (dangerLevel) => {
    const level = String(dangerLevel || "").toLowerCase();
    if (level === "green") return "green";
    if (level === "amber") return "amber";
    return "red";
  };
  const fiscalYearLabel = `${selectedYear}-${Number(selectedYear || 0) + 1}`;

  return (
    <div className="reports-page">

      {/* ── Header ── */}
      <div className="reports-header">
        <div className="header-left">
          <div className="header-icon"><FiFileText /></div>
          <div>
            <h1>Emissions Reports</h1>
            <p>Generate AI-powered ESG reports with insights and recommendations</p>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={handleGenerateAIReport} disabled={generatingAI} className="ai-report-btn">
            {generatingAI ? <><FiZap className="spin" /> Generating...</> : <><FiZap /> Generate AI Report</>}
          </button>
          <button
            onClick={() => navigate("/reports/formal")}
            className="formal-report-btn"
          >
            <span>📄</span> Formal Report
          </button>
          {showAiReport && aiReport && (
            <button onClick={downloadPDF} className="download-pdf-btn">
              <FiDownload /> Download PDF
            </button>
          )}
          <button
            className="export-all-btn"
            onClick={downloadCSV}
            disabled={!showAiReport || !aiReport || exportingCsv}
          >
            <FiDownload /> {exportingCsv ? "Exporting CSV..." : "Export CSV"}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {reportError && (
        <div className="error-message"><FiAlertCircle /> {reportError}</div>
      )}

      {/* ── AI Report Card ── */}
      {showAiReport && aiReport && (
        <Card ref={reportRef} className="ai-report-card">
          <div className="ai-report-header">
            <div className="ai-report-title">
              <FiZap className="ai-icon" />
              <h3>GHG Emissions Report</h3>
            </div>
            <button className="close-btn" onClick={() => setShowAiReport(false)}>×</button>
          </div>

          <div className="ai-report-content">
            <div className="report-metadata">
              <span>{aiReport.meta?.company_name || "Company"}</span>
              <span>{aiReport.meta?.duration_label || aiReport.meta?.year}</span>
              <span>Baseline: {aiReport.targets?.base_year || "N/A"}</span>
              <span>{aiReport.meta?.generated_at ? new Date(aiReport.meta.generated_at).toLocaleString() : new Date().toLocaleString()}</span>
            </div>

            {aiReport.report_standard && (
              <div className="report-standard">
                <div className="report-cover-page report-page">
                  <div className="report-cover-topline">Lumyina ESG Report</div>
                  <h2 className="report-cover-title">
                    {aiReport.report_standard.section_3_1_cover_metadata?.report_title || "GHG Emissions Report"}
                  </h2>
                  <div className="report-cover-fy">Fiscal Year {fiscalYearLabel}</div>
                  {aiReport.report_standard.section_3_1_cover_metadata?.company_logo ? (
                    <div className="report-logo-wrap">
                      <img
                        src={aiReport.report_standard.section_3_1_cover_metadata.company_logo}
                        alt="Company logo"
                        className="report-company-logo"
                      />
                    </div>
                  ) : null}
                  <div className="report-cover-meta">
                    <div><strong>Company:</strong> {aiReport.report_standard.section_3_1_cover_metadata?.company_name || "—"}</div>
                    <div><strong>Reporting Period:</strong> {aiReport.report_standard.section_3_1_cover_metadata?.reporting_period || "—"}</div>
                    <div><strong>Primary Region:</strong> {aiReport.report_standard.section_3_1_cover_metadata?.primary_operating_region || "—"}</div>
                    <div><strong>Generated On:</strong> {aiReport.report_standard.section_3_1_cover_metadata?.date_of_generation || "—"}</div>
                  </div>
                </div>

                <div className="report-outline-page report-page">
                  <h4>Outline</h4>
                  <div className="breakdown-list">
                    <div className="breakdown-item"><span className="breakdown-name">Section 1</span><span className="breakdown-value">Executive Summary</span></div>
                    <div className="breakdown-item"><span className="breakdown-name">Section 2</span><span className="breakdown-value">Scope 1 Emissions Detail</span></div>
                    <div className="breakdown-item"><span className="breakdown-name">Section 3</span><span className="breakdown-value">Scope 2 Emissions Detail</span></div>
                    <div className="breakdown-item"><span className="breakdown-name">Section 4</span><span className="breakdown-value">Year-on-Year Comparison</span></div>
                    <div className="breakdown-item"><span className="breakdown-name">Section 5</span><span className="breakdown-value">Emissions Intensity Metrics</span></div>
                    <div className="breakdown-item"><span className="breakdown-name">Section 6</span><span className="breakdown-value">Methodology & Emission Factor Disclosure</span></div>
                    <div className="breakdown-item"><span className="breakdown-name">Section 7</span><span className="breakdown-value">Category-Level Recommendations</span></div>
                  </div>
                  <div className="outline-meta">
                    <div><strong>Prepared Using:</strong> {aiReport.report_standard.section_3_1_cover_metadata?.prepared_using || "—"}</div>
                    <div><strong>Compliance:</strong> {aiReport.report_standard.section_3_1_cover_metadata?.ghg_protocol_statement || "—"}</div>
                  </div>
                </div>

                <div className="report-section report-page">
                  <h4>Section 1 — Executive Summary</h4>
                  <div className="executive-summary-card">
                    <div className="exec-header">
                      <div>
                        <div className="exec-label">Total Emissions</div>
                        <div className="exec-total-value">{Number(aiReport.report_standard.section_3_2_executive_summary?.total_emissions_tco2e || 0).toFixed(2)}<span className="exec-total-unit"> tCO₂e</span></div>
                      </div>
                      <div className="exec-right">
                        <div className={`exec-yoy ${Number(aiReport.report_standard.section_3_2_executive_summary?.year_on_year_change_pct || 0) > 0 ? "up" : Number(aiReport.report_standard.section_3_2_executive_summary?.year_on_year_change_pct || 0) < 0 ? "down" : "flat"}`}>
                          <span className="exec-yoy-arrow">{Number(aiReport.report_standard.section_3_2_executive_summary?.year_on_year_change_pct || 0) > 0 ? "↑" : Number(aiReport.report_standard.section_3_2_executive_summary?.year_on_year_change_pct || 0) < 0 ? "↓" : "→"}</span>
                          <span>{Math.abs(Number(aiReport.report_standard.section_3_2_executive_summary?.year_on_year_change_pct || 0)).toFixed(2)}% YoY</span>
                        </div>
                        <span className={`danger-pill ${getDangerLevelClass(aiReport.report_standard.section_3_2_executive_summary?.danger_level)}`}>
                          Danger Level: {aiReport.report_standard.section_3_2_executive_summary?.danger_level || "Red"}
                        </span>
                      </div>
                    </div>
                    <div className="dual-summary">
                      <div className="scope-card"><h4>Scope 1 Total</h4><div className="scope-value">{Number(aiReport.report_standard.section_3_2_executive_summary?.scope1_tco2e || 0).toFixed(2)} tCO₂e</div></div>
                      <div className="scope-card"><h4>Scope 2 Total</h4><div className="scope-value">{Number(aiReport.report_standard.section_3_2_executive_summary?.scope2_tco2e || 0).toFixed(2)} tCO₂e</div></div>
                    </div>
                    <div className="data-coverage-chip">{aiReport.report_standard.section_3_2_executive_summary?.data_coverage_statement || "No coverage data"}</div>
                    <p className="exec-summary-text"><strong>Top Action:</strong> {aiReport.report_standard.section_3_2_executive_summary?.top_1_recommended_action || "No recommendation available."}</p>
                  </div>
                </div>

                <div className="report-section report-page">
                  <h4>Section 2 — Scope 1 Emissions Detail</h4>
                  <div className="breakdown-list">
                    <div className="breakdown-item"><span className="breakdown-name">Scope 1 Total</span><span className="breakdown-value">{Number(aiReport.report_standard.section_3_3_scope1_detail?.scope1_total?.kg || 0).toFixed(2)} kg / {Number(aiReport.report_standard.section_3_3_scope1_detail?.scope1_total?.t || 0).toFixed(4)} tCO₂e</span></div>
                    <div className="breakdown-item"><span className="breakdown-name">Mobile Combustion</span><span className="breakdown-value">{Number(aiReport.report_standard.section_3_3_scope1_detail?.mobile_combustion?.total_t || 0).toFixed(4)} tCO₂e</span></div>
                    <div className="breakdown-item"><span className="breakdown-name">Stationary Combustion</span><span className="breakdown-value">{Number(aiReport.report_standard.section_3_3_scope1_detail?.stationary_combustion?.total_t || 0).toFixed(4)} tCO₂e</span></div>
                    <div className="breakdown-item"><span className="breakdown-name">Refrigerants</span><span className="breakdown-value">{Number(aiReport.report_standard.section_3_3_scope1_detail?.refrigerants?.total_t || 0).toFixed(4)} tCO₂e</span></div>
                    <div className="breakdown-item"><span className="breakdown-name">Fugitive Emissions</span><span className="breakdown-value">{Number(aiReport.report_standard.section_3_3_scope1_detail?.fugitive_emissions?.total_t || 0).toFixed(4)} tCO₂e</span></div>
                  </div>
                  {aiReport.report_standard.section_3_3_scope1_detail?.mobile_combustion?.top5_bar?.length > 0 && (
                    <div className="card16-chart-wrap">
                      <div className="card16-chart-title">Mobile top 5 contributors</div>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={aiReport.report_standard.section_3_3_scope1_detail.mobile_combustion.top5_bar} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis type="number" tickFormatter={(v) => `${v} t`} />
                          <YAxis type="category" dataKey="label" width={210} tick={{ fontSize: 11 }} />
                          <ReTooltip formatter={(v) => [`${v} tCO₂e`, "Emissions"]} />
                          <Bar dataKey="tCO2e" fill="#2563EB" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {Number(aiReport.report_standard.section_3_3_scope1_detail?.stationary_combustion?.biogenic_total_kg || 0) > 0 && (
                    <div className="card16-biogenic">
                      <div className="card16-biogenic-header">
                        <span className="card16-biogenic-tag">Biogenic CO₂</span>
                        <span className="card16-biogenic-total">
                          {Number(aiReport.report_standard.section_3_3_scope1_detail?.stationary_combustion?.biogenic_total_t || 0).toFixed(4)} tCO₂e
                        </span>
                      </div>
                    </div>
                  )}
                  {aiReport.report_standard.section_3_3_scope1_detail?.monthly_breakdown_bar?.length > 0 && (
                    <div className="card16-chart-wrap">
                      <div className="card16-chart-title">Scope 1 monthly breakdown (12-bar)</div>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={aiReport.report_standard.section_3_3_scope1_detail.monthly_breakdown_bar}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="label" />
                          <YAxis tickFormatter={(v) => `${v} t`} />
                          <ReTooltip formatter={(v) => [`${v} tCO₂e`, "Scope 1"]} />
                          <Bar dataKey="t" fill="#2E7D64" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="report-section report-page">
                  <h4>Section 3 — Scope 2 Emissions Detail</h4>
                  <div className="card16-s2-grid">
                    <div className="card16-s2-card">
                      <div className="card16-s2-label">Location-based total</div>
                      <div className="card16-s2-value">{Number(aiReport.report_standard.section_3_4_scope2_detail?.location_based_total_t || 0).toFixed(4)} tCO₂e</div>
                      <div className="card16-s2-meta">
                        Electricity {Number(aiReport.report_standard.section_3_4_scope2_detail?.sub_category_breakdown_t?.electricity_location_based || 0).toFixed(4)} t ·
                        Heating {Number(aiReport.report_standard.section_3_4_scope2_detail?.sub_category_breakdown_t?.heating || 0).toFixed(4)} t ·
                        District Cooling {Number(aiReport.report_standard.section_3_4_scope2_detail?.sub_category_breakdown_t?.district_cooling || 0).toFixed(4)} t
                      </div>
                    </div>
                    <div className="card16-s2-card">
                      <div className="card16-s2-label">Market-based total</div>
                      <div className="card16-s2-value">{Number(aiReport.report_standard.section_3_4_scope2_detail?.market_based_total_t || 0).toFixed(4)} tCO₂e</div>
                      <div className="card16-s2-meta">
                        Electricity {Number(aiReport.report_standard.section_3_4_scope2_detail?.sub_category_breakdown_t?.electricity_market_based || 0).toFixed(4)} t
                      </div>
                    </div>
                    <div className="card16-s2-card card16-s2-card-renew">
                      <div className="card16-s2-label">Renewables (separate)</div>
                      <div className="card16-s2-value">{Number(aiReport.report_standard.section_3_4_scope2_detail?.renewables_reported_separately_t || 0).toFixed(4)} tCO₂e</div>
                    </div>
                  </div>
                  {aiReport.report_standard.section_3_4_scope2_detail?.certificate_holdings?.length > 0 ? (
                    <div className="card16-certificates">
                      <h6 className="card16-certificates-title">Certificate holdings</h6>
                      <div className="card16-cert-table-wrap">
                        <table className="card16-cert-table">
                          <thead>
                            <tr>
                              <th>Certificate</th>
                              <th>MWh covered</th>
                              <th>Issuing body</th>
                              <th>Location</th>
                              <th>Site</th>
                            </tr>
                          </thead>
                          <tbody>
                            {aiReport.report_standard.section_3_4_scope2_detail.certificate_holdings.map((row, i) => (
                              <tr key={i}>
                                <td>{row.certificate_type || "—"}</td>
                                <td>{Number(row.mwh_covered || 0).toLocaleString()}</td>
                                <td>{row.issuing_body || "—"}</td>
                                <td>{row.location || "—"}</td>
                                <td>{row.site_name || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p className="card16-certificates-empty">No certificate holdings for this period.</p>
                  )}
                </div>

                <div className="report-section report-page">
                  <h4>Section 4 — Year-on-Year Comparison</h4>
                  <div className="card16-cert-table-wrap">
                    <table className="card16-cert-table">
                      <thead>
                        <tr>
                          <th>Metric</th>
                          <th>Current Year</th>
                          <th>Previous Year</th>
                          <th>Delta (Difference)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(aiReport.report_standard.section_3_5_yoy_comparison?.comparison_table_rows || []).map((row, idx) => (
                          <tr key={idx}>
                            <td>{row.metric}</td>
                            <td>{row.current != null ? Number(row.current).toFixed(4) : "—"}</td>
                            <td>{row.prior != null ? Number(row.prior).toFixed(4) : "—"}</td>
                            <td>{row.delta_pct != null ? `${Number(row.delta_pct).toFixed(2)}%` : "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {aiReport.report_standard.section_3_5_yoy_comparison?.waterfall_chart?.length > 0 && (
                    <div className="card16-chart-wrap">
                      <div className="card16-chart-title">Waterfall drivers (delta tCO₂e)</div>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={aiReport.report_standard.section_3_5_yoy_comparison.waterfall_chart}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="category" hide />
                          <YAxis />
                          <ReTooltip formatter={(v) => [`${v} tCO₂e`, "Delta"]} />
                          <Bar dataKey="delta_tco2e" fill="#8B5CF6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {aiReport.report_standard.section_3_5_yoy_comparison?.largest_movements?.length > 0 && (
                    <div className="card16-biogenic">
                      <div className="card16-biogenic-header">
                        <span className="card16-biogenic-tag">Top 2 Movements</span>
                      </div>
                      <ul className="card16-biogenic-list">
                        {aiReport.report_standard.section_3_5_yoy_comparison.largest_movements.map((m, idx) => (
                          <li key={idx}>
                            <span>
                              <strong>{m.category}</strong> ({m.direction}, {Number(m.delta_tco2e || 0).toFixed(4)} tCO₂e)
                              <br />
                              <small>{m.probable_cause}</small>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="section-summary">{aiReport.report_standard.section_3_5_yoy_comparison?.ai_variance_explanation || ""}</p>
                </div>

                <div className="report-section report-page">
                  <h4>Section 5 — Emissions Intensity Metrics</h4>
                  <div className="breakdown-list">
                    <div className="breakdown-item">
                      <span className="breakdown-name">tCO₂e per Employee (Current)</span>
                      <span className="breakdown-value">
                        {aiReport.report_standard.section_3_6_intensity_metrics?.tco2e_per_employee?.current != null
                          ? Number(aiReport.report_standard.section_3_6_intensity_metrics.tco2e_per_employee.current).toFixed(4)
                          : "—"}
                      </span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-name">tCO₂e per Employee (Previous)</span>
                      <span className="breakdown-value">
                        {aiReport.report_standard.section_3_6_intensity_metrics?.tco2e_per_employee?.prior != null
                          ? Number(aiReport.report_standard.section_3_6_intensity_metrics.tco2e_per_employee.prior).toFixed(4)
                          : "—"}
                      </span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-name">Employee Delta</span>
                      <span className="breakdown-value">
                        {aiReport.report_standard.section_3_6_intensity_metrics?.tco2e_per_employee?.delta_pct != null
                          ? `${Number(aiReport.report_standard.section_3_6_intensity_metrics.tco2e_per_employee.delta_pct).toFixed(2)}%`
                          : "N/A"}
                      </span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-name">tCO₂e per Vehicle (Current)</span>
                      <span className="breakdown-value">
                        {aiReport.report_standard.section_3_6_intensity_metrics?.tco2e_per_vehicle?.current != null
                          ? Number(aiReport.report_standard.section_3_6_intensity_metrics.tco2e_per_vehicle.current).toFixed(4)
                          : "—"}
                      </span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-name">tCO₂e per Vehicle (Previous)</span>
                      <span className="breakdown-value">
                        {aiReport.report_standard.section_3_6_intensity_metrics?.tco2e_per_vehicle?.prior != null
                          ? Number(aiReport.report_standard.section_3_6_intensity_metrics.tco2e_per_vehicle.prior).toFixed(4)
                          : "—"}
                      </span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-name">Vehicle Delta</span>
                      <span className="breakdown-value">
                        {aiReport.report_standard.section_3_6_intensity_metrics?.tco2e_per_vehicle?.delta_pct != null
                          ? `${Number(aiReport.report_standard.section_3_6_intensity_metrics.tco2e_per_vehicle.delta_pct).toFixed(2)}%`
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="methodology-notes">
                    <span><strong>Employee Count Used:</strong> {aiReport.report_standard.section_3_6_intensity_metrics?.tco2e_per_employee?.employees_used ?? "—"}</span>
                    <span><strong>Vehicle Count Used:</strong> {aiReport.report_standard.section_3_6_intensity_metrics?.tco2e_per_vehicle?.vehicles_used ?? "—"}</span>
                    <span><strong>Formula:</strong> {aiReport.report_standard.section_3_6_intensity_metrics?.notes?.employee_formula || "Total Scope 1 + Scope 2 (tCO2e) / employee count"}</span>
                    <span><strong>Formula:</strong> {aiReport.report_standard.section_3_6_intensity_metrics?.notes?.vehicle_formula || "Total Scope 1 + Scope 2 (tCO2e) / vehicle count"}</span>
                  </div>
                </div>

                <div className="report-section report-page">
                  <h4>Section 6 — Methodology & Emission Factor Disclosure</h4>
                  <div className="breakdown-list">
                    <div className="breakdown-item">
                      <span className="breakdown-name">Organisational Boundary</span>
                      <span className="breakdown-value">{aiReport.report_standard.section_6_methodology_disclosure?.organisational_boundary || "—"}</span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-name">Reporting Standard</span>
                      <span className="breakdown-value">{aiReport.report_standard.section_6_methodology_disclosure?.reporting_standard || "—"}</span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-name">GWP Basis</span>
                      <span className="breakdown-value">{aiReport.report_standard.section_6_methodology_disclosure?.gwp_basis || "—"}</span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-name">Scope 2 Method</span>
                      <span className="breakdown-value">{aiReport.report_standard.section_6_methodology_disclosure?.scope2_method || "—"}</span>
                    </div>
                  </div>
                  <div className="card16-cert-table-wrap" style={{ marginTop: "10px" }}>
                    <table className="card16-cert-table">
                      <thead>
                        <tr>
                          <th>Region</th>
                          <th>Scope 1 Source</th>
                          <th>Scope 2 Source</th>
                          <th>Scope 1 Factors (name, value, source)</th>
                          <th>Scope 2 Factors (name, value, source)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(aiReport.report_standard.section_6_methodology_disclosure?.factor_source_table || []).map((row, idx) => (
                          <tr key={idx}>
                            <td>{row.region}</td>
                            <td>{row.scope1_source}</td>
                            <td>{row.scope2_source}</td>
                            <td>
                              {(row.scope1_factors_used || []).length > 0 ? (
                                <ul className="factor-list-cell">
                                  {row.scope1_factors_used.map((f, i) => <li key={`s1-${idx}-${i}`}>{f}</li>)}
                                </ul>
                              ) : "No Scope 1 entries submitted for selected period."}
                            </td>
                            <td>
                              {(row.scope2_factors_used || []).length > 0 ? (
                                <ul className="factor-list-cell">
                                  {row.scope2_factors_used.map((f, i) => <li key={`s2-${idx}-${i}`}>{f}</li>)}
                                </ul>
                              ) : "No Scope 2 entries submitted for selected period."}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="card16-biogenic" style={{ marginTop: "12px" }}>
                    <ul className="card16-biogenic-list">

                      <li>
                        <span><strong>Scope 3 Exclusion:</strong> {aiReport.report_standard.section_6_methodology_disclosure?.scope3_exclusion_note || "—"}</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="report-section report-page">
                  <h4>Section 7 — Category-Level Recommendations</h4>
                  {(aiReport.report_standard.section_3_7_category_recommendations || []).map((rec, idx) => (
                    <div key={idx} className="recommendation-card">
                      <div className="rec-header">
                        <span className="rec-number">{idx + 1}</span>
                        <span className="rec-title">{rec.category}</span>
                        <span className={`rec-effort rec-effort-${String(rec.difficulty || "medium").toLowerCase()}`}>{rec.difficulty || "Medium"}</span>
                      </div>
                      <p className="rec-description">{rec.specific_action}</p>
                      <div className="rec-footer">
                        <span className="rec-reduction">Estimated reduction: {rec.estimated_reduction_tco2e_range?.min} - {rec.estimated_reduction_tco2e_range?.max} tCO₂e</span>
                        <span className="rec-category">{rec.local_programme || "No local programme mapped"}</span>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {false && (
              <>

            <div className="executive-summary-card">
              <div className="exec-header">
                <div>
                  <div className="exec-label">Total Emissions</div>
                  <div className="exec-total-value">
                    {(
                      aiReport.executive_metrics?.total_tco2e
                      ?? aiReport.breakdown?.combined_total_t
                      ?? 0
                    ).toFixed(2)}
                    <span className="exec-total-unit"> tCO₂e</span>
                  </div>
                </div>
                <div className="exec-right">
                  {aiReport.executive_metrics?.yoy_change_pct !== null && aiReport.executive_metrics?.yoy_change_pct !== undefined ? (
                    <div
                      className={`exec-yoy ${
                        Number(aiReport.executive_metrics?.yoy_change_pct) > 0
                          ? "up"
                          : Number(aiReport.executive_metrics?.yoy_change_pct) < 0
                          ? "down"
                          : "flat"
                      }`}
                    >
                      <span className="exec-yoy-arrow">
                        {Number(aiReport.executive_metrics?.yoy_change_pct) > 0
                          ? "↑"
                          : Number(aiReport.executive_metrics?.yoy_change_pct) < 0
                          ? "↓"
                          : "→"}
                      </span>
                      <span>{Math.abs(Number(aiReport.executive_metrics?.yoy_change_pct)).toFixed(2)}% YoY</span>
                    </div>
                  ) : (
                    <div className="exec-yoy flat"><span className="exec-yoy-arrow">→</span><span>YoY N/A</span></div>
                  )}
                  <span className={`danger-pill ${getDangerLevelClass(aiReport.executive_metrics?.danger_level)}`}>
                    Danger Level: {aiReport.executive_metrics?.danger_level || "Red"}
                  </span>
                </div>
              </div>

              <div className="dual-summary">
                <div className="scope-card">
                  <h4>Scope 1 Total</h4>
                  <div className="scope-value">
                    {(aiReport.executive_metrics?.scope1_tco2e ?? aiReport.breakdown?.scope1?.total_t ?? 0).toFixed(2)} tCO₂e
                  </div>
                  <div className="scope-percent">
                    {((aiReport.breakdown?.scope1?.total_kg || 0) / (aiReport.breakdown?.combined_total_kg || 1) * 100).toFixed(0)}% of total
                  </div>
                </div>
                <div className="scope-card">
                  <h4>Scope 2 Total</h4>
                  <div className="scope-value">
                    {(aiReport.executive_metrics?.scope2_tco2e ?? aiReport.breakdown?.scope2?.total_location_t ?? 0).toFixed(2)} tCO₂e
                  </div>
                  <div className="scope-percent">
                    {((aiReport.breakdown?.scope2?.total_location_kg || 0) / (aiReport.breakdown?.combined_total_kg || 1) * 100).toFixed(0)}% of total
                  </div>
                </div>
              </div>

              <div className="data-coverage-chip">
                Data coverage: {aiReport.executive_metrics?.data_coverage_statement || "0 of 12 months"}
              </div>
              {aiReport.executive_summary && (
                <>
                  <div className="exec-summary-heading">Executive Summary</div>
                  <p className="exec-summary-text">{aiReport.executive_summary}</p>
                </>
              )}
            </div>

            {/* Carbon Score */}
            {aiReport.carbon_score && (
              <div className="carbon-score-card">
                <div className="score-header">
                  <h4>🌱 Carbon Performance Score</h4>
                  <span className={`score-badge ${aiReport.carbon_score.zone?.toLowerCase().replace(' ', '-')}`}>
                    {aiReport.carbon_score.zone}
                  </span>
                </div>
                <div className="score-ring">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#E5E7EB" strokeWidth="8" />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke={aiReport.carbon_score.zone_color || "#22c55e"}
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 50 * (aiReport.carbon_score.score / 100)} ${2 * Math.PI * 50}`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                      style={{ transition: 'stroke-dasharray 0.5s' }}
                    />
                    <text x="60" y="60" textAnchor="middle" dominantBaseline="middle" fontSize="20" fontWeight="700" fill="#1B4D3E">
                      {aiReport.carbon_score.score}
                    </text>
                  </svg>
                  <div className="score-legend">
                    {aiReport.carbon_score.gauge_zones?.map((zone, i) => (
                      <div key={i} className="legend-dot" style={{ backgroundColor: zone.color }} />
                    ))}
                  </div>
                </div>
                {aiReport.carbon_score_narrative && (
                  <p className="score-narrative">{aiReport.carbon_score_narrative}</p>
                )}
              </div>
            )}

            {/* Financial Impact */}
            {aiReport.financial && (
              <div className="financial-dashboard">
                <h4>💰 Financial Impact Dashboard</h4>
                <div className="financial-grid">
                  <div className="financial-card">
                    <div className="label">Carbon Cost Exposure (mid)</div>
                    <div className="value">${aiReport.financial.carbon_cost_exposure?.mid_usd?.toLocaleString()}</div>
                    <div className="sub">per year at regional carbon price</div>
                  </div>
                  <div className="financial-card">
                    <div className="label">Electricity Cost</div>
                    <div className="value">${aiReport.financial.electricity_cost?.annual_cost_usd?.toLocaleString()}</div>
                    <div className="sub">estimated annual</div>
                  </div>
                  <div className="financial-card highlight">
                    <div className="label">Potential Annual Savings</div>
                    <div className="value">${aiReport.financial.total_potential_annual_savings_usd?.toLocaleString()}</div>
                    <div className="sub">from recommended actions</div>
                  </div>
                  <div className="financial-card">
                    <div className="label">Total Estimated Capex</div>
                    <div className="value">${aiReport.financial.total_estimated_capex_usd?.toLocaleString()}</div>
                    <div className="sub">portfolio payback {aiReport.financial.portfolio_payback_years || '—'} years</div>
                  </div>
                </div>
                {aiReport.financial_summary && (
                  <p className="financial-narrative">{aiReport.financial_summary}</p>
                )}
              </div>
            )}

            {/* Savings vs. Capex Bar Chart */}
            {aiReport.charts?.savings_bar && aiReport.charts.savings_bar.length > 0 && (
              <div className="chart-container savings-chart">
                <h4>📊 Annual Savings vs. Upfront Investment</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={aiReport.charts.savings_bar} layout="vertical" margin={{ left: 20, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `$${v.toLocaleString()}`} />
                    <YAxis type="category" dataKey="title" width={150} tick={{ fontSize: 12 }} />
                    <ReTooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Bar dataKey="saving_usd" name="Annual Saving" fill="#10B981" barSize={20} />
                    <Bar dataKey="capex_usd" name="Upfront Capex" fill="#F59E0B" barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="chart-note">* Payback = Capex ÷ Annual Saving (years)</div>
              </div>
            )}

            {/* Card 16: Scope 1 & 2 detail — contributors, biogenic, location/market/renewables, certificates */}
            <div className="report-section card16-scope-detail">
              <h4>Scope 1 &amp; 2 — Detail</h4>
              <p className="section-subtitle">
                Top emission sources, biogenic fuels, location- vs market-based Scope 2, renewables reported separately, and certificate-backed consumption where applicable.
              </p>

              <div className="card16-block">
                <h5 className="card16-subheading">Scope 1 — Direct emissions</h5>
                {aiReport.scope1_summary && <p className="section-summary">{aiReport.scope1_summary}</p>}

                {aiReport.breakdown?.scope1?.categories && (
                  <div className="breakdown-list card16-category-strip">
                    {Object.entries(aiReport.breakdown.scope1.categories).map(([name, data]) => (
                      <div key={name} className="breakdown-item">
                        <span className="breakdown-name">{name}</span>
                        <span className="breakdown-value">{data.t?.toFixed(2) ?? 0} tCO₂e</span>
                        <span className="breakdown-percent">
                          {((data.kg || 0) / (aiReport.breakdown.scope1.total_kg || 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {aiReport.charts?.scope1_top_contributors_bar?.length > 0 ? (
                  <div className="card16-chart-wrap">
                    <div className="card16-chart-title">Top contributors (non-biogenic)</div>
                    <ResponsiveContainer
                      width="100%"
                      height={Math.min(480, 56 + aiReport.charts.scope1_top_contributors_bar.length * 40)}
                    >
                      <BarChart
                        data={aiReport.charts.scope1_top_contributors_bar}
                        layout="vertical"
                        margin={{ left: 12, right: 28, top: 12, bottom: 12 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis type="number" tickFormatter={(v) => `${v} t`} />
                        <YAxis
                          type="category"
                          dataKey="label"
                          width={220}
                          tick={{ fontSize: 11 }}
                        />
                        <ReTooltip
                          formatter={(value, _name, props) => {
                            const p = props?.payload?.pct_of_scope1;
                            const suffix = p != null && p !== undefined ? ` (${p}% of Scope 1)` : "";
                            return [`${value} tCO₂e${suffix}`, "Emissions"];
                          }}
                        />
                        <Bar dataKey="tCO2e" fill="#2563EB" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="card16-empty-hint">No line-level contributor data available for this period (or all entries are biogenic).</p>
                )}

                {Number(aiReport.scope_detail?.scope1?.biogenic?.total_kg) > 0 && (
                  <div className="card16-biogenic">
                    <div className="card16-biogenic-header">
                      <span className="card16-biogenic-tag">Biogenic CO₂</span>
                      <span className="card16-biogenic-total">
                        {Number(aiReport.scope_detail.scope1.biogenic.total_t).toFixed(4)} tCO₂e
                      </span>
                    </div>
                    <p className="card16-biogenic-note">{aiReport.scope_detail.scope1.biogenic.note}</p>
                    <ul className="card16-biogenic-list">
                      {(aiReport.scope_detail.scope1.biogenic.fuels || []).map((f, i) => (
                        <li key={i}>
                          <span>{f.label}</span>
                          <span>{Number(f.t).toFixed(4)} tCO₂e</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="card16-block">
                <h5 className="card16-subheading">Scope 2 — Indirect emissions</h5>
                {aiReport.scope2_summary && <p className="section-summary">{aiReport.scope2_summary}</p>}

                <div className="card16-s2-grid">
                  <div className="card16-s2-card">
                    <div className="card16-s2-label">Location-based total</div>
                    <div className="card16-s2-value">
                      {aiReport.scope_detail?.scope2?.location_based?.total_t != null
                        ? Number(aiReport.scope_detail.scope2.location_based.total_t).toFixed(4)
                        : aiReport.breakdown?.scope2?.total_location_t != null
                          ? Number(aiReport.breakdown.scope2.total_location_t).toFixed(4)
                          : "—"}{" "}
                      tCO₂e
                    </div>
                    <div className="card16-s2-meta">
                      Electricity{" "}
                      {aiReport.scope_detail?.scope2?.location_based?.electricity_kg != null
                        ? (aiReport.scope_detail.scope2.location_based.electricity_kg / 1000).toFixed(4)
                        : "—"}{" "}
                      t · Heating{" "}
                      {aiReport.scope_detail?.scope2?.location_based?.heating_kg != null
                        ? (aiReport.scope_detail.scope2.location_based.heating_kg / 1000).toFixed(4)
                        : "—"}{" "}
                      t
                    </div>
                    <p className="card16-s2-note">{aiReport.scope_detail?.scope2?.location_based?.note}</p>
                  </div>
                  <div className="card16-s2-card">
                    <div className="card16-s2-label">Market-based total</div>
                    <div className="card16-s2-value">
                      {aiReport.scope_detail?.scope2?.market_based?.total_t != null
                        ? Number(aiReport.scope_detail.scope2.market_based.total_t).toFixed(4)
                        : aiReport.breakdown?.scope2?.total_market_t != null
                          ? Number(aiReport.breakdown.scope2.total_market_t).toFixed(4)
                          : "—"}{" "}
                      tCO₂e
                    </div>
                    <div className="card16-s2-meta">
                      Electricity{" "}
                      {aiReport.scope_detail?.scope2?.market_based?.electricity_kg != null
                        ? (aiReport.scope_detail.scope2.market_based.electricity_kg / 1000).toFixed(4)
                        : "—"}{" "}
                      t · Heating{" "}
                      {aiReport.scope_detail?.scope2?.market_based?.heating_kg != null
                        ? (aiReport.scope_detail.scope2.market_based.heating_kg / 1000).toFixed(4)
                        : "—"}{" "}
                      t
                    </div>
                    <p className="card16-s2-note">{aiReport.scope_detail?.scope2?.market_based?.note}</p>
                  </div>
                  <div className="card16-s2-card card16-s2-card-renew">
                    <div className="card16-s2-label">Renewables (separate)</div>
                    <div className="card16-s2-value">
                      {aiReport.scope_detail?.scope2?.renewables?.total_t != null
                        ? Number(aiReport.scope_detail.scope2.renewables.total_t).toFixed(4)
                        : aiReport.breakdown?.scope2?.categories?.["Renewables (reported separately)"]?.t != null
                          ? Number(
                              aiReport.breakdown.scope2.categories["Renewables (reported separately)"].t
                            ).toFixed(4)
                          : "0.0000"}{" "}
                      tCO₂e
                    </div>
                    <p className="card16-s2-note">{aiReport.scope_detail?.scope2?.renewables?.note}</p>
                  </div>
                </div>

                {aiReport.breakdown?.scope2?.categories && (
                  <div className="breakdown-list card16-category-strip">
                    {Object.entries(aiReport.breakdown.scope2.categories).map(([name, data]) => (
                      <div key={name} className="breakdown-item">
                        <span className="breakdown-name">{name}</span>
                        <span className="breakdown-value">{data.t?.toFixed(2) ?? 0} tCO₂e</span>
                        <span className="breakdown-percent">
                          {name.includes("Renewables")
                            ? "reported sep."
                            : `${((data.kg || 0) / (aiReport.breakdown.scope2.total_location_kg || 1) * 100).toFixed(0)}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {aiReport.scope_detail?.scope2?.certificate_holdings?.length > 0 ? (
                  <div className="card16-certificates">
                    <h6 className="card16-certificates-title">Certificate holdings</h6>
                    <div className="card16-cert-table-wrap">
                      <table className="card16-cert-table">
                        <thead>
                          <tr>
                            <th>Period</th>
                            <th>Location</th>
                            <th>Site</th>
                            <th>Certificate</th>
                            <th>kWh</th>
                            <th>Market kg CO₂e</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aiReport.scope_detail.scope2.certificate_holdings.map((row, i) => (
                            <tr key={i}>
                              <td>{row.reporting_month || "—"}</td>
                              <td>{row.location || "—"}</td>
                              <td>{row.site_name || "—"}</td>
                              <td>{row.certificate_label}</td>
                              <td>{Number(row.consumption_kwh || 0).toLocaleString()}</td>
                              <td>{Number(row.market_based_kg ?? 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="card16-certificates-empty">
                    No renewable certificate holdings (market-based REC/PPA) recorded for this period.
                  </p>
                )}
              </div>
            </div>


            {aiReport.recommendations?.length > 0 && (
              <div className="report-section">
                <h4>💡 AI-Generated Recommendations</h4>
                <p className="section-subtitle">Prioritized by estimated emission reduction impact</p>
                {aiReport.recommendations.map((rec, idx) => (
                  <div key={idx} className="recommendation-card">
                    <div className="rec-header">
                      <span className="rec-number">{idx + 1}</span>
                      <span className="rec-title">{rec.title}</span>
                      <span className={`rec-effort rec-effort-${rec.effort?.toLowerCase()}`}>
                        {rec.effort || "Medium"} Effort
                      </span>
                    </div>
                    <p className="rec-description">{rec.description}</p>
                    <div className="rec-footer">
                      <span className="rec-reduction">📉 Estimated Reduction: {rec.estimated_reduction_tco2e} tCO₂e</span>
                      <span className="rec-category">📌 {rec.category || "General"}</span>
                    </div>
                    {rec.justification && (
                      <div className="rec-justification"><small>💭 {rec.justification}</small></div>
                    )}
                    {rec.financial && (
                      <div className="rec-financial">
                        <span>💰 Annual saving: ${rec.financial.annual_saving_usd?.toLocaleString()}</span>
                        <span>🏦 Capex: ${rec.financial.estimated_capex_usd?.toLocaleString()}</span>
                        <span>⏱️ Payback: {rec.financial.payback_years || '—'} years</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}


            {aiReport.quarterly_steps?.length > 0 && (
              <div className="report-section">
                <h4>📅 Quarterly Action Plan</h4>
                <p className="section-subtitle">Required reduction milestones to reach 2030 target</p>
                <div className="quarterly-grid">
                  {aiReport.quarterly_steps.slice(0, 8).map((step, idx) => (
                    <div key={idx} className="quarterly-item">
                      <div className="quarter-period">{step.period}</div>
                      <div className="quarter-target">Target: <strong>{step.target_kg?.toFixed(2) || 0} tCO₂e</strong></div>
                      <div className="quarter-reduction">↓ {step.reduction_from_prev_kg?.toFixed(2) || 0} tCO₂e</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
              </>
            )}
          </div>

          <div className="ai-report-footer">
            <div className="report-meta">
              <span>Based on submitted emissions data</span>
              <span>Prepared in line with GHG Protocol disclosure structure</span>
              <span>Generated by Lumyina ESG Calculator, AstrumAI v1.0</span>
            </div>
          </div>
        </Card>
      )}

      {/* ── Filters Bar ── */}
      <Card className="filters-card">
        <div className="filters-grid">
          <div className="filter-group">
            <label><FiMapPin className="filter-icon" /> City</label>
            <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="filter-select">
              {cities.map(city => <option key={city} value={city}>{city === "all" ? "All Cities" : city}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label><FiCalendar className="filter-icon" /> Report Period</label>
            <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="filter-select">
              <option value="yearly">Yearly</option>
              <option value="quarterly">Quarterly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          
          {/* ✅ MONTH SELECTOR - Now properly inside the filters bar */}
          {selectedPeriod === "monthly" && (
            <div className="filter-group">
              <label><FiCalendar className="filter-icon" /> Month</label>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="filter-select"
              >
                {fiscalMonthOptions.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* ✅ QUARTER SELECTOR - Now properly inside the filters bar */}
          {selectedPeriod === "quarterly" && (
            <div className="filter-group">
              <label><FiCalendar className="filter-icon" /> Quarter</label>
              <select 
                value={selectedQuarter} 
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="filter-select"
              >
                <option value="Q1">Q1 (Jun-Aug)</option>
                <option value="Q2">Q2 (Sep-Nov)</option>
                <option value="Q3">Q3 (Dec-Feb)</option>
                <option value="Q4">Q4 (Mar-May)</option>
              </select>
            </div>
          )}

          <div className="filter-group">
            <label><FiBarChart2 className="filter-icon" /> Fiscal Year</label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="filter-select">
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>
          <button className="filter-btn" onClick={() => setShowAiReport(false)}>
            <FiFilter /> Apply Filters
          </button>
        </div>
      </Card>

      <style jsx>{`
        .reports-page { padding: 24px; max-width: 1400px; margin: 0 auto; }
        .reports-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .header-left { display: flex; align-items: center; gap: 16px; }
        .header-icon { width: 48px; height: 48px; background: #F8FAF8; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #2E7D64; border: 1px solid #E5E7EB; }
        .header-left h1 { font-size: 28px; font-weight: 700; color: #1B4D3E; margin: 0 0 4px; }
        .header-left p { color: #4A5568; margin: 0; }
        .header-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .ai-report-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: linear-gradient(135deg, #8B5CF6, #6D28D9); color: white; border: none; border-radius: 30px; font-weight: 500; cursor: pointer; }
        .formal-report-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: #F8FAF8; color: #1B4D3E; border: 1px solid #2E7D64; border-radius: 30px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
        .formal-report-btn:hover { background: #2E7D64; color: #ffffff; border-color: #1B4D3E; }
        .download-pdf-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: #2E7D64; color: white; border: none; border-radius: 30px; font-weight: 500; cursor: pointer; }
        .export-all-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: #2E7D64; color: white; border: none; border-radius: 30px; font-weight: 500; cursor: pointer; }
        .export-all-btn:hover, .download-pdf-btn:hover { background: #1B4D3E; }
        .export-all-btn:disabled { background: #94A3B8; cursor: not-allowed; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        .error-message { background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
        .ai-report-card { margin-bottom: 24px; padding: 24px; border: 1px solid #E5E7EB; border-radius: 12px; background: white; }
        .ai-report-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #E5E7EB; }
        .ai-report-title { display: flex; align-items: center; gap: 8px; }
        .ai-icon { font-size: 20px; color: #2E7D64; }
        .ai-report-title h3 { margin: 0; font-size: 18px; font-weight: 600; color: #1F2937; }
        .close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #9CA3AF; padding: 0 8px; }
        .ai-report-content { max-height: 600px; overflow-y: auto; margin-bottom: 20px; }
        .report-metadata { display: flex; gap: 16px; flex-wrap: wrap; padding: 12px; background: #F8FAF8; border-radius: 8px; margin-bottom: 20px; font-size: 12px; color: #6B7280; }
        .executive-summary-card { background: #F8FAF8; border: 1px solid #E5E7EB; border-radius: 12px; padding: 18px; margin-bottom: 24px; }
        .exec-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 14px; flex-wrap: wrap; }
        .exec-label { font-size: 12px; font-weight: 700; color: #1B4D3E; text-transform: uppercase; letter-spacing: 0.04em; }
        .exec-total-value { font-size: 38px; font-weight: 700; color: #1B4D3E; line-height: 1.1; margin-top: 4px; }
        .exec-total-unit { font-size: 14px; font-weight: 600; color: #4B5563; }
        .exec-right { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
        .exec-yoy { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
        .exec-yoy.up { background: #FEE2E2; color: #991B1B; }
        .exec-yoy.down { background: #DCFCE7; color: #166534; }
        .exec-yoy.flat { background: #F3F4F6; color: #4B5563; }
        .exec-yoy-arrow { font-size: 13px; font-weight: 700; }
        .danger-pill { padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1px solid transparent; }
        .danger-pill.green { background: #DCFCE7; color: #166534; border-color: #BBF7D0; }
        .danger-pill.amber { background: #FEF3C7; color: #92400E; border-color: #FDE68A; }
        .danger-pill.red { background: #FEE2E2; color: #991B1B; border-color: #FECACA; }
        .dual-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .scope-card { background: #F8FAF8; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #E5E7EB; }
        .scope-card h4 { margin: 0 0 8px; font-size: 14px; color: #6B7280; }
        .scope-value { font-size: 24px; font-weight: 700; color: #1B4D3E; }
        .scope-percent { font-size: 12px; color: #2E7D64; margin-top: 4px; }
        .data-coverage-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #374151; background: white; border: 1px solid #E5E7EB; border-radius: 999px; padding: 6px 12px; margin-bottom: 12px; }
        .exec-summary-heading { margin: 4px 0 8px; font-size: 12px; font-weight: 700; color: #1B4D3E; text-transform: uppercase; letter-spacing: 0.04em; }
        .exec-summary-text { margin: 0; color: #4B5563; font-size: 14px; line-height: 1.6; }
        .report-section { margin-bottom: 24px; }
        .report-page {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 18px;
          break-after: page;
          page-break-after: always;
          min-height: 640px;
        }
        .report-page:last-child {
          break-after: auto;
          page-break-after: auto;
        }
        .report-cover-page {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          background: linear-gradient(180deg, #F8FAF8 0%, #FFFFFF 100%);
        }
        .report-cover-topline {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #2E7D64;
          margin-bottom: 12px;
          font-weight: 700;
        }
        .report-cover-title {
          margin: 0 0 8px;
          color: #1B4D3E;
          font-size: 34px;
          line-height: 1.15;
        }
        .report-cover-fy {
          font-size: 16px;
          color: #374151;
          margin-bottom: 20px;
          font-weight: 600;
        }
        .report-cover-meta {
          display: grid;
          gap: 8px;
          font-size: 14px;
          color: #4B5563;
        }
        .report-outline-page h4 { margin: 0 0 12px; }
        .outline-meta {
          margin-top: 12px;
          display: grid;
          gap: 8px;
          font-size: 13px;
          color: #4B5563;
        }
        .report-section.highlight { background: #F0FDF4; padding: 16px; border-radius: 12px; border-left: 4px solid #10B981; }
        .report-section h4 { font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 12px; }
        .report-logo-wrap {
          margin-bottom: 12px;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          padding: 12px;
          background: #F9FAFB;
          display: inline-flex;
        }
        .report-company-logo {
          max-width: 180px;
          max-height: 64px;
          object-fit: contain;
        }
        .section-summary, .section-subtitle { color: #4B5563; font-size: 14px; margin-bottom: 12px; }
        .breakdown-list { background: white; border-radius: 8px; border: 1px solid #E5E7EB; overflow: hidden; }
        .breakdown-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #F3F4F6; }
        .breakdown-item:last-child { border-bottom: none; }
        .breakdown-name { font-weight: 500; color: #374151; }
        .breakdown-value { font-weight: 600; color: #1B4D3E; }
        .breakdown-percent { font-size: 12px; color: #6B7280; background: #F3F4F6; padding: 2px 8px; border-radius: 20px; }
        .recommendation-card { background: white; border-radius: 8px; padding: 16px; margin-bottom: 12px; border: 1px solid #E5E7EB; }
        .rec-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; }
        .rec-number { width: 24px; height: 24px; background: #8B5CF6; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
        .rec-title { font-weight: 600; color: #1B4D3E; flex: 1; }
        .rec-effort { font-size: 11px; padding: 2px 10px; border-radius: 20px; }
        .rec-effort-low { background: #D1FAE5; color: #065F46; }
        .rec-effort-medium { background: #FEF3C7; color: #92400E; }
        .rec-effort-high { background: #FEE2E2; color: #991B1B; }
        .rec-description { font-size: 13px; color: #4A5568; margin-bottom: 12px; line-height: 1.5; }
        .rec-footer { display: flex; gap: 16px; font-size: 12px; color: #6B7280; margin-bottom: 8px; }
        .rec-justification { padding-top: 8px; border-top: 1px solid #F3F4F6; color: #6B7280; }
        .quarterly-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-top: 12px; }
        .quarterly-item { background: white; border-radius: 8px; padding: 12px; border: 1px solid #E5E7EB; text-align: center; }
        .quarter-period { font-weight: 600; color: #2E7D64; margin-bottom: 6px; }
        .quarter-target { font-size: 13px; color: #1B4D3E; }
        .quarter-reduction { font-size: 11px; color: #10B981; margin-top: 4px; }
        .ai-report-footer { padding-top: 16px; border-top: 1px solid #E5E7EB; }
        .report-meta { display: flex; justify-content: center; gap: 24px; font-size: 12px; color: #6B7280; flex-wrap: wrap; }
        .filters-card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #E5E7EB; }
        .filters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 20px; }
        .filter-group { display: flex; flex-direction: column; gap: 8px; }
        .filter-group label { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: #4A5568; text-transform: uppercase; }
        .filter-icon { color: #2E7D64; }
        .filter-select { padding: 12px 16px; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 14px; background: white; cursor: pointer; }
        .filter-select:focus { border-color: #2E7D64; outline: none; }
        .filter-btn { display: flex; align-items: center; gap: 8px; padding: 12px 24px; background: #F8FAF8; border: 1px solid #E5E7EB; border-radius: 8px; color: #374151; font-weight: 600; cursor: pointer; align-self: flex-end; }
        .filter-btn:hover { background: #E5E7EB; border-color: #2E7D64; }
        .quick-stats { display: flex; align-items: center; justify-content: space-around; padding-top: 20px; border-top: 1px solid #E5E7EB; }
        .quick-stat { display: flex; align-items: center; gap: 12px; }
        .stat-icon { font-size: 24px; color: #2E7D64; }
        .stat-label { display: block; font-size: 12px; color: #6B7280; margin-bottom: 2px; }
        .stat-value { display: block; font-size: 20px; font-weight: 700; color: #1B4D3E; }
        .stat-divider { width: 1px; height: 40px; background: #E5E7EB; }
        .templates-card { background: white; border-radius: 12px; padding: 24px; margin-top: 24px; border: 1px solid #E5E7EB; }
        .templates-card h3 { font-size: 18px; font-weight: 600; color: #1B4D3E; margin: 0 0 4px; }
        .templates-subtitle { color: #6B7280; font-size: 14px; margin: 0 0 20px; }
        .templates-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .template-item { display: flex; align-items: center; gap: 16px; padding: 16px; background: #F9FAFB; border-radius: 12px; border: 1px solid #E5E7EB; transition: all 0.2s ease; }
        .template-item:hover { transform: translateY(-2px); border-color: #2E7D64; }
        .template-icon { font-size: 32px; }
        .template-content { flex: 1; }
        .template-content h4 { font-size: 15px; font-weight: 600; color: #1B4D3E; margin: 0 0 4px; }
        .template-content p { font-size: 12px; color: #6B7280; margin: 0; }
        .generate-btn { padding: 8px 16px; background: white; border: 1px solid #2E7D64; border-radius: 30px; color: #2E7D64; font-weight: 600; font-size: 12px; cursor: pointer; }
        .generate-btn:hover { background: #2E7D64; color: white; }
        @media (max-width: 1024px) { .templates-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 768px) {
          .reports-page { padding: 16px; }
          .filters-grid { grid-template-columns: 1fr; }
          .filter-btn { align-self: stretch; }
          .quick-stats { flex-direction: column; gap: 16px; }
          .stat-divider { width: 80%; height: 1px; }
          .templates-grid { grid-template-columns: 1fr; }
          .dual-summary { grid-template-columns: 1fr; }
          .quarterly-grid { grid-template-columns: 1fr; }
          .exec-total-value { font-size: 30px; }
          .exec-right { align-items: flex-start; }
        }
        .carbon-score-card { background: #F9FAFB; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #E5E7EB; }
        .score-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .score-badge { padding: 4px 12px; border-radius: 30px; font-size: 12px; font-weight: 600; }
        .score-badge.climate-leader { background: #D1FAE5; color: #065F46; }
        .score-badge.on-track { background: #FEF3C7; color: #92400E; }
        .score-badge.needs-attention { background: #FEE2E2; color: #991B1B; }
        .score-badge.high-risk { background: #FEE2E2; color: #991B1B; }
        .score-badge.critical { background: #7f1d1d20; color: #7f1d1d; }
        .score-ring { display: flex; flex-direction: column; align-items: center; }
        .legend-dot { width: 12px; height: 12px; border-radius: 2px; display: inline-block; margin: 0 4px; }
        .score-narrative { margin-top: 12px; font-size: 13px; color: #4B5563; line-height: 1.5; }
        .financial-dashboard { background: #F8FAF8; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #E5E7EB; }
        .financial-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 16px 0; }
        .financial-card { background: white; border-radius: 10px; padding: 16px; text-align: center; border: 1px solid #E5E7EB; }
        .financial-card.highlight { border-left: 3px solid #10B981; background: #F0FDF4; }
        .financial-card .label { font-size: 12px; color: #6B7280; margin-bottom: 8px; }
        .financial-card .value { font-size: 24px; font-weight: 700; color: #1B4D3E; }
        .financial-card .sub { font-size: 11px; color: #9CA3AF; margin-top: 6px; }
        .financial-narrative { font-size: 13px; color: #4B5563; margin-top: 12px; padding-top: 12px; border-top: 1px solid #E5E7EB; }
        .savings-chart { margin-bottom: 24px; }
        .chart-note { margin-top: 12px; padding: 8px 12px; background: #F8FAF8; border-radius: 6px; font-size: 11px; color: #6B7280; text-align: center; }
        .rec-financial { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 10px; padding-top: 8px; border-top: 1px solid #F3F4F6; font-size: 12px; color: #4B5563; }
        .card16-scope-detail { margin-bottom: 28px; }
        .card16-scope-detail h4 { display: flex; align-items: center; gap: 8px; }
        .card16-section-icon { color: #2E7D64; flex-shrink: 0; }
        .card16-block { margin-bottom: 22px; }
        .card16-subheading { font-size: 15px; font-weight: 600; color: #1B4D3E; margin: 0 0 10px; }
        .card16-category-strip { margin-bottom: 14px; }
        .card16-chart-wrap { margin: 16px 0; padding: 12px; background: #FAFAFA; border-radius: 10px; border: 1px solid #E5E7EB; }
        .card16-chart-title { font-size: 12px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 8px; }
        .card16-empty-hint { font-size: 13px; color: #6B7280; margin: 8px 0; }
        .card16-biogenic { margin-top: 16px; padding: 14px 16px; border-radius: 10px; border: 1px solid #BBF7D0; background: #F0FDF4; }
        .card16-biogenic-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
        .card16-biogenic-tag { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #166534; background: #DCFCE7; padding: 4px 10px; border-radius: 999px; }
        .card16-biogenic-total { font-size: 1.1rem; font-weight: 700; color: #166534; }
        .card16-biogenic-note { font-size: 12px; color: #4B5563; margin: 0 0 10px; line-height: 1.5; }
        .card16-biogenic-list { list-style: none; margin: 0; padding: 0; }
        .card16-biogenic-list li { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; padding: 8px 0; border-bottom: 1px solid #D1FAE5; color: #374151; }
        .card16-biogenic-list li:last-child { border-bottom: none; }
        .card16-s2-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin: 14px 0; }
        .card16-s2-card { background: white; border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px; }
        .card16-s2-card-renew { border-color: #A7F3D0; background: #F0FDF4; }
        .card16-s2-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #6B7280; margin-bottom: 6px; }
        .card16-s2-value { font-size: 1.25rem; font-weight: 700; color: #1B4D3E; margin-bottom: 6px; }
        .card16-s2-meta { font-size: 12px; color: #4B5563; margin-bottom: 6px; }
        .card16-s2-note { font-size: 11px; color: #6B7280; margin: 0; line-height: 1.45; }
        .card16-certificates { margin-top: 12px; }
        .card16-certificates-title { font-size: 13px; font-weight: 600; color: #374151; margin: 0 0 10px; }
        .card16-cert-table-wrap { overflow-x: auto; border-radius: 8px; border: 1px solid #E5E7EB; }
        .card16-cert-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .card16-cert-table th, .card16-cert-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #F3F4F6; vertical-align: top; }
        .card16-cert-table th { background: #F9FAFB; font-weight: 600; color: #374151; }
        .factor-list-cell { margin: 0; padding-left: 16px; }
        .factor-list-cell li { margin: 0 0 4px; line-height: 1.35; }
        .card16-certificates-empty { font-size: 13px; color: #6B7280; margin: 8px 0 0; }
      `}</style>
    </div>
  );
}