from fastapi import APIRouter, HTTPException, Depends
from app.middleware.auth import get_current_user
from app.utils.firebase import get_db
from datetime import datetime
import openai
import os
import json

router = APIRouter(tags=["Reports"])

# ---------------------------------------------------------------------------
# Regional financial constants
# ---------------------------------------------------------------------------

REGIONAL_FINANCIALS = {
    "dubai":     {"electricity_usd_per_kwh": 0.082, "carbon_usd_per_tco2e": 25, "currency": "USD"},
    "riyadh":    {"electricity_usd_per_kwh": 0.048, "carbon_usd_per_tco2e": 25, "currency": "USD"},
    "singapore": {"electricity_usd_per_kwh": 0.178, "carbon_usd_per_tco2e": 35, "currency": "USD"},
}
DEFAULT_FINANCIALS = {"electricity_usd_per_kwh": 0.10, "carbon_usd_per_tco2e": 25, "currency": "USD"}

# Rough capex estimates per recommendation category (USD)
CAPEX_ESTIMATES = {
    "Fleet & Transport":      150000,
    "Renewable Energy":        80000,
    "Energy Efficiency":       20000,
    "Refrigerant Management":   5000,
    "Stationary Combustion":   40000,
    "Heating & Cooling":       30000,
    "Fugitive Emissions":       8000,
}

# Grid emission factors by city (kg CO2e / kWh) — mirrors calculator.py
GRID_FACTORS = {
    "dubai":     0.4,
    "riyadh":    0.711,
    "singapore": 0.4168,
}

