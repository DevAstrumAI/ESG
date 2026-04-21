from fastapi import APIRouter, HTTPException, Depends, Response
from app.middleware.auth import get_current_user
from app.utils.firebase import get_db
from app.services.calculator import BIOGENIC_FUEL_TYPES
from datetime import datetime
import openai
import os
import json
from collections import defaultdict

router = APIRouter(tags=["Reports"])
FISCAL_YEAR_START_MONTH = 6  # June

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


def _norm_loc(value: str | None) -> str:
    return str(value or "").strip().lower()


def _doc_matches_location(d: dict, country: str | None, city: str | None) -> bool:
    if not country and not city:
        return True
    doc_country = _norm_loc(d.get("country"))
    doc_city = _norm_loc(d.get("city"))
    if country and doc_country != _norm_loc(country):
        return False
    if city and doc_city != _norm_loc(city):
        return False
    return True


def fetch_scope_docs(
    company_id: str,
    scope: str,
    year: int,
    month: str | None,
    *,
    country: str | None = None,
    city: str | None = None,
) -> list[dict]:
    db = get_db()
    docs = db.collection("emissionData").document(company_id).collection(scope).stream()
    results = []
    for doc in docs:
        d = doc.to_dict()
        if not _doc_matches_location(d, country, city):
            continue
        if month:
            if d.get("month") == month:
                results.append(d)
        else:
            month_value = d.get("month")
            if month_value and "-" in str(month_value):
                try:
                    y_str, m_str = str(month_value).split("-")
                    y_num = int(y_str)
                    m_num = int(m_str)
                    in_fiscal_year = (y_num == year and m_num >= FISCAL_YEAR_START_MONTH) or (y_num == year + 1 and m_num < FISCAL_YEAR_START_MONTH)
                    if in_fiscal_year:
                        results.append(d)
                except (ValueError, TypeError):
                    pass
            elif d.get("year") == year:
                results.append(d)
    return results


def calculate_data_coverage_months(scope1_docs: list[dict], scope2_docs: list[dict], year: int, month: str | None) -> int:
    """
    Return the number of distinct reporting months with submitted data.
    For annual/fiscal reports: count distinct YYYY-MM months in the fiscal window (max 12).
    For month-specific reports: return 1 when any data exists for that month, else 0.
    """
    if month:
        return 1 if (scope1_docs or scope2_docs) else 0

    covered = set()
    for doc in [*scope1_docs, *scope2_docs]:
        month_value = str(doc.get("month") or "")
        if "-" not in month_value:
            continue
        try:
            y_str, m_str = month_value.split("-")
            y_num = int(y_str)
            m_num = int(m_str)
        except (ValueError, TypeError):
            continue

        in_fiscal_year = (
            (y_num == year and m_num >= FISCAL_YEAR_START_MONTH)
            or (y_num == year + 1 and m_num < FISCAL_YEAR_START_MONTH)
        )
        if in_fiscal_year:
            covered.add(f"{y_num}-{m_num:02d}")

    return min(len(covered), 12)


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


def _scope1_entry_is_biogenic(entry: dict, category: str) -> bool:
    if category == "stationary":
        if entry.get("isBiogenic"):
            return True
        return str(entry.get("fuelType") or "") in BIOGENIC_FUEL_TYPES
    if category == "mobile":
        return str(entry.get("fuelType") or "") in BIOGENIC_FUEL_TYPES
    return False


def build_scope1_detail_for_report(scope1_docs: list[dict], s1_total_kg: float, top_n: int = 10) -> dict:
    """
    Card 16: top contributing fuel/source lines (non-biogenic) and biogenic fuels separately.
    """
    contributors: dict[str, float] = {}
    biogenic_by_type: dict[str, float] = {}
    biogenic_total = 0.0

    for doc in scope1_docs:
        res = doc.get("results") or {}
        for cat_key, _prefix in (
            ("mobile", "Mobile"),
            ("stationary", "Stationary"),
            ("refrigerants", "Refrigerant"),
            ("fugitive", "Fugitive"),
        ):
            entries = (res.get(cat_key) or {}).get("entries") or []
            for e in entries:
                kg = float(e.get("kgCO2e", 0))
                if _scope1_entry_is_biogenic(e, cat_key):
                    biogenic_total += kg
                    ft = str(
                        e.get("fuelType")
                        or e.get("refrigerantType")
                        or e.get("sourceType")
                        or "unknown"
                    )
                    biogenic_by_type[ft] = biogenic_by_type.get(ft, 0.0) + kg
                    continue
                if cat_key == "mobile":
                    label = f"Mobile — {e.get('fuelType') or 'unknown'}"
                elif cat_key == "stationary":
                    label = f"Stationary — {e.get('fuelType') or 'unknown'}"
                elif cat_key == "refrigerants":
                    label = f"Refrigerant — {e.get('refrigerantType') or 'unknown'}"
                else:
                    label = f"Fugitive — {e.get('sourceType') or 'unknown'}"
                contributors[label] = contributors.get(label, 0.0) + kg

    sorted_contrib = sorted(contributors.items(), key=lambda x: -x[1])[:top_n]
    denom = s1_total_kg if s1_total_kg > 0 else 1.0
    top_contributors = [
        {
            "label": lab,
            "kg": round(kg, 4),
            "t": round(kg / 1000, 4),
            "pct_of_scope1": round(kg / denom * 100, 1),
        }
        for lab, kg in sorted_contrib
    ]

    biogenic_fuels = [
        {
            "fuel_type": ft,
            "label": ft.replace("_", " ").title(),
            "kg": round(kg, 4),
            "t": round(kg / 1000, 4),
            "pct_of_biogenic": round(kg / (biogenic_total or 1) * 100, 1),
        }
        for ft, kg in sorted(biogenic_by_type.items(), key=lambda x: -x[1])
    ]

    return {
        "top_contributors": top_contributors,
        "biogenic": {
            "total_kg": round(biogenic_total, 4),
            "total_t": round(biogenic_total / 1000, 4),
            "fuels": biogenic_fuels,
            "note": (
                "Biogenic CO₂ from biomass-derived fuels is shown separately for transparency "
                "(GHG Protocol biogenic reporting)."
            ),
        },
    }


