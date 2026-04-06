# backend/app/routes/predictions.py

from fastapi import APIRouter, HTTPException, Depends
from app.middleware.auth import get_current_user
from app.utils.firebase import get_db
from app.services.predictor import (
    get_confidence_tier,
    build_target_trajectory,
    project_year_end,
    analyse_on_track,
    compute_yoy_trend,
    project_multi_year,
    build_scenario_model,
    project_refrigerant_trend,
)
from datetime import datetime

router = APIRouter(tags=["Predictions"])


# ── Helpers (mirrors reports.py pattern) ──────────────────────────────────────

def get_company(uid: str) -> tuple[str, dict]:
    db = get_db()
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found.")
    company_id = user_doc.to_dict().get("companyId")
    if not company_id:
        raise HTTPException(status_code=404, detail="No company found.")
    company_doc = db.collection("companies").document(company_id).get()
    if not company_doc.exists:
        raise HTTPException(status_code=404, detail="Company not found.")
    return company_id, company_doc.to_dict()


def stream_scope_docs(company_id: str, scope: str) -> list[dict]:
    """Return ALL emission docs for a scope across all years."""
    db = get_db()
    return [
        doc.to_dict()
        for doc in db.collection("emissionData").document(company_id).collection(scope).stream()
    ]


def doc_total_kg(doc: dict) -> float:
    """Sum scope1 + scope2 total from a single emission doc."""
    res = doc.get("results", {})
    # Scope 1 doc
    if "totalKgCO2e" in res:
        return float(res["totalKgCO2e"])
    # Scope 2 doc
    return float(res.get("locationBasedKgCO2e", 0))


def build_monthly_series(s1_docs: list[dict], s2_docs: list[dict]) -> list[dict]:
    """
    Merge scope1 and scope2 monthly docs into a combined monthly total series.
    Returns [{ month: "2026-03", total_kg: 1234.5 }, ...] sorted ascending.
    """
    monthly: dict[str, float] = {}

    for doc in s1_docs:
        month = doc.get("month")
        if month:
            monthly[month] = monthly.get(month, 0) + doc_total_kg(doc)

    for doc in s2_docs:
        month = doc.get("month")
        if month:
            monthly[month] = monthly.get(month, 0) + doc_total_kg(doc)

    return sorted(
        [{"month": m, "total_kg": round(v, 2)} for m, v in monthly.items()],
        key=lambda x: x["month"],
    )


def build_annual_series(s1_docs: list[dict], s2_docs: list[dict]) -> list[dict]:
    """
    Merge scope1 and scope2 annual docs into a combined annual total series.
    Returns [{ year: 2025, total_kg: 14000.0, scope1_kg: 8000.0, scope2_kg: 6000.0 }, ...]
    sorted ascending.
    """
    annual_s1: dict[int, float] = {}
    annual_s2: dict[int, float] = {}
    annual_refrig: dict[int, float] = {}

    for doc in s1_docs:
        yr = doc.get("year")
        if yr:
            annual_s1[yr] = annual_s1.get(yr, 0) + doc_total_kg(doc)
            # Collect refrigerant leakage separately for leak trend
            refrig_kg = (doc.get("results", {}).get("refrigerants") or {}).get("totalKgCO2e", 0)
            annual_refrig[yr] = annual_refrig.get(yr, 0) + refrig_kg

    for doc in s2_docs:
        yr = doc.get("year")
        if yr:
            annual_s2[yr] = annual_s2.get(yr, 0) + doc_total_kg(doc)

    all_years = sorted(set(list(annual_s1.keys()) + list(annual_s2.keys())))
    result = []
    for yr in all_years:
        s1 = annual_s1.get(yr, 0)
        s2 = annual_s2.get(yr, 0)
        result.append({
            "year":     yr,
            "total_kg": round(s1 + s2, 2),
            "scope1_kg": round(s1, 2),
            "scope2_kg": round(s2, 2),
        })

    return result


def count_months_in_year(monthly_series: list[dict], year: int) -> int:
    return sum(1 for m in monthly_series if str(m["month"]).startswith(str(year)))


# ── Target save endpoint ───────────────────────────────────────────────────────