# Industry emission intensity benchmarks (tCO2e per employee per year)
INDUSTRY_BENCHMARKS = {
    "manufacturing":    12.0,
    "logistics":        18.0,
    "retail":            3.5,
    "hospitality":       5.0,
    "finance":           1.5,
    "technology":        2.0,
    "healthcare":        4.0,
    "construction":     15.0,
    "oil & gas":        45.0,
    "general industry":  8.0,
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_openai_client():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    return openai.OpenAI(api_key=api_key)


def get_company_id(uid: str) -> tuple[str, dict]:
    db = get_db()
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found.")
    company_id = user_doc.to_dict().get("companyId")
    if not company_id:
        raise HTTPException(status_code=404, detail="No company linked to this user.")
    company_doc = db.collection("companies").document(company_id).get()
    if not company_doc.exists:
        raise HTTPException(status_code=404, detail="Company not found.")
    return company_id, company_doc.to_dict()


def fetch_scope_docs(company_id: str, scope: str, year: int, month: str | None) -> list[dict]:
    db = get_db()
    docs = db.collection("emissionData").document(company_id).collection(scope).stream()
    results = []
    for doc in docs:
        d = doc.to_dict()
        if month:
            if d.get("month") == month:
                results.append(d)
        else:
            if d.get("year") == year:
                results.append(d)
    return results


def aggregate_scope1(docs: list[dict]) -> dict:
    cats = {"mobile": 0.0, "stationary": 0.0, "refrigerants": 0.0, "fugitive": 0.0}
    for doc in docs:
        res = doc.get("results", {})
        for cat in cats:
            cats[cat] += (res.get(cat) or {}).get("totalKgCO2e", 0)
    cats["total"] = sum(cats.values())
    return cats


def aggregate_scope2(docs: list[dict]) -> dict:
    agg = {
        "electricity_location": 0.0,
        "electricity_market":   0.0,
        "heating":              0.0,
        "renewables":           0.0,
    }
    for doc in docs:
        res  = doc.get("results", {})
        elec = res.get("electricity") or {}
        agg["electricity_location"] += elec.get("locationBasedKgCO2e", 0)
        agg["electricity_market"]   += elec.get("marketBasedKgCO2e", 0)
        agg["heating"]              += (res.get("heating") or {}).get("totalKgCO2e", 0)
        agg["renewables"]           += (res.get("renewables") or {}).get("totalKgCO2e", 0)
    agg["total_location"] = agg["electricity_location"] + agg["heating"]
    agg["total_market"]   = agg["electricity_market"]   + agg["heating"]
    return agg


def fetch_historical_totals(company_id: str, base_year: int, current_year: int) -> list[dict]:
    history = []
    for yr in range(base_year, current_year + 1):
        s1 = aggregate_scope1(fetch_scope_docs(company_id, "scope1", yr, None))
        s2 = aggregate_scope2(fetch_scope_docs(company_id, "scope2", yr, None))
        if s1["total"] > 0 or s2["total_location"] > 0:
            history.append({
                "year":              yr,
                "scope1_kg":         round(s1["total"], 2),
                "scope2_location_kg": round(s2["total_location"], 2),
                "total_kg":          round(s1["total"] + s2["total_location"], 2),
            })
    return history


def build_reduction_milestones(base_total_kg: float, base_year: int) -> list[dict]:
    milestones      = []
    target_2030_kg  = base_total_kg * 0.58   # −42%
    target_2050_kg  = base_total_kg * 0.10   # −90%
    years_to_2030   = max(2030 - base_year, 1)

    for i, yr in enumerate(range(base_year, 2031)):
        frac   = i / years_to_2030
        target = base_total_kg + frac * (target_2030_kg - base_total_kg)
        milestones.append({"year": yr, "target_kg": round(target, 2)})

    for i, yr in enumerate(range(2031, 2051)):
        frac   = (i + 1) / 20
        target = target_2030_kg + frac * (target_2050_kg - target_2030_kg)
        milestones.append({"year": yr, "target_kg": round(target, 2)})

    return milestones


def build_quarterly_steps(base_total_kg: float, current_year: int) -> list[dict]:
    target_2030_kg        = base_total_kg * 0.58
    years_remaining       = max(2030 - current_year, 1)
    total_quarters        = years_remaining * 4
    reduction_per_quarter = (base_total_kg - target_2030_kg) / total_quarters

    steps = []
    prev  = base_total_kg
    for q in range(total_quarters):
        yr      = current_year + q // 4
        quarter = (q % 4) + 1
        target  = prev - reduction_per_quarter
        steps.append({
            "period":                f"{yr} Q{quarter}",
            "target_kg":             round(target, 2),
            "reduction_from_prev_kg": round(reduction_per_quarter, 2),
        })
        prev = target
    return steps


# ---------------------------------------------------------------------------
# Financial Impact Calculator
# ---------------------------------------------------------------------------

def calculate_financial_impact(
    s1: dict,
    s2: dict,
    city: str,
    recommendations: list[dict],
) -> dict:
    """
    Compute carbon cost exposure, electricity cost, and per-recommendation
    financial metrics (annual savings, payback, ROI). All figures in USD.
    """
    fin         = REGIONAL_FINANCIALS.get(city, DEFAULT_FINANCIALS)
    elec_rate   = fin["electricity_usd_per_kwh"]
    carbon_rate = fin["carbon_usd_per_tco2e"]
    grid_factor = GRID_FACTORS.get(city, 0.45)

    total_t = (s1["total"] + s2["total_location"]) / 1000

    # Carbon cost exposure bands
    carbon_cost_low  = round(total_t * 15, 2)
    carbon_cost_mid  = round(total_t * carbon_rate, 2)
    carbon_cost_high = round(total_t * 50, 2)

    # Electricity cost (back-calculate kWh from kgCO2e and grid factor)
    electricity_kwh  = (s2["electricity_location"] / grid_factor) if grid_factor > 0 else 0
    electricity_cost = round(electricity_kwh * elec_rate, 2)

    # Per-recommendation financials
    enriched   = []
    total_save = 0.0
    total_capex = 0.0

    for rec in recommendations:
        reduction_t  = float(rec.get("estimated_reduction_tco2e", 0))
        category     = rec.get("category", "Energy Efficiency")
        capex        = CAPEX_ESTIMATES.get(category, 20000)
        carbon_save  = round(reduction_t * carbon_rate, 2)

        # Energy cost saving only for electricity-related categories
        energy_save = 0.0
        if category in ("Renewable Energy", "Energy Efficiency"):
            kwh_saved   = (reduction_t * 1000) / grid_factor if grid_factor > 0 else 0
            energy_save = round(kwh_saved * elec_rate, 2)

        annual_save  = round(carbon_save + energy_save, 2)
        payback_yrs  = round(capex / annual_save, 1) if annual_save > 0 else None
        roi_3yr      = round(((annual_save * 3  - capex) / capex) * 100, 1) if capex > 0 else None
        roi_5yr      = round(((annual_save * 5  - capex) / capex) * 100, 1) if capex > 0 else None

        total_save  += annual_save
        total_capex += capex

        enriched.append({
            **rec,
            "financial": {
                "estimated_capex_usd": capex,
                "annual_saving_usd":   annual_save,
                "carbon_saving_usd":   carbon_save,
                "energy_saving_usd":   energy_save,
                "payback_years":       payback_yrs,
                "roi_3yr_pct":         roi_3yr,
                "roi_5yr_pct":         roi_5yr,
                "currency":            fin["currency"],
            },
        })

    # Sort by annual saving descending (CFO view)
    enriched.sort(key=lambda r: r["financial"]["annual_saving_usd"], reverse=True)

    return {
        "carbon_cost_exposure": {
            "low_usd":  carbon_cost_low,
            "mid_usd":  carbon_cost_mid,
            "high_usd": carbon_cost_high,
            "note":     f"Based on {city.title()} regional rates. Low=$15, Mid=${carbon_rate}, High=$50 per tCO₂e.",
        },
        "electricity_cost": {
            "estimated_kwh":   round(electricity_kwh, 0),
            "annual_cost_usd": electricity_cost,
            "tariff_used":     elec_rate,
            "tariff_source":   f"{city.title()} commercial average",
        },
        "total_potential_annual_savings_usd": round(total_save, 2),
        "total_estimated_capex_usd":          round(total_capex, 2),
        "portfolio_payback_years":            round(total_capex / total_save, 1) if total_save > 0 else None,
        "recommendations_with_financials":    enriched,
        "currency":                           fin["currency"],
        "disclaimer": (
            "Financial estimates use regional averages. "
            "Update electricity tariff and carbon price in Settings for company-specific figures."
        ),
    }


# ---------------------------------------------------------------------------
# Carbon Score Calculator
# ---------------------------------------------------------------------------

def calculate_carbon_score(
    s1: dict,
    s2: dict,
    history: list[dict],
    base_total_kg: float,
    current_year: int,
    industry: str,
    company_data: dict,
    has_target: bool,
) -> dict:
    """
    Score 0–100 across two dimensions:
      1. Intensity Score  — tCO2e/employee vs industry benchmark
      2. Trajectory Score — year-over-year % change

    Penalty and bonus modifiers applied on top.
    """
    total_kg = s1["total"] + s2["total_location"]
    total_t  = total_kg / 1000

    # Employee count from company profile
    employees = (
        (company_data.get("basicInfo") or {}).get("employees") or
        (company_data.get("basicInfo") or {}).get("employeeCount") or
        50
    )
    try:
        employees = max(int(employees), 1)
    except (ValueError, TypeError):
        employees = 50

    # ── Dimension 1: Intensity Score ─────────────────────────────────────
    industry_key     = industry.lower().strip()
    benchmark        = INDUSTRY_BENCHMARKS.get(industry_key, INDUSTRY_BENCHMARKS["general industry"])
    actual_per_emp   = total_t / employees
    intensity_ratio  = actual_per_emp / benchmark if benchmark > 0 else 1.0
    # 100 at ≤50% of benchmark, 0 at ≥200% of benchmark
    intensity_score  = max(0.0, min(100.0, (1.0 - (intensity_ratio - 0.5)) * 100))

    # ── Dimension 2: Trajectory Score ────────────────────────────────────
    trajectory_score = 50.0   # neutral default
    yoy_change_pct   = None

    if len(history) >= 2:
        prev = history[-2]["total_kg"]
        curr = history[-1]["total_kg"]
        if prev > 0:
            yoy_change_pct   = round((curr - prev) / prev * 100, 2)
            trajectory_score = max(0.0, min(100.0, 50.0 - yoy_change_pct * 2.5))
    elif len(history) == 1 and base_total_kg > 0:
        curr = history[0]["total_kg"]
        yoy_change_pct   = round((curr - base_total_kg) / base_total_kg * 100, 2)
        trajectory_score = max(0.0, min(100.0, 50.0 - yoy_change_pct * 2.5))

    base_score = round(intensity_score * 0.5 + trajectory_score * 0.5, 1)

    # ── Penalties ─────────────────────────────────────────────────────────
    penalties = []
    if not has_target:
        penalties.append({"reason": "No emission reduction target set", "points": -10})
    if yoy_change_pct is not None and yoy_change_pct > 0:
        penalties.append({"reason": "Emissions increased year-over-year", "points": -15})
    s1_safe = s1["total"] or 1
    if s1["refrigerants"] / s1_safe > 0.05:
        penalties.append({"reason": "Refrigerant leakage exceeds 5% of Scope 1", "points": -10})
    if s1["total"] == 0 or s2["total_location"] == 0:
        penalties.append({"reason": "Missing data for one or more scopes", "points": -5})

    # ── Bonuses ───────────────────────────────────────────────────────────
    bonuses = []
    if s2["electricity_location"] > 0 and s2["electricity_market"] < s2["electricity_location"] * 0.8:
        bonuses.append({"reason": "Renewable certificates or green tariff in use", "points": 10})
    if has_target:
        bonuses.append({"reason": "Emission reduction target set", "points": 10})
    if len(history) >= 3:
        bonuses.append({"reason": "3+ years of consistent emission data", "points": 5})

    total_penalty = sum(p["points"] for p in penalties)
    total_bonus   = sum(b["points"] for b in bonuses)
    final_score   = max(0, min(100, round(base_score + total_penalty + total_bonus, 1)))

    # ── Zone ──────────────────────────────────────────────────────────────
    if final_score >= 80:
        zone, color, emoji = "Climate Leader",  "#22c55e", "🟢"
        description = "Exceptional performance. Your intensity and trajectory place you among sector leaders."
    elif final_score >= 60:
        zone, color, emoji = "On Track",        "#eab308", "🟡"
        description = "Good progress. Trending in the right direction with clear opportunities to accelerate."
    elif final_score >= 40:
        zone, color, emoji = "Needs Attention", "#f97316", "🟠"
        description = "Moderate risk. Emissions above sector norms or trending upward. Immediate action recommended."
    elif final_score >= 20:
        zone, color, emoji = "High Risk",       "#ef4444", "🔴"
        description = "Significant exposure. Urgent need for a structured reduction programme."
    else:
        zone, color, emoji = "Critical",        "#7f1d1d", "⚫"
        description = "Critical level. Immediate action required. Regulatory and reputational risk is high."

    return {
        "score":             final_score,
        "zone":              zone,
        "zone_color":        color,
        "zone_emoji":        emoji,
        "zone_description":  description,
        "dimensions": {
            "intensity_score": {
                "score":                    round(intensity_score, 1),
                "actual_t_per_employee":    round(actual_per_emp, 3),
                "benchmark_t_per_employee": benchmark,
                "industry":                 industry,
                "employees_used":           employees,
            },
            "trajectory_score": {
                "score":         round(trajectory_score, 1),
                "yoy_change_pct": yoy_change_pct,
                "data_points":   len(history),
            },
        },
        "modifiers": {
            "penalties":    penalties,
            "bonuses":      bonuses,
            "net_modifier": total_bonus + total_penalty,
        },
        "score_breakdown": {
            "base_score":    base_score,
            "total_penalty": total_penalty,
            "total_bonus":   total_bonus,
            "final_score":   final_score,
        },
        # Five zone bands for gauge chart rendering
        "gauge_zones": [
            {"label": "Critical",        "min": 0,  "max": 20,  "color": "#7f1d1d"},
            {"label": "High Risk",       "min": 20, "max": 40,  "color": "#ef4444"},
            {"label": "Needs Attention", "min": 40, "max": 60,  "color": "#f97316"},
            {"label": "On Track",        "min": 60, "max": 80,  "color": "#eab308"},
            {"label": "Climate Leader",  "min": 80, "max": 100, "color": "#22c55e"},
        ],
    }


# ---------------------------------------------------------------------------
# OpenAI
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are an expert ESG consultant and sustainability analyst. "
    "You generate precise, data-grounded ESG reports for companies. "
    "Never hallucinate figures — use only the data provided in the user message. "
    "Always respond with valid JSON matching the schema requested. "
    "Do not include any text, markdown, or explanation outside the JSON object."
)


