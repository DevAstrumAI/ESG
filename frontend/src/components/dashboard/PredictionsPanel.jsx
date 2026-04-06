// src/components/dashboard/PredictionsPanel.jsx
// Drop this into DashboardPage.jsx after your existing chart components.
// Fetches from GET /api/predictions and renders all available prediction cards.

import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  Area, AreaChart,
} from "recharts";
import { useAuthStore } from "../../store/authStore";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  green:      "#2E7D64",
  greenDark:  "#1B4D3E",
  greenLight: "#F0FDF4",
  amber:      "#F59E0B",
  red:        "#EF4444",
  blue:       "#3B82F6",
  purple:     "#8B5CF6",
  grey:       "#6B7280",
  greyLight:  "#F3F4F6",
  border:     "#E5E7EB",
  text:       "#1A202C",
  textSoft:   "#4A5568",
};

// ── Shared components ──────────────────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div style={{
    background: "#fff", border: `1px solid ${C.border}`,
    borderRadius: 12, padding: "20px 24px",
    ...style,
  }}>
    {children}
  </div>
);

const SectionLabel = ({ children, color = C.green }) => (
  <div style={{
    fontSize: 11, fontWeight: 700, color,
    textTransform: "uppercase", letterSpacing: "0.12em",
    marginBottom: 8,
  }}>
    {children}
  </div>
);

const Stat = ({ label, value, sub, color = C.greenDark }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{ fontSize: 11, color: C.grey, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: C.grey, marginTop: 2 }}>{sub}</div>}
  </div>
);

const StatusBadge = ({ status, color, label }) => (
  <span style={{
    background: `${color}22`, border: `1px solid ${color}55`,
    color, borderRadius: 20, padding: "3px 10px",
    fontSize: 12, fontWeight: 600,
  }}>
    {label}
  </span>
);

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: `1px solid ${C.border}`,
      borderRadius: 8, padding: "10px 14px", fontSize: 12,
    }}>
      <div style={{ color: C.grey, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => p.value != null && (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{Number(p.value).toFixed(2)} tCO₂e</strong>
        </div>
      ))}
    </div>
  );
};

// ── Confidence banner ─────────────────────────────────────────────────────────
const ConfidenceBanner = ({ confidence, dataAvailability }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 16,
    background: `${confidence.color}11`,
    border: `1px solid ${confidence.color}33`,
    borderRadius: 10, padding: "12px 18px", marginBottom: 24,
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: "50%",
      background: confidence.color, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 16, fontWeight: 700, flexShrink: 0,
    }}>
      {confidence.tier}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 700, color: confidence.color, fontSize: 14 }}>
        {confidence.label}
      </div>
      <div style={{ fontSize: 13, color: C.textSoft, marginTop: 2 }}>
        {confidence.message}
      </div>
    </div>
    <div style={{ display: "flex", gap: 20, flexShrink: 0 }}>
      {[
        { label: "Months", val: dataAvailability.total_months },
        { label: "Full Years", val: dataAvailability.full_years_of_data },
      ].map(s => (
        <div key={s.label} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: confidence.color }}>{s.val}</div>
          <div style={{ fontSize: 11, color: C.grey }}>{s.label}</div>
        </div>
      ))}
    </div>
  </div>
);

// ── No target state ───────────────────────────────────────────────────────────
const NoTargetPrompt = () => (
  <Card style={{ textAlign: "center", padding: "36px 24px" }}>
    <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: C.greenDark, marginBottom: 8 }}>
      Set Your Reduction Target to Unlock Predictions
    </div>
    <div style={{ fontSize: 14, color: C.textSoft, marginBottom: 20, maxWidth: 400, margin: "0 auto 20px" }}>
      Predictive analytics requires a target base year and reduction goal.
      Go to Settings → Company Profile to set your target.
    </div>
    <a href="/settings" style={{
      display: "inline-block", padding: "10px 24px",
      background: C.green, color: "#fff", borderRadius: 8,
      fontWeight: 600, fontSize: 14, textDecoration: "none",
    }}>
      Set Target Now
    </a>
  </Card>
);