@router.put("/companies/targets")
async def save_targets(
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    """
    Save or update the company's emission reduction targets.
    Called by TargetSettingForm.jsx via companyStore.saveTargets().
    """
    db = get_db()
    uid = current_user.get("uid")
    company_id, _ = get_company(uid)

    # Merge targets into the company document
    db.collection("companies").document(company_id).set(
        {"targets": body}, merge=True
    )
    return {"message": "Targets saved.", "targets": body}


# ── Main predictions endpoint ──────────────────────────────────────────────────

@router.get("/predictions")
async def get_predictions(
    year: int = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Return all available predictions for the company based on their
    target settings and historical emission data.

    Query params:
      year  — the "current" reporting year to predict for (defaults to current calendar year)
    """
    uid = current_user.get("uid")
    current_year = year or datetime.utcnow().year

    try:
        company_id, company_data = get_company(uid)
        targets = company_data.get("targets") or {}

        # ── Target configuration ──────────────────────────────────────────
        base_year      = targets.get("baseYear", current_year)
        target_year    = targets.get("targetYear", 2030)
        reduction_pct  = targets.get("reductionPct", 42)
        scopes_covered = targets.get("scopesCovered", "scope1+2")
        interim        = targets.get("interimMilestones", [])
        has_target     = bool(targets.get("reductionPct"))

        # ── Fetch all emission data ───────────────────────────────────────
        s1_docs = stream_scope_docs(company_id, "scope1")
        s2_docs = stream_scope_docs(company_id, "scope2")

        monthly_series = build_monthly_series(s1_docs, s2_docs)
        annual_series  = build_annual_series(s1_docs, s2_docs)

        # ── Data availability ─────────────────────────────────────────────
        months_in_current_year = count_months_in_year(monthly_series, current_year)
        full_years             = len([a for a in annual_series if a["year"] < current_year])
        total_months           = len(monthly_series)

        confidence = get_confidence_tier(total_months, full_years)

        # ── Base year total (used as denominator for % calculations) ──────
        base_year_data = next((a for a in annual_series if a["year"] == base_year), None)
        base_total_kg  = base_year_data["total_kg"] if base_year_data else None

        # If no base year data yet, use first available year as proxy
        if base_total_kg is None and annual_series:
            base_total_kg = annual_series[0]["total_kg"]
            base_year     = annual_series[0]["year"]

        # Current year total from annual series (if complete) or monthly sum
        current_year_data = next((a for a in annual_series if a["year"] == current_year), None)
        current_total_kg  = current_year_data["total_kg"] if current_year_data else sum(
            m["total_kg"] for m in monthly_series if str(m["month"]).startswith(str(current_year))
        )

        target_kg = (base_total_kg * (1 - reduction_pct / 100)) if base_total_kg else None

        # ── Build each prediction ─────────────────────────────────────────
        predictions = {}

        # 1. Target trajectory — always available if target is set
        if has_target and base_total_kg:
            predictions["target_trajectory"] = {
                "title":       "Reduction Pathway",
                "description": f"Required annual trajectory to achieve {reduction_pct}% reduction by {target_year}.",
                "data":        build_target_trajectory(
                    base_total_kg, base_year, target_year,
                    reduction_pct, interim,
                ),
                "base_total_kg":  round(base_total_kg, 2),
                "target_total_kg": round(target_kg, 2) if target_kg else None,
            }

        # 2. Year-end projection — requires 3+ months in current year
        year_end = None
        if "year_end_projection" in confidence["available"] and months_in_current_year >= 3:
            current_year_months = [
                m for m in monthly_series if str(m["month"]).startswith(str(current_year))
            ]
            year_end = project_year_end(current_year_months, current_year)
            if year_end:
                predictions["year_end_projection"] = {
                    "title":       f"{current_year} Year-End Projection",
                    "description": (
                        f"Based on {year_end['months_submitted']} months of data, "
                        f"you are projected to emit {year_end['projected_annual_t']:.2f} tCO₂e this year."
                    ),
                    "data": year_end,
                }

        # 3. On-track analysis — requires trajectory + year-end projection
        if "on_track_analysis" in confidence["available"] and base_total_kg and has_target:
            trajectory_data = predictions.get("target_trajectory", {}).get("data", [])
            on_track = analyse_on_track(current_total_kg, current_year, trajectory_data, year_end)
            if on_track:
                predictions["on_track_analysis"] = {
                    "title":       "Target Progress",
                    "description": on_track["message"],
                    "data":        on_track,
                }

        # 4. YoY trend — requires 2+ full years
        yoy = None
        if "yoy_trend" in confidence["available"]:
            annual_for_trend = [
                {"year": a["year"], "total_kg": a["total_kg"]}
                for a in annual_series
            ]
            yoy = compute_yoy_trend(annual_for_trend)
            if yoy:
                direction_word = "falling" if yoy["direction"] == "decreasing" else "rising"
                predictions["yoy_trend"] = {
                    "title":       "Year-on-Year Trend",
                    "description": (
                        f"Your emissions are {direction_word} at "
                        f"{abs(yoy['avg_yoy_change_pct']):.1f}%/year on average "
                        f"({yoy['fit_quality']} fit, R²={yoy['r_squared']})."
                    ),
                    "data": yoy,
                }

        # 5. Multi-year projection — requires 2+ full years
        if "multi_year_projection" in confidence["available"] and base_total_kg:
            traj = predictions.get("target_trajectory", {}).get("data", [])
            annual_for_proj = [
                {"year": a["year"], "total_kg": a["total_kg"]}
                for a in annual_series
            ]
            proj = project_multi_year(annual_for_proj, target_year, traj)
            if proj:
                predictions["multi_year_projection"] = {
                    "title":       f"Emissions Forecast to {target_year}",
                    "description": (
                        f"Based on your {full_years}-year trend, emissions are projected "
                        f"to reach {proj['projections'][-1]['projected_t']:.2f} tCO₂e by {target_year} "
                        f"if current pace continues."
                    ),
                    "data": proj,
                }

        # 6. Scenario model — requires 3+ full years
        if "scenario_model" in confidence["available"] and base_total_kg and target_kg:
            annual_for_scenario = [
                {"year": a["year"], "total_kg": a["total_kg"]}
                for a in annual_series
            ]
            scenario = build_scenario_model(
                current_total_kg, current_year, target_year, target_kg, annual_for_scenario
            )
            if scenario:
                predictions["scenario_model"] = {
                    "title":       "Scenario Modelling",
                    "description": (
                        f"Business as usual projects {scenario['summary']['bau_end_kg']/1000:.2f} tCO₂e by {target_year} — "
                        f"{scenario['summary']['bau_gap_to_target']/1000:.2f} tCO₂e above your target. "
                        f"Full implementation of recommendations closes this gap."
                    ),
                    "data": scenario,
                }

        # 7. Refrigerant leak trend — always run if data exists
        refrig_annual = []
        for doc in s1_docs:
            yr     = doc.get("year")
            ref_kg = (doc.get("results", {}).get("refrigerants") or {}).get("totalKgCO2e", 0)
            if yr and ref_kg > 0:
                refrig_annual.append({"year": yr, "kg": ref_kg})

        if len(refrig_annual) >= 2:
            refrig_proj = project_refrigerant_trend(refrig_annual)
            if refrig_proj:
                predictions["refrigerant_trend"] = {
                    "title":       "Refrigerant Leakage Trend",
                    "description": refrig_proj.get("alert_message") or (
                        "Refrigerant leakage is stable. Continue scheduled maintenance."
                    ),
                    "data": refrig_proj,
                }

        # ── Assemble response ─────────────────────────────────────────────
        return {
            "meta": {
                "company_id":      company_id,
                "current_year":    current_year,
                "base_year":       base_year,
                "target_year":     target_year,
                "reduction_pct":   reduction_pct,
                "scopes_covered":  scopes_covered,
                "has_target":      has_target,
                "generated_at":    datetime.utcnow().isoformat(),
            },
            "data_availability": {
                "total_months":             total_months,
                "months_in_current_year":   months_in_current_year,
                "full_years_of_data":       full_years,
                "has_base_year_data":       base_year_data is not None,
                "current_total_kg":         round(current_total_kg, 2),
                "base_total_kg":            round(base_total_kg, 2) if base_total_kg else None,
                "target_total_kg":          round(target_kg, 2) if target_kg else None,
            },
            "confidence":  confidence,
            "predictions": predictions,

            # Full series for chart rendering
            "series": {
                "monthly": monthly_series,
                "annual":  annual_series,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Predictions failed: {str(e)}")
