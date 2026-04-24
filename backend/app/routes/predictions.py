# backend/app/routes/predictions.py

from fastapi import APIRouter, HTTPException, Depends, Response
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
import traceback
import sys

router = APIRouter(tags=["Predictions"])
FISCAL_YEAR_START_MONTH = 6  # June


# ── Helper functions for type safety ─────────────────────────────────────────

def safe_int(value, default=0):
    """Safely convert to integer."""
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def safe_float(value, default=0.0):
    """Safely convert to float."""
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def normalize_emission_doc(doc: dict) -> dict:
    """Normalize emission document to ensure correct data types."""
    normalized = doc.copy()
    
    # Ensure year is integer
    if "year" in normalized:
        normalized["year"] = safe_int(normalized["year"])
    
    # Ensure month is string in YYYY-MM format
    if "month" in normalized and normalized["month"]:
        month = str(normalized["month"])
        # Handle cases like "2026-3" -> "2026-03"
        if "-" in month:
            parts = month.split("-")
            if len(parts) == 2:
                month_num = safe_int(parts[1])
                normalized["month"] = f"{parts[0]}-{month_num:02d}"
    
    # Ensure results are properly typed
    if "results" in normalized and isinstance(normalized["results"], dict):
        results = normalized["results"]
        if "totalKgCO2e" in results:
            results["totalKgCO2e"] = safe_float(results["totalKgCO2e"])
        if "locationBasedKgCO2e" in results:
            results["locationBasedKgCO2e"] = safe_float(results["locationBasedKgCO2e"])
        if "mobile" in results and isinstance(results["mobile"], dict):
            results["mobile"]["totalKgCO2e"] = safe_float(results["mobile"].get("totalKgCO2e", 0))
        if "stationary" in results and isinstance(results["stationary"], dict):
            results["stationary"]["totalKgCO2e"] = safe_float(results["stationary"].get("totalKgCO2e", 0))
        if "refrigerants" in results and isinstance(results["refrigerants"], dict):
            results["refrigerants"]["totalKgCO2e"] = safe_float(results["refrigerants"].get("totalKgCO2e", 0))
        if "fugitive" in results and isinstance(results["fugitive"], dict):
            results["fugitive"]["totalKgCO2e"] = safe_float(results["fugitive"].get("totalKgCO2e", 0))
    
    return normalized


def _parse_month(month_value):
    if not month_value:
        return None, None
    try:
        y_str, m_str = str(month_value).split("-")
        return int(y_str), int(m_str)
    except (ValueError, AttributeError):
        return None, None


def _is_in_fiscal_year(month_value: str, fiscal_year_start: int) -> bool:
    year_part, month_part = _parse_month(month_value)
    if year_part is None or month_part is None:
        return False
    if month_part >= FISCAL_YEAR_START_MONTH:
        return year_part == fiscal_year_start
    return year_part == (fiscal_year_start + 1)


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
    """Return ALL emission docs for a scope across all years, normalized."""
    db = get_db()
    docs = db.collection("emissionData").document(company_id).collection(scope).stream()
    return [normalize_emission_doc(doc.to_dict()) for doc in docs]


def doc_total_kg(doc: dict) -> float:
    """Sum scope1 + scope2 total from a single emission doc."""
    res = doc.get("results", {})
    if not isinstance(res, dict):
        return 0.0
    
    # Scope 1 doc
    if "totalKgCO2e" in res:
        return safe_float(res.get("totalKgCO2e"))
    
    # Scope 2 doc
    return safe_float(res.get("locationBasedKgCO2e"))


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
        if yr is not None:
            yr = safe_int(yr)
            annual_s1[yr] = annual_s1.get(yr, 0) + doc_total_kg(doc)
            # Collect refrigerant leakage separately for leak trend
            refrig_kg = (doc.get("results", {}).get("refrigerants") or {}).get("totalKgCO2e", 0)
            annual_refrig[yr] = annual_refrig.get(yr, 0) + safe_float(refrig_kg)

    for doc in s2_docs:
        yr = doc.get("year")
        if yr is not None:
            yr = safe_int(yr)
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
    return sum(1 for m in monthly_series if _is_in_fiscal_year(m.get("month"), year))


# ── Target save endpoint ───────────────────────────────────────────────────────