def collect_certificate_holdings(scope2_docs: list[dict]) -> list[dict]:
    """Market-based electricity backed by renewable certificates (non grid_average)."""
    generic_site_labels = {"main city", "main facility", "hq", "head office", "facility"}
    holdings: list[dict] = []
    for doc in scope2_docs:
        res = doc.get("results") or {}
        elec = res.get("electricity") or {}
        entries = elec.get("entries") or []
        month = doc.get("month") or ""
        city = str(doc.get("city") or "").strip()
        country = str(doc.get("country") or "").strip()
        location_label = f"{city}, {country}".strip(", ") if (city or country) else "—"
        for e in entries:
            ct = str(e.get("certificateType") or "")
            if not ct or ct == "grid_average":
                continue
            if str(e.get("method") or "") != "market":
                continue
            site_name = str(e.get("facilityName") or "").strip()
            if site_name.lower() in generic_site_labels:
                site_name = ""
            loc_lb = e.get("locationBased") or {}
            mk_lb = e.get("marketBased") or {}
            holdings.append({
                "reporting_month": month,
                "site_name": site_name or None,
                "location": location_label,
                "certificate_type": ct,
                "certificate_label": e.get("certificateLabel") or ct,
                "issuing_body": e.get("issuingBody") or e.get("issuer"),
                "consumption_kwh": round(float(e.get("consumptionKwh", 0)), 2),
                "location_based_kg": round(float(loc_lb.get("kgCO2e", 0)), 4),
                "market_based_kg": round(float(mk_lb.get("kgCO2e", 0)), 4),
            })
    holdings.sort(key=lambda x: -float(x["consumption_kwh"]))
    return holdings


def build_scope2_detail_for_report(s2: dict) -> dict:
    """Card 16: explicit location vs market vs renewables."""
    loc_e = s2["electricity_location"]
    mkt_e = s2["electricity_market"]
    heat = s2["heating"]
    ren = s2["renewables"]
    return {
        "location_based": {
            "electricity_kg": round(loc_e, 4),
            "heating_kg": round(heat, 4),
            "total_kg": round(s2["total_location"], 4),
            "total_t": round(s2["total_location"] / 1000, 4),
            "note": "Location-based Scope 2 = location electricity + heating & cooling.",
        },
        "market_based": {
            "electricity_kg": round(mkt_e, 4),
            "heating_kg": round(heat, 4),
            "total_kg": round(s2["total_market"], 4),
            "total_t": round(s2["total_market"] / 1000, 4),
            "note": "Market-based electricity reflects certificate selection; heating uses the same energy basis as location.",
        },
        "renewables": {
            "total_kg": round(ren, 4),
            "total_t": round(ren / 1000, 4),
            "note": "On-site / PPA renewable generation reported separately; not netted against Scope 2 totals here.",
        },
    }


def _month_label(month_value: str | None) -> str:
    if not month_value or "-" not in str(month_value):
        return ""
    try:
        year_s, month_s = str(month_value).split("-")
        dt = datetime(int(year_s), int(month_s), 1)
        return dt.strftime("%b %Y")
    except Exception:
        return str(month_value)


