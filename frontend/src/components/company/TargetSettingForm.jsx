// src/components/company/TargetSettingForm.jsx
// Drop this into your company setup wizard as the final step.
// Reads from / saves to companyStore via saveTargets().

import { useState } from "react";
import { useCompanyStore } from "../../store/companyStore";
import { useAuthStore } from "../../store/authStore";

// ── Shared mini-components ────────────────────────────────────────────────────
const Label = ({ children }) => (
  <label style={{
    display: "block", fontSize: 12, fontWeight: 600,
    color: "#4A5568", textTransform: "uppercase",
    letterSpacing: "0.06em", marginBottom: 6,
  }}>
    {children}
  </label>
);

const Input = ({ style = {}, ...props }) => (
  <input
    style={{
      width: "100%", padding: "10px 14px",
      border: "1px solid #E2E8F0", borderRadius: 8,
      fontSize: 14, color: "#1A202C", background: "#fff",
      outline: "none", boxSizing: "border-box",
      transition: "border-color 0.2s",
      ...style,
    }}
    onFocus={e => (e.target.style.borderColor = "#2E7D64")}
    onBlur={e  => (e.target.style.borderColor = "#E2E8F0")}
    {...props}
  />
);

const Select = ({ children, style = {}, ...props }) => (
  <select
    style={{
      width: "100%", padding: "10px 14px",
      border: "1px solid #E2E8F0", borderRadius: 8,
      fontSize: 14, color: "#1A202C", background: "#fff",
      outline: "none", cursor: "pointer", boxSizing: "border-box",
      ...style,
    }}
    {...props}
  >
    {children}
  </select>
);

const FieldGroup = ({ children, style = {} }) => (
  <div style={{ marginBottom: 20, ...style }}>{children}</div>
);

const Row = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
    {children}
  </div>
);

const Hint = ({ children }) => (
  <p style={{ fontSize: 12, color: "#718096", marginTop: 6, marginBottom: 0 }}>
    {children}
  </p>
);