// ── Prediction: Target trajectory chart ──────────────────────────────────────
const TargetTrajectoryCard = ({ prediction, series, currentYear }) => {
  // Merge actual annual data with trajectory
  const trajectoryMap = {};
  (prediction.data || []).forEach(p => { trajectoryMap[p.year] = p.target_t; });

  const actuals = (series?.annual || []).map(a => ({
    year: a.year,
    actual_t: parseFloat((a.total_kg / 1000).toFixed(3)),
    target_t: trajectoryMap[a.year] || null,
  }));

  const futureTargets = (prediction.data || [])
    .filter(p => p.year > currentYear)
    .map(p => ({ year: p.year, actual_t: null, target_t: p.target_t }));

  const chartData = [...actuals, ...futureTargets]
    .sort((a, b) => a.year - b.year)
    .filter((v, i, arr) => arr.findIndex(x => x.year === v.year) === i);

  return (
    <Card>
      <SectionLabel>Reduction Pathway</SectionLabel>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{prediction.title}</div>
        <div style={{ display: "flex", gap: 20 }}>
          <Stat label="Base Year Total" value={`${(prediction.base_total_kg / 1000).toFixed(2)}`} sub="tCO₂e" />
          <Stat label="Target Total" value={`${prediction.target_total_kg ? (prediction.target_total_kg / 1000).toFixed(2) : "—"}`} sub="tCO₂e" color={C.green} />
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ right: 16, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: C.grey }} />
          <YAxis tick={{ fontSize: 11, fill: C.grey }} />
          <Tooltip content={<ChartTooltip />} />
          <Legend formatter={v => <span style={{ fontSize: 12, color: C.grey }}>{v}</span>} />
          <Line type="monotone" dataKey="actual_t" name="Actual" stroke={C.blue} strokeWidth={2.5} dot={{ r: 4 }} connectNulls={false} />
          <Line type="monotone" dataKey="target_t" name="Required Target" stroke={C.green} strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

// ── Prediction: Year-end projection ──────────────────────────────────────────
const YearEndCard = ({ prediction, currentYear }) => {
  const d = prediction.data;
  return (
    <Card>
      <SectionLabel color={C.blue}>Year-End Projection</SectionLabel>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 16 }}>
        {prediction.title}
      </div>
      <div style={{ display: "flex", gap: 0 }}>
        <div style={{
          flex: 1, background: C.greyLight, borderRadius: 10,
          padding: "16px", display: "flex", flexDirection: "column", gap: 16,
        }}>
          {[
            { label: "Months Submitted", val: `${d.months_submitted} / 12`, color: C.text },
            { label: "Emitted So Far", val: `${(d.total_so_far_kg / 1000).toFixed(2)} tCO₂e`, color: C.blue },
            { label: "Projected Annual", val: `${d.projected_annual_t.toFixed(2)} tCO₂e`, color: C.greenDark },
            { label: "Uncertainty Band", val: `±${d.uncertainty_pct}%`, color: C.amber },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: C.textSoft }}>{s.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.val}</span>
            </div>
          ))}
        </div>
        <div style={{ width: 1, background: C.border, margin: "0 16px" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, color: C.grey, marginBottom: 4 }}>Confidence Band</div>
          <div style={{ fontSize: 12, color: C.grey }}>Low estimate</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.green }}>
            {(d.confidence_band_low_kg / 1000).toFixed(2)} tCO₂e
          </div>
          <div style={{ height: 1, background: C.border }} />
          <div style={{ fontSize: 12, color: C.grey }}>High estimate</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.amber }}>
            {(d.confidence_band_high_kg / 1000).toFixed(2)} tCO₂e
          </div>
          <div style={{ fontSize: 11, color: C.grey, marginTop: 4 }}>
            {d.months_remaining} months remaining in {currentYear}
          </div>
        </div>
      </div>
    </Card>
  );
};

// ── Prediction: On-track analysis ─────────────────────────────────────────────
const OnTrackCard = ({ prediction }) => {
  const d = prediction.data;
  const icons = { on_track: "✅", slightly_off: "⚠️", off_track: "❌" };
  return (
    <Card style={{ borderLeft: `4px solid ${d.color}` }}>
      <SectionLabel color={d.color}>Target Progress</SectionLabel>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 24 }}>{icons[d.status]}</span>
        <div style={{ fontSize: 15, fontWeight: 700, color: d.color }}>
          {prediction.title}
        </div>
        <StatusBadge status={d.status} color={d.color}
          label={d.status === "on_track" ? "On Track" : d.status === "slightly_off" ? "Slightly Behind" : "Off Track"} />
      </div>
      <p style={{ fontSize: 14, color: C.textSoft, marginBottom: 16 }}>{d.message}</p>
      <div style={{ display: "flex", gap: 24 }}>
        <Stat label="This Year Target" value={`${(d.this_year_target_kg / 1000).toFixed(2)}`} sub="tCO₂e required" color={C.green} />
        <Stat label="Projected / Actual" value={`${(d.projected_kg / 1000).toFixed(2)}`} sub="tCO₂e" color={d.on_track ? C.green : C.red} />
        <Stat label="Gap" value={`${d.gap_kg > 0 ? "+" : ""}${(d.gap_kg / 1000).toFixed(2)}`} sub="tCO₂e" color={d.on_track ? C.green : C.red} />
        <Stat label="Gap %" value={`${d.gap_pct > 0 ? "+" : ""}${d.gap_pct.toFixed(1)}%`} color={d.on_track ? C.green : C.red} />
      </div>
    </Card>
  );
};