def build_scope1_section(scope1_docs: list[dict], scope1_total_kg: float) -> dict:
    mobile_breakdown = defaultdict(float)
    stationary_breakdown = defaultdict(float)
    refrigerant_breakdown = defaultdict(float)
    fugitive_breakdown = defaultdict(float)
    monthly_totals = defaultdict(float)

    mobile_total = stationary_total = refrigerants_total = fugitive_total = biogenic_total = 0.0

    for doc in scope1_docs:
        month = str(doc.get("month") or "")
        res = doc.get("results") or {}
        monthly_totals[month] += float((res.get("totalKgCO2e") or 0))

        for e in (res.get("mobile") or {}).get("entries", []):
            kg = float(e.get("kgCO2e", 0))
            fuel = str(e.get("fuelType") or "unknown")
            mobile_breakdown[fuel] += kg
            mobile_total += kg

        for e in (res.get("stationary") or {}).get("entries", []):
            kg = float(e.get("kgCO2e", 0))
            fuel = str(e.get("fuelType") or "unknown")
            stationary_breakdown[fuel] += kg
            stationary_total += kg
            if _scope1_entry_is_biogenic(e, "stationary"):
                biogenic_total += kg

        for e in (res.get("refrigerants") or {}).get("entries", []):
            kg = float(e.get("kgCO2e", 0))
            gas = str(e.get("refrigerantType") or "unknown")
            gwp = float(e.get("factorUsed", 0) or 0)
            refrigerant_breakdown[gas] += kg
            refrigerants_total += kg
            # store max gwp seen for this gas
            key = f"{gas}::__gwp"
            refrigerant_breakdown[key] = max(float(refrigerant_breakdown.get(key, 0)), gwp)

        for e in (res.get("fugitive") or {}).get("entries", []):
            kg = float(e.get("kgCO2e", 0))
            src = str(e.get("sourceType") or "unknown")
            fugitive_breakdown[src] += kg
            fugitive_total += kg

    def _as_rows(d: dict, *, add_gwp: bool = False) -> list[dict]:
        rows = []
        for k, v in d.items():
            if str(k).endswith("::__gwp"):
                continue
            item = {
                "key": k,
                "label": k.replace("_", " ").title(),
                "kg": round(float(v), 4),
                "t": round(float(v) / 1000, 4),
            }
            if add_gwp:
                gwp = float(d.get(f"{k}::__gwp", 0) or 0)
                item["gwp"] = round(gwp, 2)
                item["high_gwp"] = gwp > 1000
            rows.append(item)
        rows.sort(key=lambda x: x["kg"], reverse=True)
        return rows

    top_mobile = _as_rows(mobile_breakdown)[:5]
    monthly_chart = []
    for month, kg in sorted(monthly_totals.items()):
        if not month:
            continue
        monthly_chart.append({"month": month, "label": _month_label(month), "kg": round(kg, 4), "t": round(kg / 1000, 4)})

    return {
        "mobile_combustion": {
            "total_kg": round(mobile_total, 4),
            "total_t": round(mobile_total / 1000, 4),
            "fuel_breakdown": _as_rows(mobile_breakdown),
            "top5_bar": [{"label": x["label"], "tCO2e": x["t"]} for x in top_mobile],
        },
        "stationary_combustion": {
            "total_kg": round(stationary_total, 4),
            "total_t": round(stationary_total / 1000, 4),
            "fuel_breakdown": _as_rows(stationary_breakdown),
            "biogenic_total_kg": round(biogenic_total, 4),
            "biogenic_total_t": round(biogenic_total / 1000, 4),
            "biogenic_note": "Biogenic fuels are reported separately and excluded from Scope 1 totals.",
        },
        "refrigerants": {
            "total_kg": round(refrigerants_total, 4),
            "total_t": round(refrigerants_total / 1000, 4),
            "gas_breakdown": _as_rows(refrigerant_breakdown, add_gwp=True),
        },
        "fugitive_emissions": {
            "total_kg": round(fugitive_total, 4),
            "total_t": round(fugitive_total / 1000, 4),
            "source_breakdown": _as_rows(fugitive_breakdown),
        },
        "scope1_total": {
            "kg": round(scope1_total_kg, 4),
            "t": round(scope1_total_kg / 1000, 4),
        },
        "monthly_breakdown_bar": monthly_chart,
    }


def build_scope2_section(s2: dict, scope2_docs: list[dict], recommendations: list[dict]) -> dict:
    district_cooling_kg = 0.0
    heating_kg = 0.0
    for doc in scope2_docs:
        for e in ((doc.get("results") or {}).get("heating") or {}).get("entries", []):
            kg = float(e.get("kgCO2e", 0) or 0)
            et = str(e.get("energyType") or "").lower()
            if "cool" in et:
                district_cooling_kg += kg
            else:
                heating_kg += kg

    certs = collect_certificate_holdings(scope2_docs)
    cert_rows = []
    for c in certs:
        cert_rows.append({
            "certificate_type": c.get("certificate_label"),
            "mwh_covered": round(float(c.get("consumption_kwh", 0)) / 1000, 4),
            "issuing_body": c.get("issuing_body") or None,
            "location": c.get("location"),
            "site_name": c.get("site_name"),
        })

    rec_opportunity = next((r for r in recommendations if r.get("trigger") == "electricity_location_gt_market"), None)
    gap_t = round((s2["electricity_location"] - s2["electricity_market"]) / 1000, 4)

    return {
        "location_based_total_t": round(s2["total_location"] / 1000, 4),
        "market_based_total_t": round(s2["total_market"] / 1000, 4),
        "renewables_reported_separately_t": round(s2["renewables"] / 1000, 4),
        "sub_category_breakdown_t": {
            "electricity_location_based": round(s2["electricity_location"] / 1000, 4),
            "electricity_market_based": round(s2["electricity_market"] / 1000, 4),
            "heating": round(heating_kg / 1000, 4),
            "district_cooling": round(district_cooling_kg / 1000, 4),
        },
        "certificate_holdings": cert_rows,
        "recommendation_if_gap": {
            "applicable": gap_t > 0,
            "gap_tco2e": max(gap_t, 0),
            "recommendation": rec_opportunity.get("description") if rec_opportunity else None,
        },
    }


