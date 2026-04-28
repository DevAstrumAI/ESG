from typing import Optional

from fastapi import APIRouter, HTTPException, status, Depends, Response, Query
from app.middleware.auth import get_current_user
from app.utils.firebase import get_db
from app.services.calculator import calculate_scope1, calculate_scope2, get_emission_factors
from app.utils.location_resolver import resolve_location, get_available_locations, get_country_display_name, get_city_display_name
from datetime import datetime
import json

# Debug-mode instrumentation: write NDJSON lines to the session log file.
LOG_PATH = r"C:\Users\Home\OneDrive\Desktop\ESG\debug-841ec6.log"

def _append_agent_log(hypothesisId: str, location: str, message: str, data: dict, runId: str = "pre-fix"):
    payload = {
        "sessionId": "841ec6",
        "runId": runId,
        "hypothesisId": hypothesisId,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(datetime.utcnow().timestamp() * 1000),
    }
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(payload, ensure_ascii=False) + "\n")

router = APIRouter(tags=["Emissions"])
FISCAL_YEAR_START_MONTH = 6  # June


def _parse_month_parts(month_value):
    if not month_value:
        return None, None
    try:
        y_str, m_str = str(month_value).split("-")
        return int(y_str), int(m_str)
    except (ValueError, AttributeError):
        return None, None


def _is_month_in_fiscal_year(month_value: str, fiscal_year_start: int) -> bool:
    year_part, month_part = _parse_month_parts(month_value)
    if year_part is None or month_part is None:
        return False
    if month_part >= FISCAL_YEAR_START_MONTH:
        return year_part == fiscal_year_start
    return year_part == (fiscal_year_start + 1)


def _iter_fiscal_months(fiscal_year_start: int):
    months = []
    for idx in range(12):
        month_num = ((FISCAL_YEAR_START_MONTH - 1 + idx) % 12) + 1
        year_num = fiscal_year_start if month_num >= FISCAL_YEAR_START_MONTH else fiscal_year_start + 1
        months.append((year_num, month_num, f"{year_num}-{month_num:02d}"))
    return months


def _normalize_value(value):
    if value is None:
        return ""
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return float(value)
    normalized = str(value).strip()
    if normalized.replace('.', '', 1).isdigit():
        try:
            return float(normalized)
        except ValueError:
            return normalized.lower()
    return normalized.lower()


def _values_equal(a, b):
    return _normalize_value(a) == _normalize_value(b)


def _match_scope1_entry(candidate: dict, entry: dict, category: str) -> bool:
    if category == "mobile":
        if not _values_equal(candidate.get("fuelType"), entry.get("fuelType")):
            return False
        if "distanceKm" in candidate or "distanceKm" in entry:
            return _values_equal(candidate.get("distanceKm"), entry.get("distanceKm"))
        return _values_equal(candidate.get("litresConsumed"), entry.get("litresConsumed"))

    if category == "stationary":
        return (
            _values_equal(candidate.get("fuelType"), entry.get("fuelType")) and
            _values_equal(candidate.get("consumption"), entry.get("consumption"))
        )

    if category == "refrigerants":
        return (
            _values_equal(candidate.get("refrigerantType"), entry.get("refrigerantType")) and
            _values_equal(candidate.get("leakageKg"), entry.get("leakageKg"))
        )

    if category == "fugitive":
        return (
            _values_equal(candidate.get("sourceType"), entry.get("sourceType")) and
            _values_equal(candidate.get("emissionKg"), entry.get("emissionKg"))
        )

    return False


def _match_scope2_entry(candidate: dict, entry: dict, category: str) -> bool:
    if category == "electricity":
        return (
            _values_equal(candidate.get("facilityName"), entry.get("facilityName")) and
            _values_equal(candidate.get("consumptionKwh"), entry.get("consumptionKwh")) and
            _values_equal(candidate.get("method"), entry.get("method")) and
            _values_equal(candidate.get("certificateType"), entry.get("certificateType"))
        )

    if category == "heating":
        return (
            _values_equal(candidate.get("energyType"), entry.get("energyType")) and
            _values_equal(candidate.get("consumptionKwh"), entry.get("consumptionKwh"))
        )

    if category == "renewables":
        return (
            _values_equal(candidate.get("sourceType"), entry.get("sourceType")) and
            _values_equal(candidate.get("generationKwh"), entry.get("generationKwh"))
        )

    return False


def _remove_matching_entry(entries: list, entry: dict, match_func) -> tuple[list, bool]:
    for index, candidate in enumerate(entries or []):
        if match_func(candidate, entry):
            updated = list(entries)
            updated.pop(index)
            return updated, True
    return entries, False


def _city_doc_slug(normalized_city: str) -> str:
    s = (normalized_city or "").strip().lower().replace(" ", "-").replace("_", "-")
    return s or "unknown"


def _branch_doc_slug(branch: Optional[str]) -> str:
    s = (branch or "").strip().lower().replace(" ", "-").replace("_", "-")
    return s or "main"


def _scope_storage_doc_id(month: Optional[str], year: int, normalized_city: str, branch: Optional[str] = None) -> str:
    slug = _city_doc_slug(normalized_city)
    branch_slug = _branch_doc_slug(branch)
    if month:
        return f"{month}__{slug}__{branch_slug}"
    return f"{year}-annual__{slug}__{branch_slug}"