# backend/app/routes/predictions.py (already has this)
@router.put("/companies/targets")
async def save_targets(
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    """
    Save or update the company's emission reduction targets.
    """
    db = get_db()
    uid = current_user.get("uid")
    company_id, _ = get_company(uid)

    # Validate required fields
    required_fields = ["reductionPct", "baseYear", "targetYear"]
    missing_fields = [f for f in required_fields if f not in body]
    if missing_fields:
        raise HTTPException(
            status_code=400, 
            detail=f"Missing required fields: {', '.join(missing_fields)}"
        )

    # Validate values
    reduction_pct = body.get("reductionPct")
    if not isinstance(reduction_pct, (int, float)) or reduction_pct <= 0 or reduction_pct > 100:
        raise HTTPException(status_code=400, detail="reductionPct must be between 1 and 100")

    # Save targets to company document
    db.collection("companies").document(company_id).set(
        {"targets": body}, merge=True
    )
    
    return {"message": "Targets saved successfully.", "targets": body}


# backend/app/routes/predictions.py - Add this if not present

@router.get("/companies/targets")
async def get_targets(
    current_user: dict = Depends(get_current_user),
):
    """
    Get the company's emission reduction targets.
    """
    uid = current_user.get("uid")
    company_id, company_data = get_company(uid)
    
    targets = company_data.get("targets", {})
    
    return {
        "targets": targets,
        "has_target": bool(targets.get("reductionPct"))
    }
# ── Main predictions endpoint ──────────────────────────────────────────────────

@router.get("/predictions")
async def get_predictions(
    year: int = None,
    current_user: dict = Depends(get_current_user),
    response: Response = None,
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

        # ── EARLY RETURN IF NO TARGETS SET ──────────────────────────────────────
        if not targets.get("reductionPct"):
            if response is not None:
                response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
                response.headers["Pragma"] = "no-cache"
                response.headers["Expires"] = "0"

            return {
                "meta": {
                    "has_target": False,
                    "current_year": current_year,
                    "message": "No reduction targets set"
                },
                "data_availability": {
                    "total_months": 0,
                    "months_in_current_year": 0,
                    "full_years_of_data": 0,
                    "has_base_year_data": False,
                    "current_total_kg": 0,
                    "base_total_kg": None,
                    "target_total_kg": None,
                },
                "confidence": {
                    "tier": 0,
                    "label": "No Target Set",
                    "color": "#9CA3AF",
                    "available": [],
                    "message": "Go to Settings → Company Profile to set your reduction target"
                },
                "predictions": {},
                "series": {"monthly": [], "annual": []}
            }

        # ── Target configuration ──────────────────────────────────────────
        try:
            base_year = safe_int(targets.get("baseYear", current_year))
        except (ValueError, TypeError):
            base_year = current_year
        try:
            target_year = safe_int(targets.get("targetYear", 2030))
        except (ValueError, TypeError):
            target_year = 2030
        try:
            reduction_pct = safe_float(targets.get("reductionPct", 42))
        except (ValueError, TypeError):
            reduction_pct = 42.0
        scopes_covered = str(targets.get("scopesCovered", "scope1+2"))
        interim = targets.get("interimMilestones", [])
        if not isinstance(interim, list):
            interim = []
        has_target = bool(reduction_pct)

        # ── Fetch all emission data ───────────────────────────────────────
        s1_docs = stream_scope_docs(company_id, "scope1")
        s2_docs = stream_scope_docs(company_id, "scope2")

        monthly_series = build_monthly_series(s1_docs, s2_docs)
        annual_series = build_annual_series(s1_docs, s2_docs)

        # ── EARLY RETURN IF NO EMISSION DATA ────────────────────────────────────
        if not monthly_series and not annual_series:
            if response is not None:
                response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
                response.headers["Pragma"] = "no-cache"
                response.headers["Expires"] = "0"

            return {
                "meta": {
                    "has_target": has_target,
                    "current_year": current_year,
                    "base_year": base_year,
                    "target_year": target_year,
                    "reduction_pct": reduction_pct,
                    "scopes_covered": scopes_covered,
                    "generated_at": datetime.utcnow().isoformat(),
                },
                "data_availability": {
                    "total_months": 0,
                    "months_in_current_year": 0,
                    "full_years_of_data": 0,
                    "has_base_year_data": False,
                    "current_total_kg": 0,
                    "base_total_kg": None,
                    "target_total_kg": None,
                },
                "confidence": {
                    "tier": 0,
                    "label": "No Data",
                    "color": "#9CA3AF",
                    "available": [],
                    "message": "Submit your first month of emissions data to start seeing predictions."
                },
                "predictions": {},
                "series": {"monthly": [], "annual": []}
            }

        # ── Data availability ─────────────────────────────────────────────
        monthly_series_fy = [m for m in monthly_series if _is_in_fiscal_year(m.get("month"), current_year)]
        months_in_current_year = len(monthly_series_fy)
        full_years = len([a for a in annual_series if a["year"] < current_year])
        total_months = len(monthly_series_fy)

        confidence = get_confidence_tier(total_months, full_years)

        # ── Base year total (used as denominator for % calculations) ──────
        base_year_data = next((a for a in annual_series if a["year"] == base_year), None)
        base_total_kg = base_year_data["total_kg"] if base_year_data else None

        # If no base year data yet, use first available year as proxy
        if base_total_kg is None and annual_series:
            base_total_kg = annual_series[0]["total_kg"]
            base_year = annual_series[0]["year"]

        # Current year total from annual series (if complete) or monthly sum
        current_total_kg = sum(m["total_kg"] for m in monthly_series_fy)

        target_kg = (base_total_kg * (1 - reduction_pct / 100)) if base_total_kg else None

        # ── Build each prediction ─────────────────────────────────────────
        predictions = {}

        # 1. Target trajectory — always available if target is set
        if has_target and base_total_kg:
            try:
                predictions["target_trajectory"] = {
                    "title": "Reduction Pathway",
                    "description": f"Required annual trajectory to achieve {reduction_pct}% reduction by {target_year}.",
                    "data": build_target_trajectory(
                        base_total_kg, base_year, target_year,
                        reduction_pct, interim,
                    ),
                    "base_total_kg": round(base_total_kg, 2),
                    "target_total_kg": round(target_kg, 2) if target_kg else None,
                }
            except Exception as e:
                print(f"Error building target_trajectory: {e}")

        # 2. Year-end projection — requires 3+ months in current year
        year_end = None
        if "year_end_projection" in confidence["available"] and months_in_current_year >= 3:
            try:
                year_end = project_year_end(monthly_series_fy, current_year)
                if year_end:
                    predictions["year_end_projection"] = {
                        "title": f"{current_year} Year-End Projection",
                        "description": (
                            f"Based on {year_end['months_submitted']} months of data, "
                            f"you are projected to emit {year_end['projected_annual_t']:.2f} tCO₂e this year."
                        ),
                        "data": year_end,
                    }
            except Exception as e:
                print(f"Error building year_end_projection: {e}")

        # 3. On-track analysis — requires trajectory + year-end projection
        if "on_track_analysis" in confidence["available"] and base_total_kg and has_target:
            try:
                trajectory_data = predictions.get("target_trajectory", {}).get("data", [])
                on_track = analyse_on_track(current_total_kg, current_year, trajectory_data, year_end)
                if on_track:
                    predictions["on_track_analysis"] = {
                        "title": "Target Progress",
                        "description": on_track["message"],
                        "data": on_track,
                    }
            except Exception as e:
                print(f"Error building on_track_analysis: {e}")

        # 4. YoY trend — requires 2+ full years
        yoy = None
        if "yoy_trend" in confidence["available"]:
            try:
                annual_for_trend = [
                    {"year": a["year"], "total_kg": a["total_kg"]}
                    for a in annual_series
                ]
                yoy = compute_yoy_trend(annual_for_trend)
                if yoy:
                    direction_word = "falling" if yoy["direction"] == "decreasing" else "rising"
                    predictions["yoy_trend"] = {
                        "title": "Year-on-Year Trend",
                        "description": (
                            f"Your emissions are {direction_word} at "
                            f"{abs(yoy['avg_yoy_change_pct']):.1f}%/year on average "
                            f"({yoy['fit_quality']} fit, R²={yoy['r_squared']})."
                        ),
                        "data": yoy,
                    }
            except Exception as e:
                print(f"Error building yoy_trend: {e}")

        # 5. Multi-year projection — requires 2+ full years
        if "multi_year_projection" in confidence["available"] and base_total_kg:
            try:
                traj = predictions.get("target_trajectory", {}).get("data", [])
                annual_for_proj = [
                    {"year": a["year"], "total_kg": a["total_kg"]}
                    for a in annual_series
                ]
                proj = project_multi_year(annual_for_proj, target_year, traj)
                if proj:
                    predictions["multi_year_projection"] = {
                        "title": f"Emissions Forecast to {target_year}",
                        "description": (
                            f"Based on your {full_years}-year trend, emissions are projected "
                            f"to reach {proj['projections'][-1]['projected_t']:.2f} tCO₂e by {target_year} "
                            f"if current pace continues."
                        ),
                        "data": proj,
                    }
            except Exception as e:
                print(f"Error building multi_year_projection: {e}")

        # 6. Scenario model — requires 3+ full years
        if "scenario_model" in confidence["available"] and base_total_kg and target_kg:
            try:
                annual_for_scenario = [
                    {"year": a["year"], "total_kg": a["total_kg"]}
                    for a in annual_series
                ]
                scenario = build_scenario_model(
                    current_total_kg, current_year, target_year, target_kg, annual_for_scenario
                )
                if scenario:
                    predictions["scenario_model"] = {
                        "title": "Scenario Modelling",
                        "description": (
                            f"Business as usual projects {scenario['summary']['bau_end_kg']/1000:.2f} tCO₂e by {target_year} — "
                            f"{scenario['summary']['bau_gap_to_target']/1000:.2f} tCO₂e above your target. "
                            f"Full implementation of recommendations closes this gap."
                        ),
                        "data": scenario,
                    }
            except Exception as e:
                print(f"Error building scenario_model: {e}")

        # 7. Refrigerant leak trend — always run if data exists
        try:
            refrig_annual = []
            for doc in s1_docs:
                yr = doc.get("year")
                ref_kg = (doc.get("results", {}).get("refrigerants") or {}).get("totalKgCO2e", 0)
                if yr and safe_float(ref_kg) > 0:
                    refrig_annual.append({"year": safe_int(yr), "kg": safe_float(ref_kg)})

            if len(refrig_annual) >= 2:
                refrig_proj = project_refrigerant_trend(refrig_annual)
                if refrig_proj:
                    predictions["refrigerant_trend"] = {
                        "title": "Refrigerant Leakage Trend",
                        "description": refrig_proj.get("alert_message") or (
                            "Refrigerant leakage is stable. Continue scheduled maintenance."
                        ),
                        "data": refrig_proj,
                    }
        except Exception as e:
            print(f"Error building refrigerant_trend: {e}")

        # ── Assemble response ─────────────────────────────────────────────
        if response is not None:
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"

        return {
            "meta": {
                "company_id": company_id,
                "current_year": current_year,
                "base_year": base_year,
                "target_year": target_year,
                "reduction_pct": reduction_pct,
                "scopes_covered": scopes_covered,
                "has_target": has_target,
                "generated_at": datetime.utcnow().isoformat(),
            },
            "data_availability": {
                "total_months": total_months,
                "months_in_current_year": months_in_current_year,
                "full_years_of_data": full_years,
                "has_base_year_data": base_year_data is not None,
                "current_total_kg": round(current_total_kg, 2),
                "base_total_kg": round(base_total_kg, 2) if base_total_kg else None,
                "target_total_kg": round(target_kg, 2) if target_kg else None,
            },
            "confidence": confidence,
            "predictions": predictions,

            # Full series for chart rendering
            "series": {
                "monthly": monthly_series_fy,
                "annual": annual_series,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        print(error_detail, file=sys.stderr)
        # Return a graceful response instead of crashing
        return {
            "meta": {"has_target": False, "current_year": current_year, "error": str(e)},
            "data_availability": {
                "total_months": 0,
                "months_in_current_year": 0,
                "full_years_of_data": 0,
            },
            "confidence": {
                "tier": 0,
                "label": "Error",
                "color": "#EF4444",
                "available": [],
                "message": f"Unable to load predictions: {str(e)[:100]}"
            },
            "predictions": {},
            "series": {"monthly": [], "annual": []}
        }