// ── Prediction: YoY trend ─────────────────────────────────────────────────────
const YoYTrendCard = ({ prediction }) => {
  const d = prediction.data;
  const isDown = d.direction === "decreasing";
  return (
    <Card>
      <SectionLabel color={isDown ? C.green : C.red}>Year-on-Year Trend</SectionLabel>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>
            {prediction.title}
          </div>
          <p style={{ fontSize: 14, color: C.textSoft, margin: 0 }}>{prediction.description}</p>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0, marginLeft: 16 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: isDown ? C.green : C.red }}>
            {isDown ? "↓" : "↑"} {Math.abs(d.avg_yoy_change_pct).toFixed(1)}%
          </div>
          <div style={{ fontSize: 11, color: C.grey }}>avg per year</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={d.annual_history} margin={{ right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: C.grey }} />
          <YAxis tick={{ fontSize: 11, fill: C.grey }} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="total_kg" name="Annual Total"
            stroke={isDown ? C.green : C.red}
            fill={isDown ? "#D1FAE5" : "#FEE2E2"}
            strokeWidth={2} dot={{ r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
        <span style={{ fontSize: 12, color: C.grey }}>
          Trend fit: <strong style={{ color: d.fit_quality === "strong" ? C.green : d.fit_quality === "moderate" ? C.amber : C.red }}>
            {d.fit_quality} (R²={d.r_squared})
          </strong>
        </span>
        <span style={{ fontSize: 12, color: C.grey }}>
          Data points: <strong>{d.data_points}</strong>
        </span>
      </div>
    </Card>
  );
};

// ── Prediction: Multi-year projection ────────────────────────────────────────
const MultiYearCard = ({ prediction }) => {
  const d = prediction.data;
  const chartData = d.projections.map(p => ({
    year:      p.year,
    projected: parseFloat((p.projected_kg / 1000).toFixed(3)),
    band_low:  parseFloat((p.band_low_kg / 1000).toFixed(3)),
    band_high: parseFloat((p.band_high_kg / 1000).toFixed(3)),
    target:    p.target_kg ? parseFloat((p.target_kg / 1000).toFixed(3)) : null,
  }));

  return (
    <Card>
      <SectionLabel color={C.purple}>Multi-Year Forecast</SectionLabel>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>
        {prediction.title}
      </div>
      <p style={{ fontSize: 14, color: C.textSoft, marginBottom: 16 }}>{prediction.description}</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: C.grey }} />
          <YAxis tick={{ fontSize: 11, fill: C.grey }} />
          <Tooltip content={<ChartTooltip />} />
          <Legend formatter={v => <span style={{ fontSize: 12, color: C.grey }}>{v}</span>} />
          <Line type="monotone" dataKey="projected" name="Projected (BAU)" stroke={C.purple} strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="band_low" name="Low estimate" stroke={C.purple} strokeWidth={1} strokeDasharray="3 3" dot={false} />
          <Line type="monotone" dataKey="band_high" name="High estimate" stroke={C.purple} strokeWidth={1} strokeDasharray="3 3" dot={false} />
          <Line type="monotone" dataKey="target" name="Target" stroke={C.green} strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

// ── Prediction: Scenario model ────────────────────────────────────────────────
const ScenarioCard = ({ prediction }) => {
  const d = prediction.data;

  const chartData = (d.scenarios.bau || []).map((b, i) => ({
    year:        b.year,
    bau:         b.t,
    partial:     d.scenarios.partial[i]?.t,
    full_action: d.scenarios.full_action[i]?.t,
  }));

  return (
    <Card>
      <SectionLabel color={C.amber}>Scenario Modelling</SectionLabel>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>
        {prediction.title}
      </div>
      <p style={{ fontSize: 14, color: C.textSoft, marginBottom: 16 }}>{prediction.description}</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: C.grey }} />
          <YAxis tick={{ fontSize: 11, fill: C.grey }} />
          <Tooltip content={<ChartTooltip />} />
          <Legend formatter={v => <span style={{ fontSize: 12, color: C.grey }}>{v}</span>} />
          <Line type="monotone" dataKey="bau" name="Business As Usual" stroke={C.red} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="partial" name="Partial Action" stroke={C.amber} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="full_action" name="Full Action" stroke={C.green} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: C.red }}>
          BAU end: <strong>{(d.summary.bau_end_kg / 1000).toFixed(2)} tCO₂e</strong>
        </span>
        <span style={{ fontSize: 12, color: C.grey }}>
          Required annual reduction: <strong>{(d.summary.required_annual_reduction_kg / 1000).toFixed(2)} tCO₂e/yr</strong>
        </span>
      </div>
    </Card>
  );
};

