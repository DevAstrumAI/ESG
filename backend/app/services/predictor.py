# backend/app/services/predictor.py
# Pure Python prediction engine — no OpenAI, no external deps beyond stdlib.
# Called by routes/predictions.py

from datetime import datetime
from typing import Optional
import math


# ── Confidence tier definitions ───────────────────────────────────────────────

def get_confidence_tier(months_of_data: int, full_years: int) -> dict:
    """
    Return the confidence tier and which predictions are available
    based on how much historical data exists.
    """
    if months_of_data == 0:
        return {
            "tier": 0,
            "label": "No Data Yet",
            "color": "#9CA3AF",
            "available": ["target_trajectory"],
            "message": "Submit your first month of emissions data to start seeing predictions.",
        }
    if months_of_data < 3:
        return {
            "tier": 1,
            "label": "Early Stage",
            "color": "#F59E0B",
            "available": ["target_trajectory", "early_trend"],
            "message": f"You have {months_of_data} month(s) of data. Submit at least 3 months for year-end projections.",
        }
    if months_of_data < 12:
        return {
            "tier": 2,
            "label": "Developing",
            "color": "#3B82F6",
            "available": ["target_trajectory", "early_trend", "year_end_projection"],
            "message": f"You have {months_of_data} months of data. Year-end projections are available.",
        }
    if full_years < 2:
        return {
            "tier": 3,
            "label": "Established",
            "color": "#8B5CF6",
            "available": ["target_trajectory", "year_end_projection", "on_track_analysis", "yoy_trend"],
            "message": "Year-on-year trend available. Submit a second full year for multi-year projections.",
        }
    if full_years < 3:
        return {
            "tier": 4,
            "label": "Strong",
            "color": "#2E7D64",
            "available": ["target_trajectory", "year_end_projection", "on_track_analysis",
                          "yoy_trend", "multi_year_projection"],
            "message": "Multi-year projections available. One more year of data unlocks scenario modelling.",
        }
    return {
        "tier": 5,
        "label": "Full Confidence",
        "color": "#1B4D3E",
        "available": ["target_trajectory", "year_end_projection", "on_track_analysis",
                      "yoy_trend", "multi_year_projection", "scenario_model"],
        "message": "All predictions available with high confidence.",
    }


# ── Linear regression (ordinary least squares) ───────────────────────────────

def linear_regression(x_vals: list[float], y_vals: list[float]) -> tuple[float, float]:
    """
    Returns (slope, intercept) for y = slope * x + intercept.
    x_vals and y_vals must be the same length (minimum 2 points).
    """
    n = len(x_vals)
    if n < 2:
        return 0.0, y_vals[0] if y_vals else 0.0

    sum_x  = sum(x_vals)
    sum_y  = sum(y_vals)
    sum_xy = sum(x * y for x, y in zip(x_vals, y_vals))
    sum_x2 = sum(x * x for x in x_vals)

    denom = n * sum_x2 - sum_x ** 2
    if denom == 0:
        return 0.0, sum_y / n

    slope     = (n * sum_xy - sum_x * sum_y) / denom
    intercept = (sum_y - slope * sum_x) / n
    return slope, intercept


def r_squared(x_vals, y_vals, slope, intercept) -> float:
    """Coefficient of determination — how well the trend fits the data."""
    if len(y_vals) < 2:
        return 0.0
    y_mean = sum(y_vals) / len(y_vals)
    ss_tot = sum((y - y_mean) ** 2 for y in y_vals)
    ss_res = sum((y - (slope * x + intercept)) ** 2 for x, y in zip(x_vals, y_vals))
    return 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0


# ── Target trajectory ─────────────────────────────────────────────────────────

def build_target_trajectory(
    base_total_kg: float,
    base_year: int,
    target_year: int,
    reduction_pct: float,
    interim_milestones: list[dict],
) -> list[dict]:
    """
    Linear interpolation from base → target, with interim milestone markers.
    Returns one data point per year from base_year to target_year.
    """
    target_kg    = base_total_kg * (1 - reduction_pct / 100)
    years_total  = max(target_year - base_year, 1)
    trajectory   = []

    for i, yr in enumerate(range(base_year, target_year + 1)):
        frac   = i / years_total
        value  = base_total_kg + frac * (target_kg - base_total_kg)
        is_interim = any(m["year"] == yr for m in interim_milestones)
        trajectory.append({
            "year":          yr,
            "target_kg":     round(value, 2),
            "target_t":      round(value / 1000, 4),
            "is_interim":    is_interim,
            "interim_label": next(
                (f"−{m['reductionPct']}% milestone" for m in interim_milestones if m["year"] == yr),
                None
            ),
        })

    return trajectory


# ── Year-end projection ───────────────────────────────────────────────────────