def call_openai(client: openai.OpenAI, user_prompt: str) -> dict:
    response = client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_prompt},
        ],
        temperature=0.4,
        max_tokens=3000,
    )
    raw = response.choices[0].message.content
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail=f"OpenAI returned invalid JSON: {raw[:300]}")


def build_source_recommendation(
    client: openai.OpenAI,
    *,
    source_name: str,
    source_share_pct: float,
    source_tco2e: float,
    month_label: str,
    industry: str,
    city: str,
) -> str:
    prompt = f"""
You are an experienced sustainability advisor.
Write ONE human, practical recommendation sentence for the largest current-month emission source.

Context:
- Industry: {industry}
- City/region: {city}
- Month: {month_label}
- Largest source: {source_name}
- Source emissions: {source_tco2e:.2f} tCO2e
- Source share of total monthly emissions: {source_share_pct:.1f}%

Rules:
1) Return JSON only: {{"recommendation":"..."}}
2) Recommendation must be one sentence, 16-30 words, clear and natural.
3) Mention the source category by name.
4) Must be action-oriented and realistic for operations teams.
5) Do not use vague phrases like "consider sustainability initiatives".
"""
    data = call_openai(client, prompt)
    recommendation = str((data or {}).get("recommendation", "")).strip()
    if not recommendation:
        raise HTTPException(status_code=500, detail="OpenAI returned empty recommendation.")
    return recommendation