def _doc_location_matches(
    data: dict,
    region_filter: Optional[str],
    country_filter: Optional[str],
    city_filter: Optional[str],
    branch_filter: Optional[str] = None,
) -> bool:
    if not region_filter and not country_filter and not city_filter and not branch_filter:
        return True
    if region_filter and str(data.get("region") or "").strip().lower() != str(region_filter).strip().lower():
        return False
    cf = country_filter or data.get("country") or ""
    cy = city_filter or data.get("city") or ""
    _, nc, ncity = resolve_location(cf, cy)
    doc_country = data.get("country", "")
    doc_city = data.get("city", "")
    _, dnc, dncy = resolve_location(doc_country, doc_city)
    if not (nc == dnc and ncity == dncy):
        return False
    if branch_filter:
        return str(data.get("branch") or "").strip().lower() == str(branch_filter or "").strip().lower()
    return True


def _get_scope_doc(
    db,
    company_id: str,
    scope: str,
    year: int,
    month: Optional[str],
    country: Optional[str] = None,
    city: Optional[str] = None,
    branch: Optional[str] = None,
):
    if country and city:
        _, _, ncity = resolve_location(country, city)
        doc_id = _scope_storage_doc_id(month, year, ncity, branch)
        return db.collection("emissionData").document(company_id).collection(scope).document(doc_id)
    doc_id = str(month) if month is not None and month != "" else f"{year}-annual"
    return db.collection("emissionData").document(company_id).collection(scope).document(doc_id)


def _get_scope_doc_resolve(
    db,
    company_id: str,
    scope: str,
    year: int,
    month: Optional[str],
    country: Optional[str],
    city: Optional[str],
    branch: Optional[str] = None,
):
    """Prefer city-scoped document id; fall back to legacy month-only id."""
    if country and city and month:
        ref = _get_scope_doc(db, company_id, scope, year, month, country, city, branch)
        if ref.get().exists:
            return ref
        # Fallback: previous city-only id without branch suffix.
        _, _, ncity = resolve_location(country, city)
        city_only_ref = db.collection("emissionData").document(company_id).collection(scope).document(
            _scope_storage_doc_id(month, year, ncity, None)
        )
        if city_only_ref.get().exists:
            return city_only_ref
        legacy = db.collection("emissionData").document(company_id).collection(scope).document(str(month))
        if legacy.get().exists:
            return legacy
        return ref
    return _get_scope_doc(db, company_id, scope, year, month, country, city, branch)


def _normalize_doc_month(doc: dict):
    month = doc.get("month")
    if month is None:
        return None
    if isinstance(month, int):
        month = str(month)
    month_str = str(month).strip()
    if not month_str:
        return None
    if "-" in month_str:
        return month_str
    year = doc.get("year")
    try:
        year_int = int(year)
    except (ValueError, TypeError):
        year_int = None
    if year_int and month_str.isdigit():
        return f"{year_int}-{int(month_str):02d}"
    return month_str


def _entry_signature(category: str, entry: dict, month: str):
    normalized = {k: entry.get(k) for k in sorted(entry.keys())}
    return (category, month, json.dumps(normalized, sort_keys=True, default=str))


def _prefer_month_docs(docs: list):
    monthly = [doc for doc in docs if _normalize_doc_month(doc.to_dict())]
    return monthly if monthly else docs


def get_company_and_location(uid: str):
    """Helper to fetch companyId and primary location for the current user."""
    db = get_db()

    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User profile not found.")

    company_id = user_doc.to_dict().get("companyId")
    if not company_id:
        raise HTTPException(status_code=404, detail="No company found. Please complete company setup.")

    company_doc = db.collection("companies").document(company_id).get()
    if not company_doc.exists:
        raise HTTPException(status_code=404, detail="Company not found.")

    company_data = company_doc.to_dict()

    # Get primary location
    locations = company_data.get("locations", [])
    primary = next((loc for loc in locations if loc.get("isPrimary")), locations[0] if locations else None)

    return company_id, company_data, primary


@router.get("/available-locations")
async def get_available_locations_endpoint():
    """
    Get all available locations with their data.
    This helps the frontend populate dropdowns.
    """
    return get_available_locations()


@router.get("/factors/{country}/{city}")
async def get_city_factors(
    country: str,
    city: str
):
    """
    Get all emission factors for a specific city.
    Uses the location resolver to find the correct path.
    """
    region, normalized_country, normalized_city = resolve_location(country, city)
    
    factors = {
        "scope1": get_emission_factors(region, normalized_country, normalized_city, "scope1"),
        "scope2": get_emission_factors(region, normalized_country, normalized_city, "scope2")
    }
    
    if not factors.get("scope1") and not factors.get("scope2"):
        raise HTTPException(status_code=404, detail="No emission factors found for this location")
    
    return {
        "country": get_country_display_name(normalized_country),
        "city": get_city_display_name(normalized_city),
        "region": region,
        "factors": factors
    }