def project_year_end(
    monthly_data: list[dict],   # [{ month: "2026-03", total_kg: 1234.5 }, ...]
    current_year: int,
) -> Optional[dict]:
    """
    Given monthly submissions for the current year, extrapolate to December.
    Uses average monthly rate × 12.
    Requires at least 3 months.
    """
    year_months = [d for d in monthly_data if str(d.get("month", "")).startswith(str(current_year))]
    if len(year_months) < 3:
        return None

    months_submitted = len(year_months)
    total_so_far_kg  = sum(d["total_kg"] for d in year_months)
    avg_monthly_kg   = total_so_far_kg / months_submitted
    projected_annual = avg_monthly_kg * 12

    # Simple confidence: more months = tighter band
    uncertainty_pct = max(5, 30 - months_submitted * 2)   # 28% at 1 month → 5% at 12 months
    low_kg          = projected_annual * (1 - uncertainty_pct / 100)
    high_kg         = projected_annual * (1 + uncertainty_pct / 100)

    return {
        "months_submitted":       months_submitted,
        "total_so_far_kg":        round(total_so_far_kg, 2),
        "avg_monthly_kg":         round(avg_monthly_kg, 2),
        "projected_annual_kg":    round(projected_annual, 2),
        "projected_annual_t":     round(projected_annual / 1000, 4),
        "confidence_band_low_kg": round(low_kg, 2),
        "confidence_band_high_kg": round(high_kg, 2),
        "uncertainty_pct":        uncertainty_pct,
        "months_remaining":       12 - months_submitted,
        "remaining_budget_kg":    round(projected_annual - total_so_far_kg, 2),
    }


# ── On-track analysis ─────────────────────────────────────────────────────────

def analyse_on_track(
    current_total_kg: float,
    current_year: int,
    target_trajectory: list[dict],
    year_end_projection: Optional[dict],
) -> Optional[dict]:
    """
    Compare actual/projected emissions against the required trajectory.
    Returns a simple on-track verdict with gap figures.
    """
    # Find what the target says for this year
    this_year_target = next(
        (p["target_kg"] for p in target_trajectory if p["year"] == current_year),
        None
    )
    if this_year_target is None:
        return None

    comparison_kg = (
        year_end_projection["projected_annual_kg"]
        if year_end_projection
        else current_total_kg
    )

    gap_kg     = comparison_kg - this_year_target
    gap_pct    = (gap_kg / this_year_target * 100) if this_year_target > 0 else 0
    on_track   = gap_kg <= 0

    if on_track:
        status  = "on_track"
        color   = "#22c55e"
        message = f"On track — projected to finish {abs(gap_kg):.0f} kg CO₂e below your {current_year} target."
    elif gap_pct < 10:
        status  = "slightly_off"
        color   = "#f59e0b"
        message = f"Slightly behind — projected {gap_kg:.0f} kg CO₂e ({gap_pct:.1f}%) above your {current_year} target."
    else:
        status  = "off_track"
        color   = "#ef4444"
        message = f"Off track — projected {gap_kg:.0f} kg CO₂e ({gap_pct:.1f}%) above your {current_year} target."

    return {
        "status":            status,
        "color":             color,
        "message":           message,
        "on_track":          on_track,
        "this_year_target_kg": round(this_year_target, 2),
        "projected_kg":      round(comparison_kg, 2),
        "gap_kg":            round(gap_kg, 2),
        "gap_pct":           round(gap_pct, 2),
    }


# ── Year-over-year trend ──────────────────────────────────────────────────────

def compute_yoy_trend(annual_history: list[dict]) -> Optional[dict]:
    """
    Fit a linear trend to annual totals.
    annual_history: [{ year, total_kg }, ...] sorted ascending.
    Requires at least 2 full years.
    """
    if len(annual_history) < 2:
        return None

    years = [float(h["year"]) for h in annual_history]
    totals = [h["total_kg"] for h in annual_history]

    slope, intercept = linear_regression(years, totals)
    r2 = r_squared(years, totals, slope, intercept)

    yoy_changes = []
    for i in range(1, len(annual_history)):
        prev = annual_history[i - 1]["total_kg"]
        curr = annual_history[i]["total_kg"]
        if prev > 0:
            yoy_changes.append((curr - prev) / prev * 100)

    avg_yoy_pct = sum(yoy_changes) / len(yoy_changes) if yoy_changes else 0
    direction   = "decreasing" if slope < 0 else "increasing"

    return {
        "slope_kg_per_year":  round(slope, 2),
        "direction":          direction,
        "avg_yoy_change_pct": round(avg_yoy_pct, 2),
        "r_squared":          round(r2, 3),
        "fit_quality":        "strong" if r2 > 0.8 else "moderate" if r2 > 0.5 else "weak",
        "data_points":        len(annual_history),
        "annual_history":     annual_history,
    }


# ── Multi-year forward projection ─────────────────────────────────────────────