def build_ai_content(
    client: openai.OpenAI,
    company_name: str,
    industry: str,
    s1: dict,
    s2: dict,
    duration_label: str,
    history: list[dict],
    milestones: list[dict],
    base_total_kg: float,
    base_year: int,
    current_year: int,
    fin: dict,
    carbon_score: dict,
) -> dict:
    total_kg    = s1["total"] + s2["total_location"]
    s1_safe     = s1["total"] or 1
    s2_safe     = s2["total_location"] or 1
    combined    = total_kg or 1
    elec_rate   = fin["electricity_usd_per_kwh"]
    carbon_rate = fin["carbon_usd_per_tco2e"]
    city        = fin.get("city", "dubai")
    grid_factor = GRID_FACTORS.get(city, 0.45)
    elec_kwh    = (s2["electricity_location"] / grid_factor) if grid_factor > 0 else 0
    elec_cost   = round(elec_kwh * elec_rate, 0)

    def t(kg): return round(kg / 1000, 3)

    scope1_profile = {
        "mobile_combustion":     {"tco2e": t(s1["mobile"]),       "pct_of_scope1": round(s1["mobile"]      / s1_safe * 100, 1), "pct_of_total": round(s1["mobile"]      / combined * 100, 1)},
        "stationary_combustion": {"tco2e": t(s1["stationary"]),   "pct_of_scope1": round(s1["stationary"]  / s1_safe * 100, 1), "pct_of_total": round(s1["stationary"]  / combined * 100, 1)},
        "refrigerant_leakage":   {"tco2e": t(s1["refrigerants"]), "pct_of_scope1": round(s1["refrigerants"]/ s1_safe * 100, 1), "pct_of_total": round(s1["refrigerants"]/ combined * 100, 1)},
        "fugitive_emissions":    {"tco2e": t(s1["fugitive"]),     "pct_of_scope1": round(s1["fugitive"]    / s1_safe * 100, 1), "pct_of_total": round(s1["fugitive"]    / combined * 100, 1)},
    }
    scope2_profile = {
        "electricity_location_based": {"tco2e": t(s2["electricity_location"]), "pct_of_scope2": round(s2["electricity_location"] / s2_safe * 100, 1), "estimated_annual_cost_usd": elec_cost},
        "electricity_market_based":   {"tco2e": t(s2["electricity_market"]),   "pct_of_scope2": round(s2["electricity_market"]   / s2_safe * 100, 1)},
        "heating_and_cooling":        {"tco2e": t(s2["heating"]),              "pct_of_scope2": round(s2["heating"]              / s2_safe * 100, 1)},
    }

    annual_reduction_needed = t((total_kg - base_total_kg * 0.58) / max(2030 - current_year, 1))

    prompt = f"""
You are a senior ESG analyst generating a data-driven emissions report.
Ground every statement in the figures below. Do not reference specific companies by name.

=== COMPANY CONTEXT ===
Company: {company_name}
Industry: {industry}
Reporting period: {duration_label}
Carbon Score: {carbon_score["score"]}/100 — Zone: {carbon_score["zone"]}

=== EMISSION PROFILE ===
SCOPE 1 — DIRECT: {t(s1["total"])} tCO2e ({round(s1["total"]/combined*100,1)}% of total)
{json.dumps(scope1_profile, indent=2)}

SCOPE 2 — INDIRECT: {t(s2["total_location"])} tCO2e ({round(s2["total_location"]/combined*100,1)}% of total)
{json.dumps(scope2_profile, indent=2)}

COMBINED TOTAL: {t(total_kg)} tCO2e
ELECTRICITY ESTIMATED ANNUAL COST: ${elec_cost:,.0f} at ${elec_rate}/kWh
CARBON COST EXPOSURE: ${round(t(total_kg)*carbon_rate):,}/year at ${carbon_rate}/tCO2e

=== RECOMMENDATION RULES ===
1. Prioritise categories >10% of total. Skip categories <2%.
2. Mobile (if >10%): EV fleet 40-70%, route optimisation 10-15%, eco-driving 5-10%.
3. Stationary (if >10%): boiler upgrade 15-25%, heat pump 40-70%, fuel switch 20-60%.
4. Refrigerants (if >5%): leak detection 40-60%, low-GWP switch 60-90%.
5. Electricity (if >10%): renewable PPA 80-100% market-based, solar 30-80%, efficiency 10-30%.
6. Heating (if >5%): insulation 10-25%, heat recovery 15-30%.
7. estimated_reduction_tco2e = fraction of actual category tco2e, not a random number.
8. Rank by estimated_reduction_tco2e DESCENDING.
9. Effort: Low=<3 months minimal capex; Medium=3-12 months moderate capex; High=>12 months major capex.

=== OUTPUT FORMAT ===
Single valid JSON object only.

{{
  "executive_summary": "3-4 sentences. State combined total in tCO2e, top 1-2 sources by name and %, and most urgent action. Reference carbon score zone ({carbon_score['zone']}).",

  "scope1_summary": "2-3 sentences. Largest Scope 1 category, its tCO2e and % of Scope 1. Operational implication for {industry}.",

  "scope2_summary": "2-3 sentences. Compare location vs market-based electricity. Note the estimated ${elec_cost:,.0f} annual electricity cost and what action could reduce it.",

  "carbon_score_narrative": "1-2 sentences. What does {carbon_score['score']}/100 in the {carbon_score['zone']} zone mean for this company, and what single action would most improve the score.",

  "financial_summary": "2-3 sentences. Summarise carbon cost exposure, total saving potential from recommendations, and portfolio payback narrative.",

  "recommendations": [
    {{
      "title": "Action title max 7 words",
      "category": "Fleet & Transport | Energy Efficiency | Renewable Energy | Refrigerant Management | Stationary Combustion | Heating & Cooling | Fugitive Emissions",
      "description": "2-3 sentences: what to do, why it applies, expected outcome.",
      "estimated_reduction_tco2e": 0.0,
      "reduction_percentage_of_category": 0.0,
      "effort": "Low | Medium | High",
      "implementation_timeline": "3-6 months | 6-12 months | 1-2 years | 2-3 years",
      "why_this_company": "One sentence referencing their specific emission figure or percentage."
    }}
  ],

  "target_narrative": "2-3 sentences. Current total {t(total_kg)} tCO2e. 2030 SBTi target {t(base_total_kg * 0.58)} tCO2e (-42% from base year {base_year}). Annual reduction needed: {annual_reduction_needed} tCO2e/year."
}}
"""
    return call_openai(client, prompt)


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/generate")
async def generate_report(
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a full ESG report.

    Request body:
    {
        "year": 2026,
        "month": "2026-03",   // optional
        "base_year": 2024
    }
    """
    uid = current_user.get("uid")

    try:
        company_id, company_data = get_company_id(uid)
        client = get_openai_client()

        year      = body.get("year", datetime.utcnow().year)
        month     = body.get("month")
        base_year = body.get("base_year", year - 1)

        company_name = (company_data.get("basicInfo") or {}).get("name", "the company")
        industry     = (company_data.get("basicInfo") or {}).get("industry", "General Industry")

        # Resolve primary city for regional financial constants
        locations = company_data.get("locations", [])
        primary   = next((l for l in locations if l.get("isPrimary")), locations[0] if locations else {})
        city      = (primary.get("city") or "dubai").lower()
        fin       = {**REGIONAL_FINANCIALS.get(city, DEFAULT_FINANCIALS), "city": city}

        # ── Fetch & aggregate ─────────────────────────────────────────────
        s1 = aggregate_scope1(fetch_scope_docs(company_id, "scope1", year, month))
        s2 = aggregate_scope2(fetch_scope_docs(company_id, "scope2", year, month))

        if s1["total"] == 0 and s2["total_location"] == 0:
            raise HTTPException(
                status_code=404,
                detail="No emission data found for the selected period. Please submit Scope 1 and Scope 2 data first."
            )

        # ── Historical trend ──────────────────────────────────────────────
        history = fetch_historical_totals(company_id, base_year, year)

        # ── SBTi baseline ─────────────────────────────────────────────────
        base_s1       = aggregate_scope1(fetch_scope_docs(company_id, "scope1", base_year, None))
        base_s2       = aggregate_scope2(fetch_scope_docs(company_id, "scope2", base_year, None))
        base_total_kg = base_s1["total"] + base_s2["total_location"] or s1["total"] + s2["total_location"]

        milestones      = build_reduction_milestones(base_total_kg, base_year)
        quarterly_steps = build_quarterly_steps(base_total_kg, year)
        duration_label  = f"Month: {month}" if month else f"Annual: {year}"

        # ── Carbon Score (computed first — feeds into AI prompt) ──────────
        has_target   = bool((company_data.get("targets") or {}).get("reductionPct"))
        carbon_score = calculate_carbon_score(
            s1, s2, history, base_total_kg, year,
            industry, company_data, has_target
        )

        # ── OpenAI ────────────────────────────────────────────────────────
        ai = build_ai_content(
            client, company_name, industry, s1, s2,
            duration_label, history, milestones,
            base_total_kg, base_year, year,
            fin, carbon_score,
        )

        # ── Financial impact (enriches AI recommendations) ────────────────
        raw_recs      = ai.get("recommendations", [])
        financial     = calculate_financial_impact(s1, s2, city, raw_recs)
        enriched_recs = financial.pop("recommendations_with_financials", raw_recs)

        total_kg = s1["total"] + s2["total_location"]
        def t(kg): return round(kg / 1000, 4)

        trend_milestone_years = {2025, 2026, 2027, 2028, 2029, 2030, 2035, 2040, 2045, 2050}

        # ── Assemble ──────────────────────────────────────────────────────
        report = {
            "meta": {
                "company_name":   company_name,
                "industry":       industry,
                "city":           city,
                "year":           year,
                "month":          month,
                "base_year":      base_year,
                "generated_at":   datetime.utcnow().isoformat(),
                "duration_label": duration_label,
            },

            # AI narratives
            "executive_summary":      ai.get("executive_summary", ""),
            "scope1_summary":         ai.get("scope1_summary", ""),
            "scope2_summary":         ai.get("scope2_summary", ""),
            "target_narrative":       ai.get("target_narrative", ""),
            "financial_summary":      ai.get("financial_summary", ""),
            "carbon_score_narrative": ai.get("carbon_score_narrative", ""),

            # Recommendations enriched with financial metrics
            "recommendations": enriched_recs,

            # Emission breakdown
            "breakdown": {
                "scope1": {
                    "total_kg": round(s1["total"], 2),
                    "total_t":  t(s1["total"]),
                    "categories": {
                        "Mobile Combustion":     {"kg": round(s1["mobile"], 2),       "t": t(s1["mobile"])},
                        "Stationary Combustion": {"kg": round(s1["stationary"], 2),   "t": t(s1["stationary"])},
                        "Refrigerant Leakage":   {"kg": round(s1["refrigerants"], 2), "t": t(s1["refrigerants"])},
                        "Fugitive Emissions":    {"kg": round(s1["fugitive"], 2),     "t": t(s1["fugitive"])},
                    },
                },
                "scope2": {
                    "total_location_kg": round(s2["total_location"], 2),
                    "total_location_t":  t(s2["total_location"]),
                    "total_market_kg":   round(s2["total_market"], 2),
                    "total_market_t":    t(s2["total_market"]),
                    "categories": {
                        "Electricity (Location-based)": {"kg": round(s2["electricity_location"], 2), "t": t(s2["electricity_location"])},
                        "Electricity (Market-based)":   {"kg": round(s2["electricity_market"], 2),   "t": t(s2["electricity_market"])},
                        "Heating & Cooling":            {"kg": round(s2["heating"], 2),              "t": t(s2["heating"])},
                    },
                },
                "combined_total_kg": round(total_kg, 2),
                "combined_total_t":  t(total_kg),
            },

            # Carbon Score
            "carbon_score": carbon_score,

            # Financial Impact Dashboard
            "financial": financial,

            # Chart datasets
            "charts": {
                "scope_share_pie": [
                    {"name": "Scope 1 — Direct",   "value": t(s1["total"]),          "unit": "tCO2e"},
                    {"name": "Scope 2 — Indirect", "value": t(s2["total_location"]), "unit": "tCO2e"},
                ],
                "category_bar": [
                    {"category": "Mobile Combustion",     "scope": "Scope 1", "tCO2e": t(s1["mobile"])},
                    {"category": "Stationary Combustion", "scope": "Scope 1", "tCO2e": t(s1["stationary"])},
                    {"category": "Refrigerant Leakage",   "scope": "Scope 1", "tCO2e": t(s1["refrigerants"])},
                    {"category": "Fugitive Emissions",    "scope": "Scope 1", "tCO2e": t(s1["fugitive"])},
                    {"category": "Electricity",           "scope": "Scope 2", "tCO2e": t(s2["electricity_location"])},
                    {"category": "Heating & Cooling",     "scope": "Scope 2", "tCO2e": t(s2["heating"])},
                ],
                # Savings vs capex bar — for financial dashboard chart
                "savings_bar": [
                    {
                        "title":      r.get("title", ""),
                        "saving_usd": r.get("financial", {}).get("annual_saving_usd", 0),
                        "capex_usd":  r.get("financial", {}).get("estimated_capex_usd", 0),
                        "payback":    r.get("financial", {}).get("payback_years"),
                    }
                    for r in enriched_recs
                ],
                "trend_line": [
                    *[
                        {
                            "year":         h["year"],
                            "actual_tCO2e": t(h["total_kg"]),
                            "scope1_tCO2e": t(h["scope1_kg"]),
                            "scope2_tCO2e": t(h["scope2_location_kg"]),
                            "target_tCO2e": next(
                                (t(m["target_kg"]) for m in milestones if m["year"] == h["year"]),
                                None
                            ),
                        }
                        for h in history
                    ],
                    *[
                        {
                            "year":         m["year"],
                            "actual_tCO2e": None,
                            "scope1_tCO2e": None,
                            "scope2_tCO2e": None,
                            "target_tCO2e": t(m["target_kg"]),
                        }
                        for m in milestones
                        if m["year"] > year and m["year"] in trend_milestone_years
                    ],
                ],
            },

            "targets": {
                "base_year":                      base_year,
                "base_total_t":                   t(base_total_kg),
                "current_total_t":                t(total_kg),
                "target_2030_t":                  t(base_total_kg * 0.58),
                "target_2050_t":                  t(base_total_kg * 0.10),
                "reduction_achieved_pct":         round((1 - total_kg / base_total_kg) * 100, 2) if base_total_kg > 0 else 0,
                "reduction_required_to_2030_pct": 42,
                "reduction_required_to_2050_pct": 90,
            },

            "milestones":      milestones,
            "quarterly_steps": quarterly_steps,
        }

        return report

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


@router.post("/source-recommendation")
async def generate_source_recommendation(
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate a one-line AI recommendation for dashboard top emission source card.
    """
    uid = current_user.get("uid")
    company_id, company_data = get_company_id(uid)
    _ = company_id

    source_name = str(body.get("source_name", "")).strip()
    month_label = str(body.get("month_label", "")).strip()
    source_share_pct = float(body.get("source_share_pct", 0) or 0)
    source_tco2e = float(body.get("source_tco2e", 0) or 0)

    if not source_name:
        raise HTTPException(status_code=400, detail="source_name is required.")
    if not month_label:
        raise HTTPException(status_code=400, detail="month_label is required.")

    basic = company_data.get("basicInfo") or {}
    industry = basic.get("industry") or "General Industry"
    locations = company_data.get("locations", [])
    primary = next((l for l in locations if l.get("isPrimary")), locations[0] if locations else {})
    city = (primary.get("city") or "global").lower()

    try:
        client = get_openai_client()
        recommendation = build_source_recommendation(
            client,
            source_name=source_name,
            source_share_pct=source_share_pct,
            source_tco2e=source_tco2e,
            month_label=month_label,
            industry=industry,
            city=city,
        )
        return {"recommendation": recommendation}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendation: {str(e)}")