def build_yoy_section(current_s1: dict, current_s2: dict, prior_s1: dict, prior_s2: dict, employees: int) -> dict:
    def pct(curr: float, prev: float) -> float | None:
        if prev == 0:
            return None
        return round((curr - prev) / prev * 100, 2)

    curr_total = current_s1["total"] + current_s2["total_location"]
    prev_total = prior_s1["total"] + prior_s2["total_location"]
    curr_int = (curr_total / 1000) / max(employees, 1)
    prev_int = (prev_total / 1000) / max(employees, 1)

    drivers = [
        ("Mobile combustion", (current_s1["mobile"] - prior_s1["mobile"]) / 1000),
        ("Stationary combustion", (current_s1["stationary"] - prior_s1["stationary"]) / 1000),
        ("Refrigerants", (current_s1["refrigerants"] - prior_s1["refrigerants"]) / 1000),
        ("Fugitive emissions", (current_s1["fugitive"] - prior_s1["fugitive"]) / 1000),
        ("Electricity (location-based)", (current_s2["electricity_location"] - prior_s2["electricity_location"]) / 1000),
        ("Heating & cooling", (current_s2["heating"] - prior_s2["heating"]) / 1000),
    ]
    waterfall = [{"category": name, "delta_tco2e": round(delta, 4)} for name, delta in drivers]
    top_moves = sorted(drivers, key=lambda x: abs(x[1]), reverse=True)[:2]
    movement_text = ", ".join([f"{name} {'increased' if d > 0 else 'decreased'} by {abs(d):.2f} tCO2e" for name, d in top_moves]) if top_moves else "No significant movement detected."
    variance_explanation = f"Year-over-year movement is primarily driven by {movement_text}."

    probable_causes = {
        "Mobile combustion": "Higher transport activity, route length, or fuel mix changes in fleet operations.",
        "Stationary combustion": "Changes in generator/boiler runtime, fuel switching, or backup power reliance.",
        "Refrigerants": "Leak events, recharge cycles, or use of higher-GWP refrigerants.",
        "Fugitive emissions": "Operational leaks, maintenance incidents, or detection/reporting improvements.",
        "Electricity (location-based)": "Grid electricity consumption changes and demand profile shifts.",
        "Heating & cooling": "Seasonal HVAC loads or heating/cooling intensity changes.",
    }

    comparison_rows = [
        {"metric": "Total Scope 1 + 2 (tCO2e)", "current": round(curr_total / 1000, 4), "prior": round(prev_total / 1000, 4), "delta_pct": pct(curr_total, prev_total)},
        {"metric": "Scope 1 — Mobile", "current": round(current_s1["mobile"] / 1000, 4), "prior": round(prior_s1["mobile"] / 1000, 4), "delta_pct": pct(current_s1["mobile"], prior_s1["mobile"])},
        {"metric": "Scope 1 — Stationary", "current": round(current_s1["stationary"] / 1000, 4), "prior": round(prior_s1["stationary"] / 1000, 4), "delta_pct": pct(current_s1["stationary"], prior_s1["stationary"])},
        {"metric": "Scope 1 — Refrigerants", "current": round(current_s1["refrigerants"] / 1000, 4), "prior": round(prior_s1["refrigerants"] / 1000, 4), "delta_pct": pct(current_s1["refrigerants"], prior_s1["refrigerants"])},
        {"metric": "Scope 1 — Fugitive", "current": round(current_s1["fugitive"] / 1000, 4), "prior": round(prior_s1["fugitive"] / 1000, 4), "delta_pct": pct(current_s1["fugitive"], prior_s1["fugitive"])},
        {"metric": "Scope 2 — Location-based", "current": round(current_s2["total_location"] / 1000, 4), "prior": round(prior_s2["total_location"] / 1000, 4), "delta_pct": pct(current_s2["total_location"], prior_s2["total_location"])},
        {"metric": "Scope 2 — Market-based", "current": round(current_s2["total_market"] / 1000, 4), "prior": round(prior_s2["total_market"] / 1000, 4), "delta_pct": pct(current_s2["total_market"], prior_s2["total_market"])},
    ]

    return {
        "total_scope1_2_t": {
            "current": round(curr_total / 1000, 4),
            "prior": round(prev_total / 1000, 4),
            "delta_pct": pct(curr_total, prev_total),
        },
        "scope1_subcategories_t": {
            "mobile": {"current": round(current_s1["mobile"] / 1000, 4), "prior": round(prior_s1["mobile"] / 1000, 4), "delta_pct": pct(current_s1["mobile"], prior_s1["mobile"])},
            "stationary": {"current": round(current_s1["stationary"] / 1000, 4), "prior": round(prior_s1["stationary"] / 1000, 4), "delta_pct": pct(current_s1["stationary"], prior_s1["stationary"])},
            "refrigerants": {"current": round(current_s1["refrigerants"] / 1000, 4), "prior": round(prior_s1["refrigerants"] / 1000, 4), "delta_pct": pct(current_s1["refrigerants"], prior_s1["refrigerants"])},
            "fugitive": {"current": round(current_s1["fugitive"] / 1000, 4), "prior": round(prior_s1["fugitive"] / 1000, 4), "delta_pct": pct(current_s1["fugitive"], prior_s1["fugitive"])},
        },
        "scope2_location_t": {"current": round(current_s2["total_location"] / 1000, 4), "prior": round(prior_s2["total_location"] / 1000, 4), "delta_pct": pct(current_s2["total_location"], prior_s2["total_location"])},
        "scope2_market_t": {"current": round(current_s2["total_market"] / 1000, 4), "prior": round(prior_s2["total_market"] / 1000, 4), "delta_pct": pct(current_s2["total_market"], prior_s2["total_market"])},
        "intensity_tco2e_per_employee": {"current": round(curr_int, 4), "prior": round(prev_int, 4), "delta_pct": pct(curr_int, prev_int)},
        "comparison_table_rows": comparison_rows,
        "waterfall_chart": waterfall,
        "largest_movements": [
            {
                "category": name,
                "delta_tco2e": round(delta, 4),
                "direction": "increase" if delta > 0 else "decrease" if delta < 0 else "flat",
                "probable_cause": probable_causes.get(name, "Operational activity level and submission patterns."),
            }
            for name, delta in top_moves
        ],
        "ai_variance_explanation": variance_explanation,
    }