const SectionDivider = ({ title }) => (
  <div style={{ margin: "28px 0 20px" }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "#2E7D64",
      textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
      {title}
    </div>
    <div style={{ height: 1, background: "#E8F5E9" }} />
  </div>
);

const InfoBox = ({ children }) => (
  <div style={{
    background: "#F0FDF4", border: "1px solid #BBF7D0",
    borderLeft: "4px solid #2E7D64", borderRadius: 8,
    padding: "12px 16px", fontSize: 13, color: "#4A5568",
    marginBottom: 20, lineHeight: 1.6,
  }}>
    {children}
  </div>
);

// ── Preview tile ──────────────────────────────────────────────────────────────
const PreviewTile = ({ label, value, sub, color = "#1B4D3E" }) => (
  <div style={{
    background: "#F8FAF8", border: "1px solid #E8F5E9",
    borderRadius: 10, padding: "14px 16px", flex: 1,
  }}>
    <div style={{ fontSize: 11, color: "#718096", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: "#A0AEC0", marginTop: 2 }}>{sub}</div>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function TargetSettingForm({ onNext, onBack }) {
  const { saveTargets, company } = useCompanyStore();
  const token = useAuthStore(s => s.token);

  const currentYear = new Date().getFullYear();

  // Pre-fill from existing targets if user is returning to this step
  const existing = company?.targets || {};

  const [form, setForm] = useState({
    baseYear:      existing.baseYear      ?? currentYear,
    targetYear:    existing.targetYear    ?? 2030,
    reductionPct:  existing.reductionPct  ?? 40,
    scopesCovered: existing.scopesCovered ?? "scope1+2",
    targetType:    existing.targetType    ?? "absolute",
    intensityUnit: existing.intensityUnit ?? "per_employee",
    // Interim milestone
    hasInterim:         !!existing.interimMilestones?.length,
    interimYear:        existing.interimMilestones?.[0]?.year   ?? currentYear + 2,
    interimReductionPct: existing.interimMilestones?.[0]?.reductionPct ?? 20,
    // Context
    primaryDriver:  existing.primaryDriver  ?? "",
    commitmentLevel: existing.commitmentLevel ?? "voluntary",
  });

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // ── Derived preview values ────────────────────────────────────────────────
  const yearsToTarget  = Math.max(form.targetYear - form.baseYear, 1);
  const annualRequired = (form.reductionPct / 100 / yearsToTarget * 100).toFixed(1);
  const sbtiAligned    = form.reductionPct >= 42 && form.targetYear <= 2030;

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    if (form.targetYear <= form.baseYear)
      return "Target year must be after base year.";
    if (form.reductionPct <= 0 || form.reductionPct > 100)
      return "Reduction target must be between 1% and 100%.";
    if (form.hasInterim) {
      if (form.interimYear <= form.baseYear || form.interimYear >= form.targetYear)
        return "Interim milestone year must be between base year and target year.";
      if (form.interimReductionPct >= form.reductionPct)
        return "Interim milestone must be less than the final target.";
    }
    return null;
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setSaving(true);

    const payload = {
      baseYear:      Number(form.baseYear),
      targetYear:    Number(form.targetYear),
      reductionPct:  Number(form.reductionPct),
      scopesCovered: form.scopesCovered,
      targetType:    form.targetType,
      intensityUnit: form.targetType === "intensity" ? form.intensityUnit : null,
      primaryDriver: form.primaryDriver,
      commitmentLevel: form.commitmentLevel,
      interimMilestones: form.hasInterim
        ? [{ year: Number(form.interimYear), reductionPct: Number(form.interimReductionPct) }]
        : [],
      setAt: new Date().toISOString(),
    };

    try {
      await saveTargets(payload, token);
      if (onNext) onNext();
    } catch (e) {
      setError(e.message || "Failed to save targets.");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "8px 0" }}>

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1B4D3E", margin: "0 0 6px" }}>
          Set Your Emission Reduction Target
        </h2>
        <p style={{ fontSize: 14, color: "#718096", margin: 0 }}>
          Your target drives the predictive analytics dashboard — Lumyna will track
          your progress and forecast whether you are on course to meet it.
        </p>
      </div>

      <InfoBox>
        <strong>What is a base year?</strong> The year you begin recording emissions.
        All reduction percentages are measured against your base year total.
        If this is your first year, set it to {currentYear}.
      </InfoBox>

      {/* ── Target basics ─────────────────────────────────────────────── */}
      <SectionDivider title="Target Definition" />

      <Row>
        <FieldGroup>
          <Label>Base Year</Label>
          <Select value={form.baseYear} onChange={e => set("baseYear", +e.target.value)}>
            {Array.from({ length: 6 }, (_, i) => currentYear - 2 + i).map(y =>
              <option key={y} value={y}>{y}</option>
            )}
          </Select>
          <Hint>Year emissions measurement starts from.</Hint>
        </FieldGroup>
        <FieldGroup>
          <Label>Target Year</Label>
          <Select value={form.targetYear} onChange={e => set("targetYear", +e.target.value)}>
            {[2027, 2028, 2029, 2030, 2035, 2040, 2050].map(y =>
              <option key={y} value={y}>{y}</option>
            )}
          </Select>
          <Hint>Year you aim to reach your reduction goal.</Hint>
        </FieldGroup>
      </Row>

      <FieldGroup>
        <Label>Reduction Target (%)</Label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Input
            type="number" min={1} max={100}
            value={form.reductionPct}
            onChange={e => set("reductionPct", +e.target.value)}
            style={{ maxWidth: 120 }}
          />
          <div style={{ flex: 1, position: "relative", height: 8,
            background: "#E2E8F0", borderRadius: 4 }}>
            <div style={{
              width: `${Math.min(form.reductionPct, 100)}%`, height: "100%",
              background: form.reductionPct >= 42 ? "#2E7D64" : "#F59E0B",
              borderRadius: 4, transition: "width 0.3s ease",
            }} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700,
            color: form.reductionPct >= 42 ? "#2E7D64" : "#F59E0B",
            minWidth: 48, textAlign: "right" }}>
            {form.reductionPct}%
          </span>
        </div>
        {sbtiAligned && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#2E7D64", fontWeight: 600 }}>
            ✅ SBTi 1.5°C aligned — requires ≥42% reduction by 2030
          </div>
        )}
        {!sbtiAligned && form.reductionPct > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#F59E0B" }}>
            ⚡ Set ≥42% by 2030 to align with the SBTi 1.5°C pathway
          </div>
        )}
      </FieldGroup>

      {/* ── Scope & type ──────────────────────────────────────────────── */}
      <SectionDivider title="Target Scope & Type" />

      <Row>
        <FieldGroup>
          <Label>Scopes Covered</Label>
          <Select value={form.scopesCovered}
            onChange={e => set("scopesCovered", e.target.value)}>
            <option value="scope1+2">Scope 1 + 2 (Recommended)</option>
            <option value="scope1">Scope 1 Only</option>
            <option value="scope2">Scope 2 Only</option>
          </Select>
          <Hint>Most targets cover both scopes combined.</Hint>
        </FieldGroup>
        <FieldGroup>
          <Label>Target Type</Label>
          <Select value={form.targetType}
            onChange={e => set("targetType", e.target.value)}>
            <option value="absolute">Absolute (total tCO₂e)</option>
            <option value="intensity">Intensity (tCO₂e per unit)</option>
          </Select>
          <Hint>Intensity targets suit growing companies.</Hint>
        </FieldGroup>
      </Row>

      {form.targetType === "intensity" && (
        <FieldGroup>
          <Label>Intensity Unit</Label>
          <Select value={form.intensityUnit}
            onChange={e => set("intensityUnit", e.target.value)}>
            <option value="per_employee">Per Employee</option>
            <option value="per_revenue_usd">Per $1M Revenue</option>
            <option value="per_sqft">Per sq ft of floor space</option>
          </Select>
        </FieldGroup>
      )}

      {/* ── Commitment context ─────────────────────────────────────────── */}
      <SectionDivider title="Commitment Context" />

      <Row>
        <FieldGroup>
          <Label>Commitment Level</Label>
          <Select value={form.commitmentLevel}
            onChange={e => set("commitmentLevel", e.target.value)}>
            <option value="voluntary">Voluntary internal target</option>
            <option value="sbti">Science Based Targets (SBTi)</option>
            <option value="regulatory">Regulatory requirement</option>
            <option value="investor">Investor / board mandate</option>
          </Select>
        </FieldGroup>
        <FieldGroup>
          <Label>Primary Reduction Driver (optional)</Label>
          <Input
            type="text"
            placeholder="e.g. Fleet electrification"
            value={form.primaryDriver}
            onChange={e => set("primaryDriver", e.target.value)}
          />
          <Hint>Your single most impactful planned action.</Hint>
        </FieldGroup>
      </Row>

      {/* ── Interim milestone ─────────────────────────────────────────── */}
      <SectionDivider title="Interim Milestone (Optional)" />

      <FieldGroup>
        <label style={{ display: "flex", alignItems: "center", gap: 10,
          cursor: "pointer", fontSize: 14, color: "#4A5568" }}>
          <input type="checkbox" checked={form.hasInterim}
            onChange={e => set("hasInterim", e.target.checked)}
            style={{ width: 16, height: 16, accentColor: "#2E7D64" }} />
          Add a mid-point milestone to track progress before the final target year
        </label>
      </FieldGroup>

      {form.hasInterim && (
        <Row>
          <FieldGroup>
            <Label>Milestone Year</Label>
            <Select value={form.interimYear}
              onChange={e => set("interimYear", +e.target.value)}>
              {Array.from(
                { length: Math.max(form.targetYear - form.baseYear - 1, 0) },
                (_, i) => form.baseYear + 1 + i
              ).map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label>Reduction by Milestone (%)</Label>
            <Input
              type="number" min={1} max={form.reductionPct - 1}
              value={form.interimReductionPct}
              onChange={e => set("interimReductionPct", +e.target.value)}
            />
            <Hint>Must be less than the final {form.reductionPct}% target.</Hint>
          </FieldGroup>
        </Row>
      )}

      {/* ── Live preview ──────────────────────────────────────────────── */}
      <SectionDivider title="Target Summary Preview" />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <PreviewTile
          label="Base Year"
          value={form.baseYear}
          sub="Measurement starts"
        />
        <PreviewTile
          label="Target Year"
          value={form.targetYear}
          sub={`${yearsToTarget} year${yearsToTarget !== 1 ? "s" : ""} to achieve`}
        />
        <PreviewTile
          label="Reduction Goal"
          value={`${form.reductionPct}%`}
          sub={form.targetType === "absolute" ? "Absolute" : `Intensity (${form.intensityUnit})`}
          color={form.reductionPct >= 42 ? "#2E7D64" : "#F59E0B"}
        />
        <PreviewTile
          label="Annual Required"
          value={`${annualRequired}%/yr`}
          sub="Average yearly reduction needed"
          color="#1B4D3E"
        />
      </div>

      {/* ── Error ────────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          padding: "12px 16px", background: "#FEF2F2",
          border: "1px solid #FECACA", borderRadius: 8,
          color: "#DC2626", fontSize: 13, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
        {onBack && (
          <button onClick={onBack} style={{
            padding: "11px 24px", background: "transparent",
            border: "1px solid #CBD5E0", borderRadius: 8,
            fontSize: 14, color: "#4A5568", cursor: "pointer",
          }}>
            ← Back
          </button>
        )}
        <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
          {onNext && (
            <button onClick={onNext} style={{
              padding: "11px 20px", background: "transparent",
              border: "1px solid #CBD5E0", borderRadius: 8,
              fontSize: 13, color: "#718096", cursor: "pointer",
            }}>
              Skip for now
            </button>
          )}
          <button onClick={handleSave} disabled={saving} style={{
            padding: "11px 28px",
            background: saving ? "#A0AEC0" : "#2E7D64",
            border: "none", borderRadius: 8,
            color: "#fff", fontWeight: 600, fontSize: 14,
            cursor: saving ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}>
            {saving ? "Saving…" : "Save Target & Continue →"}
          </button>
        </div>
      </div>

    </div>
  );
}
