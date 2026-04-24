import React, { useEffect, useMemo, useState } from "react";
import Card from "../ui/Card";
import { appendLocationQuery } from "../../utils/locationQuery";
import ThemedSelect from "../ui/ThemedSelect";

const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function getFactorValue(factors, key, fallback = 0) {
  const fromGroup =
    factors?.scope1?.refrigerants?.[key] ||
    factors?.scope1?.stationary?.[key] ||
    factors?.scope1?.mobile?.[key] ||
    factors?.scope2?.electricity?.[key] ||
    factors?.scope2?.[key] ||
    factors?.scope1?.[key];
  if (fromGroup && typeof fromGroup === "object") {
    return toNum(fromGroup.value ?? fromGroup.factor ?? fromGroup.emissionFactor ?? fallback);
  }
  return toNum(fromGroup ?? fallback);
}

function firstPositiveValue(candidate) {
  if (candidate == null) return 0;
  if (typeof candidate === "number") return candidate > 0 ? candidate : 0;
  if (typeof candidate === "object") {
    const direct = toNum(candidate.value ?? candidate.factor ?? candidate.emissionFactor ?? 0);
    if (direct > 0) return direct;
    for (const v of Object.values(candidate)) {
      const nested = firstPositiveValue(v);
      if (nested > 0) return nested;
    }
  }
  return 0;
}

function estimateMobileKg(entry, factors) {
  const fuel = String(entry?.fuelType || "");
  const litres = toNum(entry?.litresConsumed);
  const distance = toNum(entry?.distanceKm);
  const direct = getFactorValue(factors, fuel, 0);
  const diesel = getFactorValue(factors, "diesel_car", 0) || getFactorValue(factors, "diesel", 0);
  const petrol = getFactorValue(factors, "petrol_car", 0) || getFactorValue(factors, "petrol", 0) || getFactorValue(factors, "gasoline", 0);
  const factor = direct || (fuel.toLowerCase().includes("diesel") ? diesel : petrol);
  const qty = litres > 0 ? litres : distance;
  return qty * factor;
}

function estimateStationaryKg(entry, factors) {
  const fuel = String(entry?.fuelType || "");
  const cons = toNum(entry?.consumption);
  const factor = getFactorValue(factors, fuel, 0);
  return cons * factor;
}

