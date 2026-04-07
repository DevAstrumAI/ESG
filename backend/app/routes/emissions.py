from fastapi import APIRouter, HTTPException, status, Depends
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


def _get_scope_doc(db, company_id: str, scope: str, year: int, month: str):
    doc_id = month if month else f"{year}-annual"
    return db.collection("emissionData").document(company_id).collection(scope).document(doc_id)


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
    current_user: dict = Depends(get_current_user),
):
    """
    Get existing Scope 1 data for the current user.
    Returns data organized by category for form pre-population.
    """
    company_id, _, _ = get_company_and_location(current_user.get("uid"))
    db = get_db()

    # Default to current year if not specified
    target_year = year or datetime.utcnow().year

    # Fetch all scope1 documents for the year
    docs = db.collection("emissionData").document(company_id).collection("scope1").where("year", "==", target_year).stream()

    # Organize data by category
    result = {
        "year": target_year,
        "mobile": [],
        "stationary": [],
        "refrigerants": [],
        "fugitive": []
    }

    for doc in docs:
        data = doc.to_dict()
        results = data.get("results", {})

        # Extract entries from results
        if "mobile" in results and "entries" in results["mobile"]:
            for entry in results["mobile"]["entries"]:
                result["mobile"].append({
                    "id": f"{doc.id}_mobile_{len(result['mobile'])}",
                    "fuelType": entry.get("fuelType", ""),
                    "distanceKm": entry.get("distanceKm"),
                    "litresConsumed": entry.get("litresConsumed"),
                    "month": data.get("month", ""),
                    "kgCO2e": entry.get("kgCO2e", 0)
                })

        if "stationary" in results and "entries" in results["stationary"]:
            for entry in results["stationary"]["entries"]:
                result["stationary"].append({
                    "id": f"{doc.id}_stationary_{len(result['stationary'])}",
                    "fuelType": entry.get("fuelType", ""),
                    "consumption": entry.get("consumption", 0),
                    "unit": entry.get("unit", ""),
                    "month": data.get("month", ""),
                    "kgCO2e": entry.get("kgCO2e", 0)
                })

        if "refrigerants" in results and "entries" in results["refrigerants"]:
            for entry in results["refrigerants"]["entries"]:
                result["refrigerants"].append({
                    "id": f"{doc.id}_refrigerants_{len(result['refrigerants'])}",
                    "gasType": entry.get("gasType", ""),
                    "chargeKg": entry.get("chargeKg", 0),
                    "month": data.get("month", ""),
                    "kgCO2e": entry.get("kgCO2e", 0)
                })

        if "fugitive" in results and "entries" in results["fugitive"]:
            for entry in results["fugitive"]["entries"]:
                result["fugitive"].append({
                    "id": f"{doc.id}_fugitive_{len(result['fugitive'])}",
                    "sourceType": entry.get("sourceType", ""),
                    "amount": entry.get("amount", 0),
                    "unit": entry.get("unit", ""),
                    "month": data.get("month", ""),
                    "kgCO2e": entry.get("kgCO2e", 0)
                })

    return result


