import React, { useEffect, useMemo, useState } from "react";
import Card from "../ui/Card";
import { appendLocationQuery } from "../../utils/locationQuery";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function avg(values) {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export default function SeasonalPatternCard({ token, year, selectedFacility }) {
  const [loading, setLoading] = useState(false);
  const [yearRows, setYearRows] = useState([]);

  useEffect(() => {
    const run = async () => {
      if (!token || !year) return;
      setLoading(true);
      try {
        const years = [year - 2, year - 1, year];
        const results = await Promise.all(
          years.map(async (y) => {
            let url = `${API_URL}/api/emissions/monthly-category-breakdown?year=${y}&scope=scope2`;
            if (selectedFacility?.country && selectedFacility?.city) {
              url = appendLocationQuery(url, selectedFacility.country, selectedFacility.city, selectedFacility.branch, selectedFacility.region);
            }
            const res = await fetch(url, {
              headers: { Authorization: `Bearer ${token}` },
              cache: "no-store",
            });
            if (!res.ok) return { year: y, byMonth: {}, points: 0 };
            const payload = await res.json();
            const byMonth = {};
            let points = 0;
            (Array.isArray(payload) ? payload : []).forEach((r) => {
              const monthNum = Number(String(r?.month || "").split("-")[1] || 0);
              if (!monthNum) return;
              const value = toNum(r?.electricityLocationKg);
              byMonth[monthNum] = (byMonth[monthNum] || 0) + value;
              if (value > 0) points += 1;
            });
            return { year: y, byMonth, points };
          })
        );
        setYearRows(results);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token, year, selectedFacility]);

  const model = useMemo(() => {
    const validYears = yearRows.filter((r) => r.points > 0);
    const hasEnoughYears = validYears.length >= 2;

    const seasonal = {};
    for (let m = 1; m <= 12; m += 1) {
      const vals = validYears.map((r) => toNum(r.byMonth[m])).filter((v) => v > 0);
      seasonal[m] = avg(vals);
    }

    const historyYears = yearRows.filter((r) => r.year !== year && r.points > 0);
    const baselineYears = historyYears.length >= 2 ? historyYears : validYears;
    const currentMonth = new Date().getMonth() + 1;
    const currentYearRow = yearRows.find((r) => r.year === year) || { byMonth: {} };
    const currentValue = toNum(currentYearRow.byMonth[currentMonth]);
    const expected = avg(
      baselineYears.map((r) => toNum(r.byMonth[currentMonth])).filter((v) => v > 0)
    );
    const deviationPct = expected > 0 ? ((currentValue - expected) / expected) * 100 : 0;
    const hasDeviationFlag = expected > 0 && deviationPct > 15;

    const q3Vals = [7, 8, 9].map((m) => seasonal[m]).filter((v) => v > 0);
    const otherVals = [1, 2, 3, 4, 5, 6, 10, 11, 12].map((m) => seasonal[m]).filter((v) => v > 0);
    const q3Avg = avg(q3Vals);
    const otherAvg = avg(otherVals);
    const preSeasonPct = otherAvg > 0 ? ((q3Avg - otherAvg) / otherAvg) * 100 : 0;

    let max = 0;
    yearRows.forEach((r) => {
      for (let m = 1; m <= 12; m += 1) max = Math.max(max, toNum(r.byMonth[m]));
    });

    return {
      validYears,
      hasEnoughYears,
      currentMonth,
      currentValue,
      expected,
      deviationPct,
      hasDeviationFlag,
      preSeasonPct,
      max,
    };
  }, [yearRows, year]);

  const cellBg = (value) => {
    const ratio = model.max > 0 ? Math.min(value / model.max, 1) : 0;
    const alpha = 0.08 + ratio * 0.5;
    return `rgba(37, 99, 235, ${alpha})`;
  };

  return (
    <Card style={{ border: "1px solid #E5E7EB" }}>
      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0, color: "#1B4D3E" }}>Seasonal Pattern Detection</h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6B7280" }}>
            Recurring monthly electricity pattern and anomaly checks.
          </p>
        </div>

        {!model.hasEnoughYears ? (
          <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 10, padding: 12, color: "#4B5563", fontSize: 13 }}>
            Need at least 2 years of monthly data to detect recurring seasonal patterns.
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1E3A8A", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}>
                Pre-season alert: Electricity typically {model.preSeasonPct >= 0 ? "+" : ""}{model.preSeasonPct.toFixed(0)}% in July-Sept.
              </div>
              {model.hasDeviationFlag && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}>
                  Deviation flag: {MONTHS[model.currentMonth - 1]} is {model.deviationPct.toFixed(1)}% above seasonal expectation ({(model.expected / 1000).toFixed(2)} tCO2e expected vs {(model.currentValue / 1000).toFixed(2)} tCO2e actual).
                </div>
              )}
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 820, borderCollapse: "separate", borderSpacing: 6 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", fontSize: 12, color: "#6B7280", fontWeight: 600 }}>Fiscal Year</th>
                    {MONTHS.map((m) => (
                      <th key={m} style={{ textAlign: "center", fontSize: 12, color: "#6B7280", fontWeight: 600 }}>{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {yearRows.map((row) => (
                    <tr key={row.year}>
                      <td style={{ fontWeight: 600, color: "#374151", fontSize: 12, whiteSpace: "nowrap" }}>{row.year}-{row.year + 1}</td>
                      {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => {
                        const v = toNum(row.byMonth[m]);
                        return (
                          <td
                            key={`${row.year}-${m}`}
                            title={`${MONTHS[m - 1]}: ${(v / 1000).toFixed(2)} tCO2e`}
                            style={{
                              textAlign: "center",
                              fontSize: 11,
                              color: "#0F172A",
                              padding: "8px 6px",
                              borderRadius: 8,
                              background: cellBg(v),
                              border: "1px solid #E5E7EB",
                            }}
                          >
                            {(v / 1000).toFixed(1)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: "#6B7280" }}>
              Heatmap values shown as tCO2e (location-based electricity).
            </div>
          </>
        )}

        {loading && <div style={{ marginTop: 8, fontSize: 12, color: "#6B7280" }}>Loading seasonal data...</div>}
      </div>
    </Card>
  );
}