def build_yoy_variance_explanation_ai(
    client: openai.OpenAI,
    *,
    industry: str,
    city: str,
    year: int,
    table_rows: list[dict],
    largest_movements: list[dict],
) -> str:
    prompt = f"""
You are an ESG reporting analyst.
Write one concise paragraph (55-90 words) explaining year-on-year variance using only the provided data.
Mention the two largest movement categories and likely operational causes in plain business language.

Context:
- Industry: {industry}
- City: {city}
- Reporting year: {year}
- YoY rows: {json.dumps(table_rows, ensure_ascii=False)}
- Largest movements: {json.dumps(largest_movements, ensure_ascii=False)}

Return JSON only: {{"variance_explanation":"..."}}
"""
    try:
        data = call_openai(client, prompt)
        txt = str((data or {}).get("variance_explanation", "")).strip()
        return txt
    except Exception:
        return ""


def _collect_sources_from_factor_doc(node, acc: list[str]) -> None:
    if isinstance(node, dict):
        src = node.get("source")
        if isinstance(src, str) and src.strip():
            acc.append(src.strip())
        for value in node.values():
            _collect_sources_from_factor_doc(value, acc)
    elif isinstance(node, list):
        for item in node:
            _collect_sources_from_factor_doc(item, acc)


def _pick_primary_source(source_list: list[str]) -> str:
    if not source_list:
        return "Not specified in factor records"
    freq: dict[str, int] = {}
    for s in source_list:
        freq[s] = freq.get(s, 0) + 1
    return sorted(freq.items(), key=lambda x: (-x[1], x[0]))[0][0]


def _fetch_factor_doc(db, region: str, country: str, city: str, scope: str) -> dict:
    candidate_paths = [
        f"emissionFactors/regions/{region}/countries/{country}/cities/city_data/{city}/{scope}/factors",
        f"emissionFactors/regions/{region}/countries/{country}/cities/city_data/{city}/('{scope}',)/factors",
    ]
    for p in candidate_paths:
        snap = db.document(p).get()
        if snap.exists:
            return snap.to_dict() or {}
    return {}


def build_methodology_section(db, countries: list[str]) -> dict:
    # Country anchors for methodology factor-source table.
    country_anchor_map = {
        "uae": {"region_label": "UAE", "region": "middle-east", "country": "uae", "city": "dubai"},
        "singapore": {"region_label": "Singapore", "region": "southeast-asia", "country": "singapore", "city": "singapore"},
        "saudi-arabia": {"region_label": "Saudi Arabia", "region": "middle-east", "country": "saudi-arabia", "city": "riyadh"},
    }

    normalized_countries = sorted({_norm_loc(c) for c in (countries or []) if _norm_loc(c)})
    anchors = [country_anchor_map[c] for c in normalized_countries if c in country_anchor_map]

    factor_source_rows = []
    for a in anchors:
        s1_doc = _fetch_factor_doc(db, a["region"], a["country"], a["city"], "scope1")
        s2_doc = _fetch_factor_doc(db, a["region"], a["country"], a["city"], "scope2")
        s1_sources: list[str] = []
        s2_sources: list[str] = []
        _collect_sources_from_factor_doc(s1_doc, s1_sources)
        _collect_sources_from_factor_doc(s2_doc, s2_sources)
        factor_source_rows.append({
            "region": a["region_label"],
            "scope1_source": _pick_primary_source(s1_sources),
            "scope2_source": _pick_primary_source(s2_sources),
        })

    return {
        "organisational_boundary": "Operational control approach — emissions are reported for assets/facilities under operational control.",
        "reporting_standard": "GHG Protocol Corporate Accounting and Reporting Standard (2015 edition)",
        "gwp_basis": "IPCC AR5 GWP100 values",
        "scope2_method": "Location-based and market-based are both calculated and disclosed separately.",
        "factor_source_table": factor_source_rows,
        "biogenic_exclusion_note": "Biogenic emissions are reported separately and excluded from Scope 1 totals.",
        "scope3_exclusion_note": "Scope 3 emissions are excluded from this report at the current stage.",
    }