@router.get("/scope1")
async def get_scope1_data(
    year: int = None,
    region: Optional[str] = None,
    filter_month: Optional[str] = Query(None, alias="month"),
    country: Optional[str] = None,
    city: Optional[str] = None,
    branch: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    response: Response = None,
):
    """
    Get existing Scope 1 data for the current user.
    Returns data organized by category for form pre-population.
    Optional query params: month (YYYY-MM), country, city — filter to one facility.
    """
    company_id, _, _ = get_company_and_location(current_user.get("uid"))
    db = get_db()

    # Default to current year if not specified
    target_year = year or datetime.utcnow().year

    # Fetch all scope1 documents for the year
    docs = list(db.collection("emissionData").document(company_id).collection("scope1").where("year", "==", target_year).stream())
    docs = _prefer_month_docs(docs)

    # Organize data by category
    result = {
        "year": target_year,
        "mobile": [],
        "stationary": [],
        "refrigerants": [],
        "fugitive": []
    }
    seen_entries = set()

    for doc in docs:
        data = doc.to_dict()
        if filter_month:
            dm = _normalize_doc_month(data)
            if dm != filter_month:
                continue
        if region or country or city or branch:
            if not _doc_location_matches(data, region, country, city, branch):
                continue
        results = data.get("results", {})
        raw_data = data.get("rawData", {})
        month = _normalize_doc_month(data)

        # Prefer rawData for form hydration; fallback to computed results entries.
        mobile_entries = raw_data.get("mobile") or ((results.get("mobile") or {}).get("entries") or [])
        for entry in mobile_entries:
            signature = _entry_signature("mobile", entry, month)
            if signature in seen_entries:
                continue
            seen_entries.add(signature)
            result["mobile"].append({
                "id": f"{doc.id}_mobile_{len(result['mobile'])}",
                "fuelType": entry.get("fuelType", ""),
                "distanceKm": entry.get("distanceKm"),
                "litresConsumed": entry.get("litresConsumed"),
                "month": month or data.get("month", ""),
                "kgCO2e": entry.get("kgCO2e", 0)
            })

        stationary_entries = raw_data.get("stationary") or ((results.get("stationary") or {}).get("entries") or [])
        for entry in stationary_entries:
            signature = _entry_signature("stationary", entry, month)
            if signature in seen_entries:
                continue
            seen_entries.add(signature)
            result["stationary"].append({
                "id": f"{doc.id}_stationary_{len(result['stationary'])}",
                "fuelType": entry.get("fuelType", ""),
                "consumption": entry.get("consumption", 0),
                "unit": entry.get("unit", ""),
                "month": month or data.get("month", ""),
                "kgCO2e": entry.get("kgCO2e", 0)
            })

        refrigerant_entries = raw_data.get("refrigerants") or ((results.get("refrigerants") or {}).get("entries") or [])
        for entry in refrigerant_entries:
            signature = _entry_signature("refrigerants", entry, month)
            if signature in seen_entries:
                continue
            seen_entries.add(signature)
            result["refrigerants"].append({
                "id": f"{doc.id}_refrigerants_{len(result['refrigerants'])}",
                "refrigerantType": entry.get("refrigerantType", entry.get("gasType", "")),
                "leakageKg": entry.get("leakageKg", entry.get("chargeKg", 0)),
                "month": month or data.get("month", ""),
                "kgCO2e": entry.get("kgCO2e", 0)
            })

        fugitive_entries = raw_data.get("fugitive") or ((results.get("fugitive") or {}).get("entries") or [])
        for entry in fugitive_entries:
            signature = _entry_signature("fugitive", entry, month)
            if signature in seen_entries:
                continue
            seen_entries.add(signature)
            result["fugitive"].append({
                "id": f"{doc.id}_fugitive_{len(result['fugitive'])}",
                "sourceType": entry.get("sourceType", ""),
                "amount": entry.get("amount", entry.get("emissionKg", 0)),
                "emissionKg": entry.get("emissionKg", entry.get("amount", 0)),
                "unit": entry.get("unit", ""),
                "month": month or data.get("month", ""),
                "kgCO2e": entry.get("kgCO2e", 0)
            })

    if response is not None:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return result


@router.get("/scope2")
async def get_scope2_data(
    year: int = None,
    region: Optional[str] = None,
    filter_month: Optional[str] = Query(None, alias="month"),
    country: Optional[str] = None,
    city: Optional[str] = None,
    branch: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    response: Response = None,
):
    """
    Get existing Scope 2 data for the current user.
    Returns data organized by category for form pre-population.
    Optional query params: month (YYYY-MM), country, city — filter to one facility.
    """
    company_id, _, _ = get_company_and_location(current_user.get("uid"))
    db = get_db()

    # Default to current year if not specified
    target_year = year or datetime.utcnow().year

    # Fetch all scope2 documents for the year
    docs = list(db.collection("emissionData").document(company_id).collection("scope2").where("year", "==", target_year).stream())
    docs = _prefer_month_docs(docs)

    # Organize data by category
    result = {
        "year": target_year,
        "electricity": [],
        "heating": [],
        "renewables": []
    }
    seen_entries = set()

    for doc in docs:
        data = doc.to_dict()
        if filter_month:
            dm = _normalize_doc_month(data)
            if dm != filter_month:
                continue
        if region or country or city or branch:
            if not _doc_location_matches(data, region, country, city, branch):
                continue
        results = data.get("results", {})
        raw_data = data.get("rawData", {})
        month = _normalize_doc_month(data)

        # Prefer rawData for form hydration; fallback to computed results entries.
        electricity_entries = raw_data.get("electricity") or ((results.get("electricity") or {}).get("entries") or [])
        for entry in electricity_entries:
            signature = _entry_signature("electricity", entry, month)
            if signature in seen_entries:
                continue
            seen_entries.add(signature)
            result["electricity"].append({
                "id": f"{doc.id}_electricity_{len(result['electricity'])}",
                "consumption": entry.get("consumptionKwh", 0),
                "certificateType": entry.get("certificateType", "grid_average"),
                "certificateLabel": entry.get("certificateLabel", "Grid Average"),
                "method": entry.get("method", "location"),
                "month": month or data.get("month", ""),
                "kgCO2e": entry.get("kgCO2e", 0)
            })

        heating_entries = raw_data.get("heating") or ((results.get("heating") or {}).get("entries") or [])
        for entry in heating_entries:
            signature = _entry_signature("heating", entry, month)
            if signature in seen_entries:
                continue
            seen_entries.add(signature)
            result["heating"].append({
                "id": f"{doc.id}_heating_{len(result['heating'])}",
                "energyType": entry.get("energyType", ""),
                "consumption": entry.get("consumptionKwh", 0),
                "month": month or data.get("month", ""),
                "kgCO2e": entry.get("kgCO2e", 0)
            })

        renewable_entries = raw_data.get("renewables") or ((results.get("renewables") or {}).get("entries") or [])
        for entry in renewable_entries:
            signature = _entry_signature("renewables", entry, month)
            if signature in seen_entries:
                continue
            seen_entries.add(signature)
            result["renewables"].append({
                "id": f"{doc.id}_renewables_{len(result['renewables'])}",
                "sourceType": entry.get("sourceType", ""),
                "consumption": entry.get("generationKwh", 0),
                "month": month or data.get("month", ""),
                "kgCO2e": entry.get("kgCO2e", 0)
            })

    if response is not None:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return result