def project_multi_year(
    annual_history: list[dict],
    project_to_year: int,
    target_trajectory: list[dict],
) -> Optional[dict]:
    """
    Project emissions forward from the last known year using the linear trend.
    Returns projected values for each future year up to project_to_year,
    alongside the target trajectory for comparison.
    Requires at least 2 full years of data.
    """
    if len(annual_history) < 2:
        return None

    years  = [float(h["year"]) for h in annual_history]
    totals = [h["total_kg"] for h in annual_history]

    slope, intercept = linear_regression(years, totals)
    last_year = int(max(years))

    # Uncertainty grows with distance: ±5% per year projected
    projection = []
    for yr in range(last_year + 1, project_to_year + 1):
        projected_kg     = slope * yr + intercept
        projected_kg     = max(projected_kg, 0)   # can't go below zero
        years_ahead      = yr - last_year
        uncertainty_pct  = min(years_ahead * 5, 40)
        low_kg           = projected_kg * (1 - uncertainty_pct / 100)
        high_kg          = projected_kg * (1 + uncertainty_pct / 100)

        target_kg = next(
            (p["target_kg"] for p in target_trajectory if p["year"] == yr),
            None
        )

        projection.append({
            "year":              yr,
            "projected_kg":      round(projected_kg, 2),
            "projected_t":       round(projected_kg / 1000, 4),
            "band_low_kg":       round(low_kg, 2),
            "band_high_kg":      round(high_kg, 2),
            "uncertainty_pct":   uncertainty_pct,
            "target_kg":         round(target_kg, 2) if target_kg else None,
            "gap_to_target_kg":  round(projected_kg - target_kg, 2) if target_kg else None,
            "on_track":          (projected_kg <= target_kg) if target_kg else None,
        })

    return {
        "last_actual_year":  last_year,
        "project_to_year":   project_to_year,
        "slope_kg_per_year": round(slope, 2),
        "projections":       projection,
    }


# ── Scenario model ────────────────────────────────────────────────────────────

def build_scenario_model(
    current_total_kg: float,
    current_year: int,
    target_year: int,
    target_kg: float,
    annual_history: list[dict],
) -> Optional[dict]:
    """
    Three scenarios from current year → target year:
      BAU         — continue current trend unchanged
      Partial     — 50% of required reduction achieved
      Full action — on track for target

    Requires 3+ full years of history.
    """
    if len(annual_history) < 3:
        return None

    years  = [float(h["year"]) for h in annual_history]
    totals = [h["total_kg"] for h in annual_history]
    slope, intercept = linear_regression(years, totals)

    years_to_target = max(target_year - current_year, 1)
    required_annual_reduction = (current_total_kg - target_kg) / years_to_target

    scenarios = {"bau": [], "partial": [], "full_action": []}

    for i, yr in enumerate(range(current_year, target_year + 1)):
        # BAU: extrapolate linear trend
        bau_kg = max(slope * yr + intercept, 0)

        # Full action: straight line to target
        full_kg = current_total_kg - (required_annual_reduction * i)
        full_kg = max(full_kg, 0)

        # Partial: halfway between BAU and full action
        partial_kg = (bau_kg + full_kg) / 2

        scenarios["bau"].append({"year": yr, "kg": round(bau_kg, 2), "t": round(bau_kg / 1000, 4)})
        scenarios["partial"].append({"year": yr, "kg": round(partial_kg, 2), "t": round(partial_kg / 1000, 4)})
        scenarios["full_action"].append({"year": yr, "kg": round(full_kg, 2), "t": round(full_kg / 1000, 4)})

    bau_end    = scenarios["bau"][-1]["kg"]   if scenarios["bau"]   else current_total_kg
    full_end   = scenarios["full_action"][-1]["kg"] if scenarios["full_action"] else target_kg

    return {
        "scenarios": scenarios,
        "summary": {
            "bau_end_kg":         round(bau_end, 2),
            "bau_gap_to_target":  round(bau_end - target_kg, 2),
            "full_end_kg":        round(full_end, 2),
            "required_annual_reduction_kg": round(required_annual_reduction, 2),
        },
    }


# ── Refrigerant leak trajectory ───────────────────────────────────────────────

def project_refrigerant_trend(
    annual_refrigerant_kg: list[dict],  # [{ year, kg }, ...]
) -> Optional[dict]:
    """
    Fit a trend to refrigerant leakage data and flag if growing.
    Needs at least 2 years.
    """
    if len(annual_refrigerant_kg) < 2:
        return None

    years  = [float(d["year"]) for d in annual_refrigerant_kg]
    values = [d["kg"] for d in annual_refrigerant_kg]

    slope, intercept = linear_regression(years, values)
    r2 = r_squared(years, values, slope, intercept)

    next_year     = int(max(years)) + 1
    projected_kg  = max(slope * next_year + intercept, 0)
    growing       = slope > 0

    return {
        "growing":           growing,
        "slope_kg_per_year": round(slope, 2),
        "r_squared":         round(r2, 3),
        "next_year":         next_year,
        "projected_kg":      round(projected_kg, 2),
        "alert":             growing and slope > 10,   # flag if meaningfully increasing
        "alert_message": (
            f"Refrigerant leakage is trending upward by ~{slope:.0f} kg/year. "
            "Consider a preventive maintenance programme."
        ) if growing and slope > 10 else None,
        "history": [{"year": int(y), "kg": round(v, 2)} for y, v in zip(years, values)],
    }