@router.get("/scope2")
async def get_scope2_data(
    year: int = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Get existing Scope 2 data for the current user.
    Returns data organized by category for form pre-population.
    """
    company_id, _, _ = get_company_and_location(current_user.get("uid"))
    db = get_db()

    # Default to current year if not specified
    target_year = year or datetime.utcnow().year

    # Fetch all scope2 documents for the year
    docs = db.collection("emissionData").document(company_id).collection("scope2").where("year", "==", target_year).stream()

    # Organize data by category
    result = {
        "year": target_year,
        "electricity": [],
        "heating": [],
        "renewables": []
    }

    for doc in docs:
        data = doc.to_dict()
        results = data.get("results", {})

        # Extract entries from results
        if "electricity" in results and "entries" in results["electricity"]:
            for entry in results["electricity"]["entries"]:
                result["electricity"].append({
                    "id": f"{doc.id}_electricity_{len(result['electricity'])}",
                    "consumption": entry.get("consumptionKwh", 0),
                    "certificateType": entry.get("certificateType", "grid_average"),
                    "certificateLabel": entry.get("certificateLabel", "Grid Average"),
                    "method": entry.get("method", "location"),
                    "month": data.get("month", ""),
                    "kgCO2e": entry.get("kgCO2e", 0)
                })

        if "heating" in results and "entries" in results["heating"]:
            for entry in results["heating"]["entries"]:
                result["heating"].append({
                    "id": f"{doc.id}_heating_{len(result['heating'])}",
                    "energyType": entry.get("energyType", ""),
                    "consumption": entry.get("consumptionKwh", 0),
                    "month": data.get("month", ""),
                    "kgCO2e": entry.get("kgCO2e", 0)
                })

        if "renewables" in results and "entries" in results["renewables"]:
            for entry in results["renewables"]["entries"]:
                result["renewables"].append({
                    "id": f"{doc.id}_renewables_{len(result['renewables'])}",
                    "sourceType": entry.get("sourceType", ""),
                    "consumption": entry.get("generationKwh", 0),
                    "month": data.get("month", ""),
                    "kgCO2e": entry.get("kgCO2e", 0)
                })

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
        year = body.get("year", company_data.get("basicInfo", {}).get("fiscalYear", 2026))
        month = body.get("month")

        # Calculate emissions
        results = calculate_scope1(body, region, country, city)

        # #region agent log H14
        _append_agent_log(
            hypothesisId="H14",
            location="backend/app/routes/emissions.py:save_scope1",
            message="Calculated Scope1 stored results (mobile totals + factorUsed)",
            data={
                "year": year,
                "month": month,
                "location": {"region": region, "country": country, "city": city},
                "inputMobileCount": len(body.get("mobile", []) or []),
                "firstInputMobile": (body.get("mobile", []) or [None])[0],
                "calculatedMobileTotalKgCO2e": (results.get("mobile") or {}).get("totalKgCO2e"),
                "firstCalculatedMobileEntry": (results.get("mobile", {}).get("entries", []) or [None])[0],
                "grandTotalKgCO2e": results.get("totalKgCO2e"),
            },
            runId="pre-fix",
        )
        # #endregion

        # Save to Firestore
        doc_id = f"{month}" if month else f"{year}-annual"
        db.collection("emissionData").document(company_id).collection("scope1").document(doc_id).set({
            "companyId": company_id,
            "year": year,
            "month": month,
            "region": region,
            "country": country,
            "city": city,
            "rawData": {
                "mobile": body.get("mobile", []),
                "stationary": body.get("stationary", []),
                "refrigerants": body.get("refrigerants", []),
                "fugitive": body.get("fugitive", []),
            },
            "results": results,
            "savedAt": datetime.utcnow().isoformat(),
        })

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
        year = body.get("year", company_data.get("basicInfo", {}).get("fiscalYear", 2026))
        month = body.get("month")

        # Calculate emissions
        results = calculate_scope2(body, region, country, city)

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

        # Save to Firestore
        doc_id = f"{month}" if month else f"{year}-annual"
        db.collection("emissionData").document(company_id).collection("scope2").document(doc_id).set({
            "companyId": company_id,
            "year": year,
            "month": month,
            "region": region,
            "country": country,
            "city": city,
            "rawData": {
                "electricity": body.get("electricity", []),
                "heating": body.get("heating", []),
                "renewables": body.get("renewables", []),
            },
            "results": results,
            "savedAt": datetime.utcnow().isoformat(),
        })

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

        if category not in ["mobile", "stationary", "refrigerants", "fugitive"]:
            raise HTTPException(status_code=400, detail="Invalid Scope 1 category")

        doc_ref = _get_scope_doc(db, company_id, "scope1", year, month)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Scope 1 data not found")

        data = doc.to_dict()
        raw_data = data.get("rawData", {})
        rows = raw_data.get(category, []) or []

        updated_rows, removed = _remove_matching_entry(rows, entry, lambda candidate, target: _match_scope1_entry(candidate, target, category))
        if not removed:
            raise HTTPException(status_code=404, detail="No matching Scope 1 entry found")

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

        if category not in ["electricity", "heating", "renewables"]:
            raise HTTPException(status_code=400, detail="Invalid Scope 2 category")

        doc_ref = _get_scope_doc(db, company_id, "scope2", year, month)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Scope 2 data not found")

        data = doc.to_dict()
        raw_data = data.get("rawData", {})
        rows = raw_data.get(category, []) or []

        updated_rows, removed = _remove_matching_entry(rows, entry, lambda candidate, target: _match_scope2_entry(candidate, target, category))
        if not removed:
            raise HTTPException(status_code=404, detail="No matching Scope 2 entry found")

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


@router.get("/summary")
async def get_summary(
    year: int = 2026,
    current_user: dict = Depends(get_current_user)
):
    """
    Return aggregated Scope 1 + Scope 2 totals for a given year.
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
            if data.get("year") == year:
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
            if data.get("year") == year:
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