def fetch_historical_totals(
    company_id: str,
    base_year: int,
    current_year: int,
    *,
    country: str | None = None,
    city: str | None = None,
) -> list[dict]:
    history = []
    for yr in range(base_year, current_year + 1):
        s1 = aggregate_scope1(fetch_scope_docs(company_id, "scope1", yr, None, country=country, city=city))
        s2 = aggregate_scope2(fetch_scope_docs(company_id, "scope2", yr, None, country=country, city=city))
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

    # Card 14: keep recommendation order by emissions impact first.
    # Financial values are still provided, but sorting is by tCO2e impact.
    enriched.sort(
        key=lambda r: (
            float(r.get("estimated_reduction_tco2e", 0) or 0),
            r["financial"]["annual_saving_usd"],
        ),
        reverse=True,
    )

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
# Deterministic Category-Level Recommendations (Card 14)
# ---------------------------------------------------------------------------

def build_category_level_recommendations(s1: dict, s2: dict) -> list[dict]:
    """
    Build recommendations from fixed trigger rules:
      1) Mobile >30% of total            -> fleet electrification
      2) Electricity location > market   -> REC/PPA procurement
      3) Refrigerant leakage >10% total  -> low-GWP refrigerant switch
    Sorted by estimated_reduction_tco2e DESC.
    """
    total_kg = (s1.get("total") or 0.0) + (s2.get("total_location") or 0.0)
    if total_kg <= 0:
        return []

    mobile_kg = float(s1.get("mobile") or 0.0)
    refrigerants_kg = float(s1.get("refrigerants") or 0.0)
    electricity_location_kg = float(s2.get("electricity_location") or 0.0)
    electricity_market_kg = float(s2.get("electricity_market") or 0.0)

    mobile_share = mobile_kg / total_kg
    refrigerant_share = refrigerants_kg / total_kg
    elec_gap_kg = max(electricity_location_kg - electricity_market_kg, 0.0)

    recs: list[dict] = []

    # Trigger 1: Mobile >30% -> fleet electrification
    if mobile_share > 0.30:
        estimated_reduction_t = round((mobile_kg * 0.50) / 1000, 3)  # assume 50% cut
        recs.append({
            "title": "Electrify Priority Fleet",
            "category": "Fleet & Transport",
            "description": "Mobile emissions exceed 30% of total. Prioritize EV transition for high-mileage vehicles and phase combustion vehicles with charging and route planning support.",
            "estimated_reduction_tco2e": estimated_reduction_t,
            "reduction_percentage_of_category": 50.0,
            "effort": "High",
            "implementation_timeline": "1-2 years",
            "why_this_company": f"Mobile combustion is {mobile_share * 100:.1f}% of total emissions.",
            "trigger": "mobile_share_gt_30pct",
        })

    # Trigger 2: Electricity location > market -> REC/PPA
    if electricity_location_kg > electricity_market_kg:
        location_t = electricity_location_kg / 1000
        market_t = electricity_market_kg / 1000
        estimated_reduction_t = round(elec_gap_kg / 1000, 3)
        recs.append({
            "title": "Scale REC/PPA Procurement",
            "category": "Renewable Energy",
            "description": "Location-based electricity emissions are higher than market-based results. Expand REC/PPA coverage for grid consumption to close the residual emissions gap.",
            "estimated_reduction_tco2e": estimated_reduction_t,
            "reduction_percentage_of_category": round((elec_gap_kg / electricity_location_kg) * 100, 1) if electricity_location_kg > 0 else 0.0,
            "effort": "Medium",
            "implementation_timeline": "6-12 months",
            "why_this_company": f"Electricity location-based is {location_t:.2f} tCO2e vs market-based {market_t:.2f} tCO2e.",
            "trigger": "electricity_location_gt_market",
        })

    # Trigger 3: Refrigerants >10% -> low-GWP switch
    if refrigerant_share > 0.10:
        estimated_reduction_t = round((refrigerants_kg * 0.60) / 1000, 3)  # assume 60% cut
        recs.append({
            "title": "Switch to Low-GWP Refrigerants",
            "category": "Refrigerant Management",
            "description": "Refrigerant leakage is a material share of emissions. Adopt low-GWP refrigerants with enhanced leak detection and preventive maintenance protocols.",
            "estimated_reduction_tco2e": estimated_reduction_t,
            "reduction_percentage_of_category": 60.0,
            "effort": "Medium",
            "implementation_timeline": "6-12 months",
            "why_this_company": f"Refrigerant leakage contributes {refrigerant_share * 100:.1f}% of total emissions.",
            "trigger": "refrigerant_share_gt_10pct",
        })

    # Card 14 requirement: sort by estimated impact descending.
    recs.sort(key=lambda r: float(r.get("estimated_reduction_tco2e", 0) or 0), reverse=True)
    return recs


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
        "renewables_reported_separately": {"tco2e": t(s2["renewables"]), "note": "Reported separately; not netted into Scope 2 totals"},
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
        db = get_db()
        client = get_openai_client()

        year      = body.get("year", datetime.utcnow().year)
        month     = body.get("month")
        base_year = body.get("base_year", year - 1)
        period_type = str(body.get("period") or ("monthly" if month else "yearly")).lower()
        quarter = str(body.get("quarter") or "").upper()

        company_name = (company_data.get("basicInfo") or {}).get("name", "the company")
        industry     = (company_data.get("basicInfo") or {}).get("industry", "General Industry")

        # Resolve selected/report location. If no city/country selected, fall back to primary location.
        locations = company_data.get("locations", [])
        primary   = next((l for l in locations if l.get("isPrimary")), locations[0] if locations else {})
        requested_city = str(body.get("city") or "").strip().lower()
        requested_country = str(body.get("country") or "").strip().lower()
        selected_city = requested_city if requested_city and requested_city != "all" else (primary.get("city") or "dubai").lower()
        selected_country = requested_country if requested_country and requested_country != "all" else (primary.get("country") or "").lower()
        fin       = {**REGIONAL_FINANCIALS.get(selected_city, DEFAULT_FINANCIALS), "city": selected_city}

        # ── Fetch & aggregate ─────────────────────────────────────────────
        scope1_docs = fetch_scope_docs(
            company_id, "scope1", year, month, country=selected_country or None, city=selected_city or None
        )
        scope2_docs = fetch_scope_docs(
            company_id, "scope2", year, month, country=selected_country or None, city=selected_city or None
        )
        s1 = aggregate_scope1(scope1_docs)
        s2 = aggregate_scope2(scope2_docs)

        if s1["total"] == 0 and s2["total_location"] == 0:
            raise HTTPException(
                status_code=404,
                detail="No emission data found for the selected period. Please submit Scope 1 and Scope 2 data first."
            )

        # ── Historical trend ──────────────────────────────────────────────
        history = fetch_historical_totals(
            company_id,
            base_year,
            year,
            country=selected_country or None,
            city=selected_city or None,
        )

        # ── SBTi baseline ─────────────────────────────────────────────────
        base_s1       = aggregate_scope1(
            fetch_scope_docs(company_id, "scope1", base_year, None, country=selected_country or None, city=selected_city or None)
        )
        base_s2       = aggregate_scope2(
            fetch_scope_docs(company_id, "scope2", base_year, None, country=selected_country or None, city=selected_city or None)
        )
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
        card14_recs   = build_category_level_recommendations(s1, s2)
        raw_recs      = card14_recs if card14_recs else ai.get("recommendations", [])
        financial     = calculate_financial_impact(s1, s2, selected_city, raw_recs)
        enriched_recs = financial.pop("recommendations_with_financials", raw_recs)

        total_kg = s1["total"] + s2["total_location"]

        # Executive-summary metrics (Card 15)
        yoy_change_pct = carbon_score.get("dimensions", {}).get("trajectory_score", {}).get("yoy_change_pct")
        if yoy_change_pct is not None:
            try:
                yoy_change_pct = round(float(yoy_change_pct), 2)
            except (TypeError, ValueError):
                yoy_change_pct = None
        yoy_direction = (
            "up" if (yoy_change_pct is not None and yoy_change_pct > 0)
            else "down" if (yoy_change_pct is not None and yoy_change_pct < 0)
            else "flat"
        )
        zone = str(carbon_score.get("zone") or "").strip().lower()
        if zone in {"climate leader", "on track"}:
            danger_level = "Green"
        elif zone == "needs attention":
            danger_level = "Amber"
        else:
            danger_level = "Red"

        data_coverage_months = calculate_data_coverage_months(
            scope1_docs,
            scope2_docs,
            year,
            month,
        )
        missing_months = max(12 - int(data_coverage_months), 0)

        # Card 16 — Scope 1 & 2 detail (contributors, biogenic, scope2 split, certificates)
        scope1_detail = build_scope1_detail_for_report(scope1_docs, s1["total"])
        scope2_detail_block = build_scope2_detail_for_report(s2)
        certificate_holdings = collect_certificate_holdings(scope2_docs)

        # Current-vs-prior and intensity (Section 3.5)
        prior_s1 = aggregate_scope1(
            fetch_scope_docs(company_id, "scope1", year - 1, None, country=selected_country or None, city=selected_city or None)
        )
        prior_s2 = aggregate_scope2(
            fetch_scope_docs(company_id, "scope2", year - 1, None, country=selected_country or None, city=selected_city or None)
        )
        employees = (
            (company_data.get("basicInfo") or {}).get("employees")
            or (company_data.get("basicInfo") or {}).get("employeeCount")
            or 1
        )
        try:
            employees = max(int(employees), 1)
        except Exception:
            employees = 1
        yoy_section = build_yoy_section(s1, s2, prior_s1, prior_s2, employees)
        ai_yoy_text = build_yoy_variance_explanation_ai(
            client,
            industry=industry,
            city=selected_city,
            year=year,
            table_rows=yoy_section.get("comparison_table_rows", []),
            largest_movements=yoy_section.get("largest_movements", []),
        )
        if ai_yoy_text:
            yoy_section["ai_variance_explanation"] = ai_yoy_text

        # Section 3.1 cover/metadata
        if period_type == "quarterly" and quarter:
            report_title = f"Quarterly ESG Report — {quarter} {year}"
        else:
            report_title = f"GHG Emissions Report — {year}"
        report_period = month if month else f"January {year} – December {year}"
        prepared_with = "Lumyina ESG Calculator, AstrumAI v1.0"

        # Section 3.7 card-style recommendations (already deterministic-first)
        category_recommendations = [
            {
                "category": r.get("category") or "General",
                "current_tco2e": round(float(r.get("estimated_reduction_tco2e", 0) or 0), 4),  # best available numeric anchor
                "specific_action": r.get("description"),
                "estimated_reduction_tco2e_range": {
                    "min": round(float(r.get("estimated_reduction_tco2e", 0) or 0) * 0.8, 4),
                    "max": round(float(r.get("estimated_reduction_tco2e", 0) or 0) * 1.2, 4),
                },
                "difficulty": r.get("effort") or "Medium",
                "local_programme": (
                    "UAE Green Agenda" if selected_country == "uae"
                    else "Singapore Green Plan 2030" if selected_country == "singapore"
                    else "Saudi Vision 2030" if selected_country in {"saudi-arabia", "saudi arabia"}
                    else None
                ),
                "trigger": r.get("trigger"),
            }
            for r in enriched_recs
        ]

        configured_countries = sorted({
            _norm_loc(loc.get("country"))
            for loc in (company_data.get("locations") or [])
            if _norm_loc(loc.get("country"))
        })
        methodology_countries = (
            [selected_country]
            if _norm_loc(selected_country)
            else configured_countries
        )

        def t(kg): return round(kg / 1000, 4)

        trend_milestone_years = {2025, 2026, 2027, 2028, 2029, 2030, 2035, 2040, 2045, 2050}

        # ── Assemble ──────────────────────────────────────────────────────
        report = {
            "meta": {
                "company_name":   company_name,
                "industry":       industry,
                "city":           selected_city,
                "country":        selected_country,
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

            # Card 16 — structured Scope 1 & 2 detail
            "scope_detail": {
                "scope1": scope1_detail,
                "scope2": {
                    **scope2_detail_block,
                    "certificate_holdings": certificate_holdings,
                },
            },

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
                        "Renewables (reported separately)": {"kg": round(s2["renewables"], 2),       "t": t(s2["renewables"])},
                    },
                },
                "combined_total_kg": round(total_kg, 2),
                "combined_total_t":  t(total_kg),
            },

            # Card 15 - Executive Summary structured metrics
            "executive_metrics": {
                "total_tco2e": round(total_kg / 1000, 4),
                "yoy_change_pct": yoy_change_pct,
                "yoy_direction": yoy_direction,
                "danger_level": danger_level,
                "scope1_tco2e": round(s1["total"] / 1000, 4),
                "scope2_tco2e": round(s2["total_location"] / 1000, 4),
                "data_coverage_months": data_coverage_months,
                "data_coverage_statement": f"{data_coverage_months} of 12 months",
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
                    {"category": "Renewables (reported)", "scope": "Scope 2", "tCO2e": t(s2["renewables"])},
                ],
                "scope1_top_contributors_bar": [
                    {
                        "label": x["label"],
                        "tCO2e": x["t"],
                        "pct_of_scope1": x["pct_of_scope1"],
                    }
                    for x in scope1_detail["top_contributors"]
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

            # Market-standard report sections (requested strict structure)
            "report_standard": {
                "section_3_1_cover_metadata": {
                    "company_name": company_name,
                    "company_logo": (company_data.get("basicInfo") or {}).get("logo")
                        or (company_data.get("basicInfo") or {}).get("logoUrl"),
                    "report_title": report_title,
                    "reporting_period": report_period,
                    "primary_operating_region": (company_data.get("region") or "").strip() or "—",
                    "date_of_generation": datetime.utcnow().date().isoformat(),
                    "prepared_using": prepared_with,
                    "ghg_protocol_statement": "Prepared in accordance with the GHG Protocol Corporate Accounting and Reporting Standard",
                },
                "section_3_2_executive_summary": {
                    "total_emissions_tco2e": round(total_kg / 1000, 4),
                    "year_on_year_change_pct": yoy_change_pct,
                    "danger_level": danger_level,
                    "scope1_tco2e": round(s1["total"] / 1000, 4),
                    "scope2_tco2e": round(s2["total_location"] / 1000, 4),
                    "top_1_recommended_action": (enriched_recs[0].get("description") if enriched_recs else None),
                    "data_coverage_statement": f"This report covers {data_coverage_months} of 12 months. {missing_months} months of data were not submitted.",
                },
                "section_3_3_scope1_detail": build_scope1_section(scope1_docs, s1["total"]),
                "section_3_4_scope2_detail": build_scope2_section(s2, scope2_docs, enriched_recs),
                "section_3_5_yoy_comparison": yoy_section,
                "section_6_methodology_disclosure": build_methodology_section(db, methodology_countries),
                "section_3_7_category_recommendations": category_recommendations,
                "section_3_10_export_formats": [
                    {"format": "PDF (branded)", "audience": "Board, regulators, public disclosure", "content": "Full formatted report with charts, tables, and company branding"},
                    {"format": "Excel / CSV", "audience": "Auditors, finance teams", "content": "Raw monthly data, emission factors used, calculated totals"},
                    {"format": "GRI-aligned data table", "audience": "Sustainability frameworks, ESG ratings", "content": "Structured table mapping data to GRI 305 disclosures"},
                    {"format": "JSON / API", "audience": "Third-party ESG platforms", "content": "Machine-readable emissions summary for integrations"},
                ],
            },
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
    response: Response = None,
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
        if response is not None:
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return {"recommendation": recommendation}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendation: {str(e)}")