// ── Prediction: Refrigerant trend ─────────────────────────────────────────────
const RefrigerantCard = ({ prediction }) => {
  const d = prediction.data;
  return (
    <Card style={{ borderLeft: d.alert ? `4px solid ${C.amber}` : `4px solid ${C.green}` }}>
      <SectionLabel color={d.alert ? C.amber : C.green}>Refrigerant Leakage</SectionLabel>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>
        {prediction.title}
      </div>
      <p style={{ fontSize: 14, color: d.alert ? C.amber : C.textSoft }}>
        {prediction.description}
      </p>
      {d.history?.length > 0 && (
        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          {d.history.map(h => (
            <div key={h.year} style={{
              background: C.greyLight, borderRadius: 8,
              padding: "8px 14px", textAlign: "center",
            }}>
              <div style={{ fontSize: 11, color: C.grey }}>{h.year}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{h.kg.toFixed(1)} kg</div>
            </div>
          ))}
          <div style={{
            background: `${C.amber}22`, border: `1px solid ${C.amber}44`,
            borderRadius: 8, padding: "8px 14px", textAlign: "center",
          }}>
            <div style={{ fontSize: 11, color: C.amber }}>{d.next_year} (projected)</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.amber }}>{d.projected_kg.toFixed(1)} kg</div>
          </div>
        </div>
      )}
    </Card>
  );
};

// ── Main panel ────────────────────────────────────────────────────────────────
export default function PredictionsPanel({ currentYear }) {
  const token = useAuthStore(s => s.token);
  const API   = process.env.REACT_APP_API_URL;
  const year  = currentYear || new Date().getFullYear();

  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [data,     setData]     = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API}/api/predictions?year=${year}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.detail) throw new Error(d.detail);
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, year]);

  if (loading) return (
    <div style={{ textAlign: "center", padding: "40px 0", color: C.grey }}>
      <div style={{
        width: 36, height: 36, border: `3px solid ${C.border}`,
        borderTop: `3px solid ${C.green}`, borderRadius: "50%",
        animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
      }} />
      <div style={{ fontSize: 14 }}>Loading predictions…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{
      padding: "12px 16px", background: "#FEF2F2",
      border: "1px solid #FECACA", borderRadius: 8,
      color: "#DC2626", fontSize: 14,
    }}>
      {error}
    </div>
  );

  if (!data) return null;

  if (!data.meta.has_target) return <NoTargetPrompt />;

  const { confidence, data_availability, predictions, series, meta } = data;

  return (
    <div>
      {/* Panel header */}
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: C.greenDark, margin: "0 0 4px" }}>
            Predictive Analytics
          </h3>
          <div style={{ fontSize: 13, color: C.grey }}>
            Target: {meta.reduction_pct}% reduction by {meta.target_year} from {meta.base_year} baseline
          </div>
        </div>
        <div style={{ fontSize: 12, color: C.grey }}>
          Reporting year: <strong>{meta.current_year}</strong>
        </div>
      </div>

      {/* Confidence banner */}
      <ConfidenceBanner confidence={confidence} dataAvailability={data_availability} />

      {/* Prediction cards — only render what's available */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {predictions.on_track_analysis && (
          <OnTrackCard prediction={predictions.on_track_analysis} />
        )}

        {predictions.target_trajectory && (
          <TargetTrajectoryCard
            prediction={predictions.target_trajectory}
            series={series}
            currentYear={year}
          />
        )}

        {predictions.year_end_projection && (
          <YearEndCard prediction={predictions.year_end_projection} currentYear={year} />
        )}

        {predictions.yoy_trend && (
          <YoYTrendCard prediction={predictions.yoy_trend} />
        )}

        {predictions.multi_year_projection && (
          <MultiYearCard prediction={predictions.multi_year_projection} />
        )}

        {predictions.scenario_model && (
          <ScenarioCard prediction={predictions.scenario_model} />
        )}

        {predictions.refrigerant_trend && (
          <RefrigerantCard prediction={predictions.refrigerant_trend} />
        )}

        {/* Locked predictions — show greyed out with unlock requirement */}
        {confidence.tier < 5 && (
          <Card style={{ background: C.greyLight, border: `1px dashed ${C.border}` }}>
            <div style={{ fontSize: 13, color: C.grey, textAlign: "center", padding: "8px 0" }}>
              {confidence.tier < 3 && "📊 Submit 3+ months of data to unlock year-end projections"}
              {confidence.tier === 3 && "📈 Submit a second full year to unlock multi-year projections"}
              {confidence.tier === 4 && "🔬 Submit a third full year to unlock scenario modelling"}
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}