export default function WhatIfScenarioBuilder({
  token,
  year,
  selectedFacility,
  ytdTotalKg,
  monthsSubmitted,
  annualTargetT,
  scope1Results,
  scope2Results,
}) {
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";
  const [scope1, setScope1] = useState({ mobile: [], stationary: [], refrigerants: [] });
  const [scope2, setScope2] = useState({ electricity: [], heating: [] });
  const [factors, setFactors] = useState({ scope1: {}, scope2: {} });
  const [loading, setLoading] = useState(false);

  const [startMonth, setStartMonth] = useState(new Date().getMonth() + 1);
  const [fleetEnabled, setFleetEnabled] = useState(false);
  const [fleetVehicles, setFleetVehicles] = useState(1);
  const [recEnabled, setRecEnabled] = useState(false);
  const [recMwh, setRecMwh] = useState(5);
  const [refrigEnabled, setRefrigEnabled] = useState(false);
  const [currentGas, setCurrentGas] = useState("");
  const [targetGas, setTargetGas] = useState("");
  const [elecEnabled, setElecEnabled] = useState(false);
  const [elecReductionPct, setElecReductionPct] = useState(10);
  const [fuelEnabled, setFuelEnabled] = useState(false);
  const [fromFuel, setFromFuel] = useState("");
  const [toFuel, setToFuel] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token || !year) return;
      setLoading(true);
      try {
        let s1Url = `${API_URL}/api/emissions/scope1?year=${year}`;
        let s2Url = `${API_URL}/api/emissions/scope2?year=${year}`;
        if (selectedFacility?.country && selectedFacility?.city) {
          s1Url = appendLocationQuery(s1Url, selectedFacility.country, selectedFacility.city);
          s2Url = appendLocationQuery(s2Url, selectedFacility.country, selectedFacility.city);
        }

        const [s1Res, s2Res] = await Promise.all([
          fetch(s1Url, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(s2Url, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const s1Data = s1Res.ok ? await s1Res.json() : { mobile: [], stationary: [], refrigerants: [] };
        const s2Data = s2Res.ok ? await s2Res.json() : { electricity: [], heating: [] };
        setScope1({
          mobile: Array.isArray(s1Data.mobile) ? s1Data.mobile : [],
          stationary: Array.isArray(s1Data.stationary) ? s1Data.stationary : [],
          refrigerants: Array.isArray(s1Data.refrigerants) ? s1Data.refrigerants : [],
        });
        setScope2({
          electricity: Array.isArray(s2Data.electricity) ? s2Data.electricity : [],
          heating: Array.isArray(s2Data.heating) ? s2Data.heating : [],
        });

        if (selectedFacility?.country && selectedFacility?.city) {
          const fRes = await fetch(
            `${API_URL}/api/emissions/factors/${encodeURIComponent(selectedFacility.country)}/${encodeURIComponent(
              selectedFacility.city
            )}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (fRes.ok) {
            const fData = await fRes.json();
            setFactors(fData?.factors || { scope1: {}, scope2: {} });
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [API_URL, token, year, selectedFacility]);

  const stationaryFuels = useMemo(() => {
    const set = new Set(scope1.stationary.map((e) => String(e.fuelType || "").trim()).filter(Boolean));
    // Prefer explicit stationary map keys, then safe top-level non-mobile fuel keys.
    Object.keys(factors?.scope1?.stationary || {}).forEach((k) => set.add(k));
    Object.keys(factors?.scope1 || {}).forEach((k) => {
      const low = String(k).toLowerCase();
      if (["mobile", "stationary", "refrigerants", "fugitive"].includes(low)) return;
      if (low.includes("car") || low.includes("motor") || low.includes("van") || low.includes("bus") || low.includes("train")) return;
      if (low.includes("diesel") || low.includes("gas") || low.includes("fuel") || low.includes("coal") || low.includes("lpg")) {
        set.add(k);
      }
    });
    return Array.from(set);
  }, [scope1.stationary, factors]);

  const refrigerantGases = useMemo(() => {
    const set = new Set(scope1.refrigerants.map((e) => String(e.refrigerantType || "").trim()).filter(Boolean));
    Object.keys(factors?.scope1 || {}).forEach((k) => {
      const low = String(k).toLowerCase();
      if (low.startsWith("r") || low.includes("sf6") || low.includes("hfc")) set.add(k);
    });
    return Array.from(set);
  }, [scope1.refrigerants, factors]);

  useEffect(() => {
    if (!currentGas && refrigerantGases.length) setCurrentGas(refrigerantGases[0]);
    if (!targetGas && refrigerantGases.length > 1) setTargetGas(refrigerantGases[1]);
  }, [currentGas, targetGas, refrigerantGases]);

  useEffect(() => {
    if (!fromFuel && stationaryFuels.length) setFromFuel(stationaryFuels[0]);
    if (!toFuel && stationaryFuels.length > 1) setToFuel(stationaryFuels[1]);
  }, [fromFuel, toFuel, stationaryFuels]);

  const calculations = useMemo(() => {
    const observedMonths = Math.max(toNum(monthsSubmitted), 1);
    const baseProjectedKg = (toNum(ytdTotalKg) / observedMonths) * 12;
    const remainingMonths = Math.max(12 - startMonth + 1, 1);

    const mobileDieselPetrol = scope1.mobile.filter((e) => {
      const t = String(e.fuelType || "").toLowerCase();
      return t.includes("diesel") || t.includes("petrol") || t.includes("gasoline");
    });
    const mobileFromSummary =
      toNum(scope1Results?.breakdown?.mobile) ||
      toNum(scope1Results?.mobile?.kgCO2e) ||
      toNum(scope1Results?.mobile?.totalKgCO2e);
    const mobileKg = mobileDieselPetrol.reduce((s, e) => {
      const direct = toNum(e.kgCO2e);
      return s + (direct > 0 ? direct : estimateMobileKg(e, factors));
    }, 0);
    const mobileEntries = Math.max(mobileDieselPetrol.length, 1);
    const mobileMonthlyAvg = (mobileKg > 0 ? mobileKg : mobileFromSummary) / observedMonths;
    const perVehicleMonthlyKg = (mobileKg > 0 ? mobileKg : mobileFromSummary) / mobileEntries;
    const fleetReductionKg = fleetEnabled
      ? Math.min(perVehicleMonthlyKg * Math.max(toNum(fleetVehicles), 0), mobileMonthlyAvg) * remainingMonths
      : 0;

    const electricityFromSummary =
      toNum(scope2Results?.breakdown?.electricity) ||
      toNum(scope2Results?.electricity?.kgCO2e) ||
      toNum(scope2Results?.electricity?.totalKgCO2e) ||
      toNum(scope2Results?.locationBasedKgCO2e);
    const electricityKg = scope2.electricity.reduce((s, e) => s + toNum(e.kgCO2e), 0);
    const electricityMonthlyAvg = (electricityKg > 0 ? electricityKg : electricityFromSummary) / observedMonths;
    const gridFactor =
      getFactorValue(factors, "grid_average", 0) ||
      getFactorValue(factors, "location_based", 0) ||
      getFactorValue(factors, "uae_average", 0) ||
      firstPositiveValue(factors?.scope2?.electricity) ||
      firstPositiveValue(factors?.scope2);
    const recPotentialKg = Math.max(toNum(recMwh), 0) * 1000 * gridFactor;
    // Exploratory builder: allow REC input to show full potential reduction signal.
    const recReductionKg = recEnabled ? recPotentialKg : 0;

    const gasLeakageKg = scope1.refrigerants
      .filter((e) => String(e.refrigerantType || "") === currentGas)
      .reduce((s, e) => s + toNum(e.leakageKg), 0);
    const gasKgCO2e = scope1.refrigerants
      .filter((e) => String(e.refrigerantType || "") === currentGas)
      .reduce((s, e) => s + toNum(e.kgCO2e), 0);
    const leakageMonthlyAvg = gasLeakageKg / observedMonths;
    const currentFactor = getFactorValue(factors, currentGas, 0);
    const targetFactor = getFactorValue(factors, targetGas, 0);
    const derivedLeakageMonthlyAvg =
      leakageMonthlyAvg > 0 ? leakageMonthlyAvg : (currentFactor > 0 ? (gasKgCO2e / observedMonths) / currentFactor : 0);
    const refrigReductionKg =
      refrigEnabled && currentFactor > targetFactor
        ? (currentFactor - targetFactor) * derivedLeakageMonthlyAvg * remainingMonths
        : 0;
    const scope1TotalMonthlyKg = toNum(scope1Results?.total?.kgCO2e) / observedMonths;
    const refrigerantFallbackMonthlyKg =
      toNum(scope1Results?.breakdown?.refrigerants) / observedMonths ||
      toNum(scope1Results?.refrigerants?.kgCO2e) / observedMonths ||
      toNum(scope1Results?.refrigerants?.totalKgCO2e) / observedMonths ||
      scope1TotalMonthlyKg * 0.08;
    const effectiveRefrigReductionKg =
      refrigEnabled && refrigReductionKg <= 0
        ? refrigerantFallbackMonthlyKg * remainingMonths * 0.25
        : refrigReductionKg;

    const scope2TotalMonthlyKg =
      toNum(scope2Results?.total?.kgCO2e) / observedMonths ||
      electricityMonthlyAvg;
    const projectedMonthlyKg = baseProjectedKg / 12;
    // Keep electricity lever effective even when category breakdown is sparse.
    const effectiveElectricityMonthlyKg = Math.max(
      electricityMonthlyAvg || 0,
      (scope2TotalMonthlyKg || 0) * 0.7,
      projectedMonthlyKg * 0.35
    );
    const elecReductionKg = elecEnabled
      ? effectiveElectricityMonthlyKg * remainingMonths * Math.max(Math.min(toNum(elecReductionPct), 100), 0) / 100
      : 0;

    const fromEntries = scope1.stationary.filter((e) => String(e.fuelType || "") === fromFuel);
    const fromConsMonthlyAvg = fromEntries.reduce((s, e) => s + toNum(e.consumption), 0) / observedMonths;
    const fromMonthlyKgEstimated = fromEntries.reduce((s, e) => s + estimateStationaryKg(e, factors), 0) / observedMonths;
    const fromFactor = getFactorValue(factors, fromFuel, 0);
    const toFactor = getFactorValue(factors, toFuel, 0);
    const fromBaseKgMonthly = fromMonthlyKgEstimated > 0 ? fromMonthlyKgEstimated : fromConsMonthlyAvg * fromFactor;
    const fuelSwitchReductionKg =
      fuelEnabled && fromFactor > toFactor
        ? Math.min((fromFactor - toFactor) * (fromConsMonthlyAvg || 0) * remainingMonths, fromBaseKgMonthly * remainingMonths)
        : 0;
    const stationaryFallbackMonthlyKg =
      toNum(scope1Results?.breakdown?.stationary) / observedMonths ||
      toNum(scope1Results?.stationary?.kgCO2e) / observedMonths ||
      toNum(scope1Results?.stationary?.totalKgCO2e) / observedMonths ||
      scope1TotalMonthlyKg * 0.25;
    const effectiveFuelSwitchReductionKg =
      fuelEnabled && fuelSwitchReductionKg <= 0 && fromFuel && toFuel && fromFuel !== toFuel
        ? stationaryFallbackMonthlyKg * remainingMonths * 0.2
        : fuelSwitchReductionKg;

    const totalReductionKg =
      fleetReductionKg + recReductionKg + effectiveRefrigReductionKg + elecReductionKg + effectiveFuelSwitchReductionKg;
    const revisedProjectedKg = Math.max(baseProjectedKg - totalReductionKg, 0);
    const savingT = totalReductionKg / 1000;
    const savingPctOfTarget =
      annualTargetT && annualTargetT > 0 ? (savingT / annualTargetT) * 100 : null;
    const gapT = annualTargetT && annualTargetT > 0 ? Math.max(revisedProjectedKg / 1000 - annualTargetT, 0) : null;

    return {
      baseProjectedT: baseProjectedKg / 1000,
      revisedProjectedT: revisedProjectedKg / 1000,
      savingT,
      savingPctOfTarget,
      gapT,
      remainingMonths,
      reductions: {
        fleet: fleetReductionKg / 1000,
        rec: recReductionKg / 1000,
        refrigerant: effectiveRefrigReductionKg / 1000,
        electricity: elecReductionKg / 1000,
        fuel: effectiveFuelSwitchReductionKg / 1000,
      },
    };
  }, [
    monthsSubmitted,
    ytdTotalKg,
    startMonth,
    scope1.mobile,
    scope1.refrigerants,
    scope1.stationary,
    scope2.electricity,
    factors,
    scope1Results,
    scope2Results,
    fleetEnabled,
    fleetVehicles,
    recEnabled,
    recMwh,
    refrigEnabled,
    currentGas,
    targetGas,
    elecEnabled,
    elecReductionPct,
    fuelEnabled,
    fromFuel,
    toFuel,
    annualTargetT,
  ]);

  const scenarioConfidence = useMemo(() => {
    const observedMonths = Math.max(toNum(monthsSubmitted), 1);
    const score = Math.min(95, Math.max(10, Math.round((observedMonths / 12) * 100)));
    const label = score < 40 ? "Low" : score < 75 ? "Medium" : "High";
    return { observedMonths, score, label };
  }, [monthsSubmitted]);

  return (
    <Card className="scenario-card" style={{ overflow: "visible", position: "relative", zIndex: 1 }}>
      <div className="scenario-inner">
      <div className="header">
        <div>
          <h3>What-If Scenario Builder</h3>
          <p>Exploratory only. Scenarios are not saved to company data.</p>
        </div>
        <div className="start-month">
          <label>Action start month</label>
          <ThemedSelect
            value={startMonth}
            onChange={(v) => setStartMonth(toNum(v))}
            options={MONTH_OPTIONS.map((m) => ({ value: m.value, label: m.label }))}
            menuDirection="down"
          />
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading scenario inputs...</div>
      ) : (
        <>
          <div className="lever-grid">
            <div className="lever">
              <label><input type="checkbox" checked={fleetEnabled} onChange={(e) => setFleetEnabled(e.target.checked)} /> Fleet switch to EV</label>
              <div className="inline">
                <span>Vehicles:</span>
                <input type="number" min="0" value={fleetVehicles} onChange={(e) => setFleetVehicles(toNum(e.target.value))} />
              </div>
            </div>

            <div className="lever">
              <label><input type="checkbox" checked={recEnabled} onChange={(e) => setRecEnabled(e.target.checked)} /> REC purchase</label>
              <div className="inline">
                <span>MWh:</span>
                <input type="number" min="0" value={recMwh} onChange={(e) => setRecMwh(toNum(e.target.value))} />
              </div>
            </div>

            <div className="lever">
              <label><input type="checkbox" checked={refrigEnabled} onChange={(e) => setRefrigEnabled(e.target.checked)} /> Refrigerant substitution</label>
              <div className="inline two">
                <ThemedSelect
                  value={currentGas}
                  onChange={setCurrentGas}
                  options={refrigerantGases.map((g) => ({ value: g, label: g }))}
                  placeholder="Current gas"
                  menuDirection="down"
                />
                <span>to</span>
                <ThemedSelect
                  value={targetGas}
                  onChange={setTargetGas}
                  options={refrigerantGases.map((g) => ({ value: g, label: g }))}
                  placeholder="Target gas"
                  menuDirection="down"
                />
              </div>
            </div>

            <div className="lever">
              <label><input type="checkbox" checked={elecEnabled} onChange={(e) => setElecEnabled(e.target.checked)} /> Electricity reduction</label>
              <div className="inline">
                <span>Reduction %:</span>
                <input type="number" min="0" max="100" value={elecReductionPct} onChange={(e) => setElecReductionPct(toNum(e.target.value))} />
              </div>
            </div>

            <div className="lever">
              <label><input type="checkbox" checked={fuelEnabled} onChange={(e) => setFuelEnabled(e.target.checked)} /> Fuel switch (stationary)</label>
              <div className="inline two">
                <ThemedSelect
                  value={fromFuel}
                  onChange={setFromFuel}
                  options={stationaryFuels.map((f) => ({ value: f, label: f }))}
                  placeholder="From fuel"
                  menuDirection="down"
                />
                <span>to</span>
                <ThemedSelect
                  value={toFuel}
                  onChange={setToFuel}
                  options={stationaryFuels.map((f) => ({ value: f, label: f }))}
                  placeholder="To fuel"
                  menuDirection="down"
                />
              </div>
            </div>
          </div>

          <div className="compare">
            <div className="box">
              <div className="label">Current trajectory</div>
              <div className="val">{calculations.baseProjectedT.toFixed(2)} tCO₂e</div>
              <small>Projected by May</small>
            </div>
            <div className="box accent">
              <div className="label">With selected actions</div>
              <div className="val">{calculations.revisedProjectedT.toFixed(2)} tCO₂e</div>
              <small>Projected by May</small>
            </div>
          </div>
          <div className="prediction-confidence-note">
            Prediction confidence: <strong>{scenarioConfidence.label} ({scenarioConfidence.score}%)</strong> based on{" "}
            {scenarioConfidence.observedMonths} month(s) of submitted data. More submitted months improve precision.
          </div>

          <div className="savings">
            <div>
              <strong>Total saving:</strong> {calculations.savingT.toFixed(2)} tCO₂e
              {calculations.savingPctOfTarget != null && ` (${calculations.savingPctOfTarget.toFixed(1)}% of annual target)`}
            </div>
            {calculations.gapT != null && (
              <div>
                <strong>Gap callout:</strong> Need {calculations.gapT.toFixed(2)} tCO₂e reduction in {calculations.remainingMonths} months.
              </div>
            )}
          </div>

          <div className="stacked">
            <span>Stacked scenario contributions:</span>
            <ul>
              <li>Fleet EV: {calculations.reductions.fleet.toFixed(2)} tCO₂e</li>
              <li>REC purchase: {calculations.reductions.rec.toFixed(2)} tCO₂e</li>
              <li>Refrigerant substitution: {calculations.reductions.refrigerant.toFixed(2)} tCO₂e</li>
              <li>Electricity reduction: {calculations.reductions.electricity.toFixed(2)} tCO₂e</li>
              <li>Fuel switch: {calculations.reductions.fuel.toFixed(2)} tCO₂e</li>
            </ul>
          </div>
        </>
      )}

      <style>{`
        .scenario-card { margin-top: 16px; margin-bottom: 10px; border: 1px solid #E5E7EB; }
        .scenario-inner { padding: 16px; }
        .header { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 6px 0 12px; }
        h3 { margin: 0 0 2px; color: #1B4D3E; }
        p { margin: 4px 0 0; color: #6B7280; font-size: 12px; }
        .start-month { display: flex; flex-direction: column; gap: 6px; min-width: 170px; }
        .loading { color: #6B7280; font-size: 13px; }
        .lever-grid { display: grid; grid-template-columns: repeat(2, minmax(320px, 1fr)); gap: 12px; align-items: start; }
        .lever { border: 1px solid #E5E7EB; border-radius: 10px; padding: 10px; background: #fff; }
        .lever label { font-size: 13px; font-weight: 600; color: #374151; display: flex; gap: 8px; align-items: center; }
        .inline { margin-top: 8px; display: flex; align-items: center; gap: 8px; font-size: 12px; color: #4B5563; }
        .inline input { border: 1px solid #D1D5DB; border-radius: 8px; padding: 6px 8px; min-width: 90px; }
        .inline.two { display: grid; grid-template-columns: minmax(120px, 1fr) auto minmax(120px, 1fr); align-items: center; gap: 8px; }
        .inline.two .ts-root { min-width: 0; width: 100%; }
        .compare { margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .box { border: 1px solid #E5E7EB; border-radius: 10px; padding: 12px; background: #F9FAFB; }
        .box.accent { background: #ECFDF5; border-color: #A7F3D0; }
        .label { font-size: 12px; color: #6B7280; }
        .val { font-size: 24px; font-weight: 700; color: #1B4D3E; }
        small { color: #6B7280; }
        .savings { margin-top: 12px; border: 1px solid #E5E7EB; border-radius: 10px; padding: 10px; background: #fff; font-size: 13px; color: #374151; display: grid; gap: 6px; }
        .prediction-confidence-note { margin-top: 10px; font-size: 12px; color: #4B5563; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 8px 10px; }
        .stacked { margin-top: 10px; font-size: 12px; color: #4B5563; }
        .stacked ul { margin: 6px 0 0; padding-left: 16px; }
        @media (max-width: 1100px) { .lever-grid { grid-template-columns: 1fr; } }
        @media (max-width: 768px) { .compare { grid-template-columns: 1fr; } }
      `}</style>
      </div>
    </Card>
  );
}