@router.post("/scope1")
async def save_scope1(
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Save Scope 1 emission data and calculate tCO2e.

    Expected body:
    {
        "year": 2026,
        "month": "2026-01",   // optional
        "region": "middle-east",
        "country": "uae",
        "city": "dubai",
        "mobile": [
            {"fuelType": "petrol_car", "distanceKm": 500}
        ],
        "stationary": [
            {"fuelType": "natural_gas", "consumption": 1000}
        ],
        "refrigerants": [
            {"refrigerantType": "r410a", "leakageKg": 2.5}
        ],
        "fugitive": [
            {"sourceType": "methane", "emissionKg": 1.0}
        ]
    }
    """
    db = get_db()
    uid = current_user.get("uid")

    try:
        company_id, company_data, primary_location = get_company_and_location(uid)

        # Use provided location or fall back to company primary location
        region = body.get("region", "middle-east")
        country = body.get("country", "uae")
        city = body.get("city", primary_location.get("city", "dubai").lower() if primary_location else "dubai")
        branch = body.get("branch", primary_location.get("branch", "") if primary_location else "")
        year = body.get("year", company_data.get("basicInfo", {}).get("fiscalYear", 2026))
        month = body.get("month")

        resolved_region, normalized_country, normalized_city = resolve_location(country, city)
        if region:
            resolved_region = region

        # Calculate emissions
        results = calculate_scope1(body, resolved_region, normalized_country, normalized_city)

        # #region agent log H14
        _append_agent_log(
            hypothesisId="H14",
            location="backend/app/routes/emissions.py:save_scope1",
            message="Calculated Scope1 stored results (mobile totals + factorUsed)",
            data={
                "year": year,
                "month": month,
                "location": {"region": resolved_region, "country": normalized_country, "city": normalized_city},
                "inputMobileCount": len(body.get("mobile", []) or []),
                "firstInputMobile": (body.get("mobile", []) or [None])[0],
                "calculatedMobileTotalKgCO2e": (results.get("mobile") or {}).get("totalKgCO2e"),
                "firstCalculatedMobileEntry": (results.get("mobile", {}).get("entries", []) or [None])[0],
                "grandTotalKgCO2e": results.get("totalKgCO2e"),
            },
            runId="pre-fix",
        )
        # #endregion

        # Save to Firestore (per normalized city so multiple facilities can use the same month)
        doc_id = _scope_storage_doc_id(month, year, normalized_city, branch)
        doc_ref = db.collection("emissionData").document(company_id).collection("scope1").document(doc_id)
        doc_ref.set({
            "companyId": company_id,
            "year": year,
            "month": month,
            "region": resolved_region,
            "country": normalized_country,
            "city": normalized_city,
            "branch": branch,
            "rawData": {
                "mobile": body.get("mobile", []),
                "stationary": body.get("stationary", []),
                "refrigerants": body.get("refrigerants", []),
                "fugitive": body.get("fugitive", []),
            },
            "results": results,
            "savedAt": datetime.utcnow().isoformat(),
        })

        if month:
            legacy_ref = db.collection("emissionData").document(company_id).collection("scope1").document(str(month))
            leg = legacy_ref.get()
            if leg.exists and leg.id == str(month):
                ld = leg.to_dict()
                if _doc_location_matches(ld, resolved_region, normalized_country, normalized_city, branch):
                    legacy_ref.delete()

        return {
            "message": "Scope 1 data saved successfully.",
            "results": results,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save Scope 1 data: {str(e)}")


@router.post("/scope2")
async def save_scope2(
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Save Scope 2 emission data and calculate tCO2e.

    Expected body:
    {
        "year": 2026,
        "month": "2026-01",
        "region": "middle-east",
        "country": "uae",
        "city": "dubai",
        "electricity": [
            {"facilityName": "HQ", "consumptionKwh": 50000, "method": "location"}
        ],
        "heating": [
            {"energyType": "steam_hot_water", "consumptionKwh": 1000}
        ],
        "renewables": [
            {"sourceType": "solar_ppa", "generationKwh": 5000}
        ]
    }
    """
    db = get_db()
    uid = current_user.get("uid")

    try:
        company_id, company_data, primary_location = get_company_and_location(uid)

        region = body.get("region", "middle-east")
        country = body.get("country", "uae")
        city = body.get("city", primary_location.get("city", "dubai").lower() if primary_location else "dubai")
        branch = body.get("branch", primary_location.get("branch", "") if primary_location else "")
        year = body.get("year", company_data.get("basicInfo", {}).get("fiscalYear", 2026))
        month = body.get("month")

        resolved_region, normalized_country, normalized_city = resolve_location(country, city)
        if region:
            resolved_region = region

        # Calculate emissions
        results = calculate_scope2(body, resolved_region, normalized_country, normalized_city)

        # #region agent log H3
        _append_agent_log(
            hypothesisId="H3",
            location="backend/app/routes/emissions.py:save_scope2",
            message="Calculated Scope 2 results (shape + totals)",
            data={
                "resultsKeys": list(results.keys()),
                "locationBasedKgCO2e": results.get("locationBasedKgCO2e"),
                "marketBasedKgCO2e": results.get("marketBasedKgCO2e"),
                "electricityKeys": list((results.get("electricity") or {}).keys()),
                "electricityTotalKgCO2e": (results.get("electricity") or {}).get("totalKgCO2e"),
            },
            runId="pre-fix",
        )
        # #endregion

        # Save to Firestore (per normalized city so multiple facilities can use the same month)
        doc_id = _scope_storage_doc_id(month, year, normalized_city, branch)
        doc_ref = db.collection("emissionData").document(company_id).collection("scope2").document(doc_id)
        doc_ref.set({
            "companyId": company_id,
            "year": year,
            "month": month,
            "region": resolved_region,
            "country": normalized_country,
            "city": normalized_city,
            "branch": branch,
            "rawData": {
                "electricity": body.get("electricity", []),
                "heating": body.get("heating", []),
                "renewables": body.get("renewables", []),
            },
            "results": results,
            "savedAt": datetime.utcnow().isoformat(),
        })

        if month:
            legacy_ref = db.collection("emissionData").document(company_id).collection("scope2").document(str(month))
            leg = legacy_ref.get()
            if leg.exists and leg.id == str(month):
                ld = leg.to_dict()
                if _doc_location_matches(ld, resolved_region, normalized_country, normalized_city, branch):
                    legacy_ref.delete()

        return {
            "message": "Scope 2 data saved successfully.",
            "results": results,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save Scope 2 data: {str(e)}")


@router.delete("/scope1")
async def delete_scope1_entry(
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    uid = current_user.get("uid")

    try:
        company_id, company_data, primary_location = get_company_and_location(uid)
        year = body.get("year", company_data.get("basicInfo", {}).get("fiscalYear", datetime.utcnow().year))
        month = body.get("month")
        category = body.get("category")
        entry = body.get("entry") or {}
        country = body.get("country") or (primary_location.get("country") if primary_location else "uae")
        city = body.get("city") or (primary_location.get("city") if primary_location else "dubai")
        branch = body.get("branch") or (primary_location.get("branch") if primary_location else "")

        if category not in ["mobile", "stationary", "refrigerants", "fugitive"]:
            raise HTTPException(status_code=400, detail="Invalid Scope 1 category")

        doc_ref = _get_scope_doc_resolve(db, company_id, "scope1", year, month, country, city, branch)
        doc = doc_ref.get()
        if not doc.exists:
            # Idempotent delete: if data is already absent, report success.
            return {
                "message": "Scope 1 entry already absent.",
                "results": {},
            }

        data = doc.to_dict()
        raw_data = data.get("rawData", {})
        rows = raw_data.get(category, []) or []

        updated_rows, removed = _remove_matching_entry(rows, entry, lambda candidate, target: _match_scope1_entry(candidate, target, category))
        if not removed:
            # Idempotent delete: treat missing row as already deleted.
            return {
                "message": "Scope 1 entry already absent.",
                "results": data.get("results", {}),
            }

        raw_data[category] = updated_rows
        payload = {
            "year": year,
            "month": month,
            "region": data.get("region", "middle-east"),
            "country": data.get("country", "uae"),
            "city": data.get("city", "dubai"),
            "mobile": raw_data.get("mobile", []),
            "stationary": raw_data.get("stationary", []),
            "refrigerants": raw_data.get("refrigerants", []),
            "fugitive": raw_data.get("fugitive", []),
        }

        results = calculate_scope1(payload, payload["region"], payload["country"], payload["city"])

        doc_ref.set({
            "companyId": company_id,
            "year": year,
            "month": month,
            "region": payload.get("region"),
            "country": payload.get("country"),
            "city": payload.get("city"),
            "branch": data.get("branch", branch),
            "rawData": raw_data,
            "results": results,
            "savedAt": datetime.utcnow().isoformat(),
        })

        return {
            "message": "Scope 1 entry deleted successfully.",
            "results": results,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete Scope 1 entry: {str(e)}")


@router.delete("/scope2")
async def delete_scope2_entry(
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    uid = current_user.get("uid")

    try:
        company_id, company_data, primary_location = get_company_and_location(uid)
        year = body.get("year", company_data.get("basicInfo", {}).get("fiscalYear", datetime.utcnow().year))
        month = body.get("month")
        category = body.get("category")
        entry = body.get("entry") or {}
        country = body.get("country") or (primary_location.get("country") if primary_location else "uae")
        city = body.get("city") or (primary_location.get("city") if primary_location else "dubai")
        branch = body.get("branch") or (primary_location.get("branch") if primary_location else "")

        if category not in ["electricity", "heating", "renewables"]:
            raise HTTPException(status_code=400, detail="Invalid Scope 2 category")

        doc_ref = _get_scope_doc_resolve(db, company_id, "scope2", year, month, country, city, branch)
        doc = doc_ref.get()
        if not doc.exists:
            # Idempotent delete: if data is already absent, report success.
            return {
                "message": "Scope 2 entry already absent.",
                "results": {},
            }

        data = doc.to_dict()
        raw_data = data.get("rawData", {})
        rows = raw_data.get(category, []) or []

        updated_rows, removed = _remove_matching_entry(rows, entry, lambda candidate, target: _match_scope2_entry(candidate, target, category))
        if not removed:
            # Idempotent delete: treat missing row as already deleted.
            return {
                "message": "Scope 2 entry already absent.",
                "results": data.get("results", {}),
            }

        raw_data[category] = updated_rows
        payload = {
            "year": year,
            "month": month,
            "region": data.get("region", "middle-east"),
            "country": data.get("country", "uae"),
            "city": data.get("city", "dubai"),
            "electricity": raw_data.get("electricity", []),
            "heating": raw_data.get("heating", []),
            "renewables": raw_data.get("renewables", []),
        }

        results = calculate_scope2(payload, payload["region"], payload["country"], payload["city"])

        doc_ref.set({
            "companyId": company_id,
            "year": year,
            "month": month,
            "region": payload.get("region"),
            "country": payload.get("country"),
            "city": payload.get("city"),
            "branch": data.get("branch", branch),
            "rawData": raw_data,
            "results": results,
            "savedAt": datetime.utcnow().isoformat(),
        })

        return {
            "message": "Scope 2 entry deleted successfully.",
            "results": results,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete Scope 2 entry: {str(e)}")


@router.get("/monthly-breakdown")
async def get_monthly_breakdown(
    year: int,
    region: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    branch: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    response: Response = None,
):
    """
    Get monthly breakdown of Scope 1 and Scope 2 emissions for the year.
    Returns data for all 12 months with zeros for missing months.
    Optional country + city filter one facility; omit for company-wide totals.
    """
    uid = current_user.get("uid")
    company_id, _, _ = get_company_and_location(uid)
    db = get_db()

    # Get scope1 docs
    s1_ref = db.collection("emissionData").document(company_id).collection("scope1")
    s1_docs = [doc.to_dict() for doc in s1_ref.stream() if _is_month_in_fiscal_year(doc.to_dict().get("month"), year)]
    if region or country or city or branch:
        s1_docs = [d for d in s1_docs if _doc_location_matches(d, region, country, city, branch)]

    # Get scope2 docs
    s2_ref = db.collection("emissionData").document(company_id).collection("scope2")
    s2_docs = [doc.to_dict() for doc in s2_ref.stream() if _is_month_in_fiscal_year(doc.to_dict().get("month"), year)]
    if region or country or city or branch:
        s2_docs = [d for d in s2_docs if _doc_location_matches(d, region, country, city, branch)]

    # Create monthly data map
    monthly_data = {}

    # Helper to get total kg from doc
    def get_doc_total_kg(doc):
        res = doc.get("results", {})
        if "totalKgCO2e" in res:
            return float(res.get("totalKgCO2e", 0))
        return float(res.get("locationBasedKgCO2e", 0))

    # Process Scope 1 docs
    for doc in s1_docs:
        doc_month = doc.get("month")
        if doc_month:
            if doc_month not in monthly_data:
                monthly_data[doc_month] = {"scope1_kg": 0, "scope2_kg": 0, "has_data": False}
            monthly_data[doc_month]["scope1_kg"] += get_doc_total_kg(doc)
            monthly_data[doc_month]["has_data"] = True

    # Process Scope 2 docs
    for doc in s2_docs:
        doc_month = doc.get("month")
        if doc_month:
            if doc_month not in monthly_data:
                monthly_data[doc_month] = {"scope1_kg": 0, "scope2_kg": 0, "has_data": False}
            monthly_data[doc_month]["scope2_kg"] += get_doc_total_kg(doc)
            monthly_data[doc_month]["has_data"] = True

    # Convert to list and ensure all 12 months are present
    result = []
    for _, _, month_str in _iter_fiscal_months(year):
        data = monthly_data.get(month_str, {"scope1_kg": 0, "scope2_kg": 0, "has_data": False})
        result.append({
            "month": month_str,
            "scope1Kg": round(data.get("scope1_kg", 0), 2),
            "scope2Kg": round(data.get("scope2_kg", 0), 2),
            "hasData": data.get("has_data", False),
        })

    if response is not None:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return result


@router.get("/monthly-category-breakdown")
async def get_monthly_category_breakdown(
    year: int,
    scope: str,  # "scope1" or "scope2"
    region: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    branch: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    response: Response = None,
):
    """
    Get monthly breakdown of emissions by category for a specific scope.
    Optional country + city filter one facility.
    """
    uid = current_user.get("uid")
    company_id, _, _ = get_company_and_location(uid)
    db = get_db()

    # Fetch all docs for the year
    ref = db.collection("emissionData").document(company_id).collection(scope)
    docs = [doc.to_dict() for doc in ref.stream() if _is_month_in_fiscal_year(doc.to_dict().get("month"), year)]
    if region or country or city or branch:
        docs = [d for d in docs if _doc_location_matches(d, region, country, city, branch)]
    
    # Create monthly data map
    monthly_data = {}
    
    for doc in docs:
        month = doc.get("month")
        if not month:
            continue
            
        if month not in monthly_data:
            monthly_data[month] = {"hasData": False}
            
        results = doc.get("results", {})
        monthly_data[month]["hasData"] = True
        
        if scope == "scope1":
            monthly_data[month]["mobileKg"] = monthly_data[month].get("mobileKg", 0) + results.get("mobile", {}).get("totalKgCO2e", 0)
            monthly_data[month]["stationaryKg"] = monthly_data[month].get("stationaryKg", 0) + results.get("stationary", {}).get("totalKgCO2e", 0)
            monthly_data[month]["refrigerantsKg"] = monthly_data[month].get("refrigerantsKg", 0) + results.get("refrigerants", {}).get("totalKgCO2e", 0)
            monthly_data[month]["fugitiveKg"] = monthly_data[month].get("fugitiveKg", 0) + results.get("fugitive", {}).get("totalKgCO2e", 0)
            mobile_entries = ((doc.get("rawData") or {}).get("mobile") or [])
            month_vehicle_count = sum(float(e.get("vehicleCount") or 0) for e in mobile_entries if isinstance(e, dict))
            monthly_data[month]["mobileVehicleCount"] = monthly_data[month].get("mobileVehicleCount", 0) + month_vehicle_count
        else:
            monthly_data[month]["electricityLocationKg"] = monthly_data[month].get("electricityLocationKg", 0) + results.get("electricity", {}).get("locationBasedKgCO2e", 0)
            monthly_data[month]["electricityMarketKg"] = monthly_data[month].get("electricityMarketKg", 0) + results.get("electricity", {}).get("marketBasedKgCO2e", 0)
            monthly_data[month]["heatingKg"] = monthly_data[month].get("heatingKg", 0) + results.get("heating", {}).get("totalKgCO2e", 0)
    
    # Build response for all 12 months
    result = []
    for _, _, month_str in _iter_fiscal_months(year):
        data = monthly_data.get(month_str, {})
        result.append({
            "month": month_str,
            "hasData": data.get("hasData", False),
            **{k: v for k, v in data.items() if k != "hasData"}
        })
    
    if response is not None:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return result

@router.get("/sparkline-data")
async def get_sparkline_data(
    region: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    branch: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Get sparkline data for the last 6 months for each category.
    Optional country + city filter one facility.
    """
    uid = current_user.get("uid")
    company_id, _, _ = get_company_and_location(uid)
    db = get_db()
    
    # Get last 6 months
    months = []
    now = datetime.utcnow()
    for i in range(5, -1, -1):
        date = datetime(now.year, now.month - i, 1)
        months.append(f"{date.year}-{date.month:02d}")
    
    # Fetch scope1 and scope2 docs for these months
    result = {
        "mobile": {},
        "stationary": {},
        "refrigerants": {},
        "fugitive": {},
        "electricityLocation": {},
        "electricityMarket": {}
    }
    
    s1_ref = db.collection("emissionData").document(company_id).collection("scope1")
    s2_ref = db.collection("emissionData").document(company_id).collection("scope2")

    for month in months:
        m_mobile = m_stat = m_ref = m_fug = 0.0
        for doc in s1_ref.stream():
            data = doc.to_dict()
            if _normalize_doc_month(data) != month:
                continue
            if region or country or city or branch:
                if not _doc_location_matches(data, region, country, city, branch):
                    continue
            res = data.get("results", {})
            m_mobile += res.get("mobile", {}).get("totalKgCO2e", 0) or 0
            m_stat += res.get("stationary", {}).get("totalKgCO2e", 0) or 0
            m_ref += res.get("refrigerants", {}).get("totalKgCO2e", 0) or 0
            m_fug += res.get("fugitive", {}).get("totalKgCO2e", 0) or 0
        result["mobile"][month] = m_mobile
        result["stationary"][month] = m_stat
        result["refrigerants"][month] = m_ref
        result["fugitive"][month] = m_fug

        eloc = emkt = 0.0
        for doc in s2_ref.stream():
            data = doc.to_dict()
            if _normalize_doc_month(data) != month:
                continue
            if region or country or city or branch:
                if not _doc_location_matches(data, region, country, city, branch):
                    continue
            res = data.get("results", {})
            eloc += res.get("electricity", {}).get("locationBasedKgCO2e", 0) or 0
            emkt += res.get("electricity", {}).get("marketBasedKgCO2e", 0) or 0
        result["electricityLocation"][month] = eloc
        result["electricityMarket"][month] = emkt
    
    return result

@router.get("/month-status")
async def get_month_status(
    year: int,
    region: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    branch: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    response: Response = None,
):
    """
    Get submission status for each month of the year.
    Returns: { "0": "both", "1": "scope1", "2": "none", ... }
    Optional country + city filter one facility.
    """
    db = get_db()
    uid = current_user.get("uid")
    company_id, _, _ = get_company_and_location(uid)

    fiscal_months = _iter_fiscal_months(year)
    month_to_index = {month_str: idx for idx, (_, _, month_str) in enumerate(fiscal_months)}
    status = {str(i): "none" for i in range(12)}

    # Check scope1 docs
    s1_ref = db.collection("emissionData").document(company_id).collection("scope1")
    s1_docs = s1_ref.stream()

    for doc in s1_docs:
        data = doc.to_dict()
        if region or country or city or branch:
            if not _doc_location_matches(data, region, country, city, branch):
                continue
        month_str = data.get("month")
        if month_str in month_to_index:
            month_num = month_to_index[month_str]
            if status[str(month_num)] == "none":
                status[str(month_num)] = "scope1"
            elif status[str(month_num)] == "scope2":
                status[str(month_num)] = "both"

    # Check scope2 docs
    s2_ref = db.collection("emissionData").document(company_id).collection("scope2")
    s2_docs = s2_ref.stream()

    for doc in s2_docs:
        data = doc.to_dict()
        if region or country or city or branch:
            if not _doc_location_matches(data, region, country, city, branch):
                continue
        month_str = data.get("month")
        if month_str in month_to_index:
            month_num = month_to_index[month_str]
            if status[str(month_num)] == "none":
                status[str(month_num)] = "scope2"
            elif status[str(month_num)] == "scope1":
                status[str(month_num)] = "both"

    if response is not None:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return status

@router.get("/summary")
async def get_summary(
    year: int = 2026,
    region: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    branch: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    response: Response = None,
):
    """
    Return aggregated Scope 1 + Scope 2 totals for a given year.
    Optional country + city filter one facility; omit for company-wide totals.
    """
    db = get_db()
    uid = current_user.get("uid")

    try:
        company_id, _, _ = get_company_and_location(uid)

        scope1_total = 0.0
        scope2_location_total = 0.0
        scope2_market_total = 0.0
        scope1_breakdown = {}
        scope2_breakdown = {}

        # Aggregate Scope 1
        scope1_docs = db.collection("emissionData").document(company_id).collection("scope1").stream()
        scope1_doc_logged = False
        for doc in scope1_docs:
            data = doc.to_dict()
            if region or country or city or branch:
                if not _doc_location_matches(data, region, country, city, branch):
                    continue
            if _is_month_in_fiscal_year(data.get("month"), year):
                results = data.get("results", {})
                scope1_total += results.get("totalKgCO2e", 0)
                for category in ["mobile", "stationary", "refrigerants", "fugitive"]:
                    cat_total = results.get(category, {}).get("totalKgCO2e", 0)
                    scope1_breakdown[category] = scope1_breakdown.get(category, 0) + cat_total

                # #region agent log H13
                if not scope1_doc_logged:
                    scope1_doc_logged = True
                    _append_agent_log(
                        hypothesisId="H13",
                        location="backend/app/routes/emissions.py:get_summary",
                        message="First matching Scope1 doc used for summary aggregation",
                        data={
                            "requestedYear": year,
                            "docId": doc.id,
                            "docYear": data.get("year"),
                            "resultsKeys": list((results or {}).keys()),
                            "resultsTotalKgCO2e": results.get("totalKgCO2e"),
                            "resultsMobileTotalKgCO2e": (results.get("mobile") or {}).get("totalKgCO2e"),
                            "resultsMobileEntriesCount": len((results.get("mobile") or {}).get("entries", []) or []),
                            "resultsMobileFirstEntry": ((results.get("mobile") or {}).get("entries", []) or [None])[0],
                            "scope1_breakdown_soFar": scope1_breakdown,
                        },
                        runId="pre-fix",
                    )
                # #endregion

        # #region agent log H11
        _append_agent_log(
            hypothesisId="H11",
            location="backend/app/routes/emissions.py:get_summary",
            message="Scope1 aggregation final totals (post scope1 loop)",
            data={
                "scope1_total_used_totalKgCO2e": scope1_total,
                "scope1_breakdown": scope1_breakdown,
            },
            runId="pre-fix",
        )
        # #endregion

        # Aggregate Scope 2
        scope2_docs = db.collection("emissionData").document(company_id).collection("scope2").stream()
        scope2_doc_logged = False
        for doc in scope2_docs:
            data = doc.to_dict()
            if region or country or city or branch:
                if not _doc_location_matches(data, region, country, city, branch):
                    continue
            if _is_month_in_fiscal_year(data.get("month"), year):
                results = data.get("results", {})
                used_location_totalKgCO2e = results.get("locationBasedKgCO2e", 0)
                used_market_totalKgCO2e = results.get("marketBasedKgCO2e", 0)
                scope2_location_total += used_location_totalKgCO2e
                scope2_market_total += used_market_totalKgCO2e

                # Breakdown is reported as "location-based" category totals
                electricity_location = (results.get("electricity") or {}).get("locationBasedKgCO2e", 0)
                heating_total = (results.get("heating") or {}).get("totalKgCO2e", 0)
                renewables_total = (results.get("renewables") or {}).get("totalKgCO2e", 0)

                scope2_breakdown["electricity"] = scope2_breakdown.get("electricity", 0) + electricity_location
                scope2_breakdown["heating"] = scope2_breakdown.get("heating", 0) + heating_total
                scope2_breakdown["renewables"] = scope2_breakdown.get("renewables", 0) + renewables_total

                # #region agent log H1
                if not scope2_doc_logged:
                    scope2_doc_logged = True
                    _append_agent_log(
                        hypothesisId="H1",
                        location="backend/app/routes/emissions.py:get_summary",
                        message="Scope 2 aggregation uses missing fields?",
                        data={
                            "documentId": doc.id,
                            "resultsKeys": list(results.keys()),
                            "usedLocationBasedKgCO2e": used_location_totalKgCO2e,
                            "usedMarketBasedKgCO2e": used_market_totalKgCO2e,
                            "locationBasedKgCO2e": results.get("locationBasedKgCO2e"),
                            "marketBasedKgCO2e": results.get("marketBasedKgCO2e"),
                            "electricityKeys": list((results.get("electricity") or {}).keys()),
                            "electricityLocationBasedKgCO2e": (results.get("electricity") or {}).get("locationBasedKgCO2e"),
                            "breakdownElectricity_soFar": scope2_breakdown.get("electricity"),
                        },
                        runId="pre-fix",
                    )
                # #endregion

        grand_total_kg = scope1_total + scope2_location_total

        # #region agent log H1
        _append_agent_log(
            hypothesisId="H1",
            location="backend/app/routes/emissions.py:get_summary",
            message="Scope 2 aggregation final totals (post-loop)",
            data={
                "scope2_location_total_used_locationBasedKgCO2e": scope2_location_total,
                "scope2_market_total_used_marketBasedKgCO2e": scope2_market_total,
                "scope2_breakdown": scope2_breakdown,
            },
            runId="pre-fix",
        )
        # #endregion

        if response is not None:
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"

        return {
            "year": year,
            "scope1": {
                "totalKgCO2e": round(scope1_total, 4),
                "totalTonneCO2e": round(scope1_total / 1000, 6),
                "breakdown": scope1_breakdown,
            },
            "scope2": {
                "locationBasedKgCO2e": round(scope2_location_total, 4),
                "marketBasedKgCO2e": round(scope2_market_total, 4),
                # Backward-compat total fields (location-based)
                "totalKgCO2e": round(scope2_location_total, 4),
                "totalTonneCO2e": round(scope2_location_total / 1000, 6),
                "breakdown": scope2_breakdown,
            },
            "total": {
                "totalKgCO2e": round(grand_total_kg, 4),
                "totalTonneCO2e": round(grand_total_kg / 1000, 6),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch summary: {str(e)}")