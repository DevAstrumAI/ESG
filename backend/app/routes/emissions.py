from fastapi import APIRouter, HTTPException, status, Depends, Request
from app.middleware.auth import get_current_user
from app.utils.firebase import get_db
from app.services.calculator import calculate_scope1, calculate_scope2, get_emission_factors
from app.utils.location_resolver import resolve_location, get_available_locations, get_country_display_name, get_city_display_name
from datetime import datetime
import json

router = APIRouter(tags=["Emissions"])


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

    locations = company_data.get("locations", [])
    primary = next((loc for loc in locations if loc.get("isPrimary")), locations[0] if locations else None)

    return company_id, company_data, primary


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
    doc_id = str(month) if month is not None and month != "" else f"{year}-annual"
    return db.collection("emissionData").document(company_id).collection(scope).document(doc_id)


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


# ============ AVAILABLE LOCATIONS ============

@router.get("/available-locations")
async def get_available_locations_endpoint():
    """Get all available locations with their data."""
    return get_available_locations()


@router.get("/factors/{country}/{city}")
async def get_city_factors(country: str, city: str):
    """Get all emission factors for a specific city."""
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


# ============ SCOPE 1 ENDPOINTS ============

@router.get("/scope1")
async def get_scope1_data(
    year: int = None,
    month: str = None,
    current_user: dict = Depends(get_current_user),
):
    """Get existing Scope 1 data for the current user."""
    company_id, _, _ = get_company_and_location(current_user.get("uid"))
    db = get_db()

    target_year = year or datetime.utcnow().year

    if month:
        doc = _get_scope_doc(db, company_id, "scope1", target_year, month).get()
        docs = [doc] if doc.exists else []
    else:
        docs = list(db.collection("emissionData").document(company_id).collection("scope1").where("year", "==", target_year).stream())
        docs = _prefer_month_docs(docs)

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
        results = data.get("results", {})
        raw_data = data.get("rawData", {})
        month_val = _normalize_doc_month(data)

        mobile_entries = raw_data.get("mobile") or ((results.get("mobile") or {}).get("entries") or [])
        for entry in mobile_entries:
            signature = _entry_signature("mobile", entry, month_val)
            if signature in seen_entries:
                continue
            seen_entries.add(signature)
            result["mobile"].append({
                "id": entry.get("id", f"{doc.id}_mobile_{len(result['mobile'])}"),
                "fuelType": entry.get("fuelType", ""),
                "distanceKm": entry.get("distanceKm"),
                "litresConsumed": entry.get("litresConsumed"),
                "month": month_val or data.get("month", ""),
                "kgCO2e": entry.get("kgCO2e", 0)
            })

        stationary_entries = raw_data.get("stationary") or ((results.get("stationary") or {}).get("entries") or [])
        for entry in stationary_entries:
            signature = _entry_signature("stationary", entry, month_val)
            if signature in seen_entries:
                continue
            seen_entries.add(signature)
            result["stationary"].append({
                "id": entry.get("id", f"{doc.id}_stationary_{len(result['stationary'])}"),
                "fuelType": entry.get("fuelType", ""),
                "consumption": entry.get("consumption", 0),
                "unit": entry.get("unit", ""),
                "month": month_val or data.get("month", ""),
                "kgCO2e": entry.get("kgCO2e", 0)
            })

        refrigerant_entries = raw_data.get("refrigerants") or ((results.get("refrigerants") or {}).get("entries") or [])
        for entry in refrigerant_entries:
            signature = _entry_signature("refrigerants", entry, month_val)
            if signature in seen_entries:
                continue
            seen_entries.add(signature)
            result["refrigerants"].append({
                "id": entry.get("id", f"{doc.id}_refrigerants_{len(result['refrigerants'])}"),
                "refrigerantType": entry.get("refrigerantType", entry.get("gasType", "")),
                "leakageKg": entry.get("leakageKg", entry.get("chargeKg", 0)),
                "month": month_val or data.get("month", ""),
                "kgCO2e": entry.get("kgCO2e", 0)
            })

        fugitive_entries = raw_data.get("fugitive") or ((results.get("fugitive") or {}).get("entries") or [])
        for entry in fugitive_entries:
            signature = _entry_signature("fugitive", entry, month_val)
            if signature in seen_entries:
                continue
            seen_entries.add(signature)
            result["fugitive"].append({
                "id": entry.get("id", f"{doc.id}_fugitive_{len(result['fugitive'])}"),
                "sourceType": entry.get("sourceType", ""),
                "amount": entry.get("amount", entry.get("emissionKg", 0)),
                "emissionKg": entry.get("emissionKg", entry.get("amount", 0)),
                "unit": entry.get("unit", ""),
                "month": month_val or data.get("month", ""),
                "kgCO2e": entry.get("kgCO2e", 0)
            })

    return result


@router.post("/scope1")
async def save_scope1(body: dict, current_user: dict = Depends(get_current_user)):
    """Save Scope 1 emission data and calculate tCO2e."""
    db = get_db()
    uid = current_user.get("uid")

    try:
        company_id, company_data, primary_location = get_company_and_location(uid)

        region = body.get("region", "middle-east")
        country = body.get("country", "uae")
        city = body.get("city", primary_location.get("city", "dubai").lower() if primary_location else "dubai")
        year = body.get("year", company_data.get("basicInfo", {}).get("fiscalYear", 2026))
        month = body.get("month")

        results = calculate_scope1(body, region, country, city)

        doc_id = f"{month}" if month else f"{year}-annual"
        
        existing_doc = db.collection("emissionData").document(company_id).collection("scope1").document(doc_id).get()
        existing_raw_data = existing_doc.to_dict().get("rawData", {}) if existing_doc.exists else {}
        
        # Helper to preserve IDs
        def preserve_ids(existing_entries, new_entries, doc_id, prefix):
            existing_map = {}
            for e in existing_entries:
                if e.get("id"):
                    key = json.dumps({k: v for k, v in e.items() if k != "id"}, sort_keys=True, default=str)
                    existing_map[key] = e.get("id")
            
            result = []
            for idx, new_entry in enumerate(new_entries):
                key = json.dumps(new_entry, sort_keys=True, default=str)
                entry_id = existing_map.get(key, f"{doc_id}_{prefix}_{idx}_{int(datetime.utcnow().timestamp())}")
                new_entry_copy = new_entry.copy()
                new_entry_copy["id"] = entry_id
                result.append(new_entry_copy)
            return result
        
        mobile_entries = preserve_ids(existing_raw_data.get("mobile", []), body.get("mobile", []), doc_id, "mobile")
        stationary_entries = preserve_ids(existing_raw_data.get("stationary", []), body.get("stationary", []), doc_id, "stationary")
        refrigerant_entries = preserve_ids(existing_raw_data.get("refrigerants", []), body.get("refrigerants", []), doc_id, "refrigerant")
        fugitive_entries = preserve_ids(existing_raw_data.get("fugitive", []), body.get("fugitive", []), doc_id, "fugitive")
        
        db.collection("emissionData").document(company_id).collection("scope1").document(doc_id).set({
            "companyId": company_id,
            "year": year,
            "month": month,
            "region": region,
            "country": country,
            "city": city,
            "rawData": {
                "mobile": mobile_entries,
                "stationary": stationary_entries,
                "refrigerants": refrigerant_entries,
                "fugitive": fugitive_entries,
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


@router.delete("/scope1")
async def delete_scope1_entry(
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    """Delete a specific Scope 1 entry."""
    db = get_db()
    uid = current_user.get("uid")

    try:
        company_id, _, _ = get_company_and_location(uid)
        year = body.get("year")
        month = body.get("month")
        category = body.get("category")
        entry = body.get("entry") or {}

        if isinstance(year, str):
            year = int(year)

        if category not in ["mobile", "stationary", "refrigerants", "fugitive"]:
            raise HTTPException(status_code=400, detail="Invalid Scope 1 category")

        doc_id = month if month else f"{year}-annual"
        doc_ref = db.collection("emissionData").document(company_id).collection("scope1").document(doc_id)
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


# ============ SCOPE 2 ENDPOINTS ============

@router.get("/scope2")
async def get_scope2_data(
    year: int = None,
    month: str = None,
    current_user: dict = Depends(get_current_user),
):
    """Get existing Scope 2 data for the current user."""
    company_id, _, _ = get_company_and_location(current_user.get("uid"))
    db = get_db()

    target_year = year or datetime.utcnow().year

    if month:
        doc = _get_scope_doc(db, company_id, "scope2", target_year, month).get()
        docs = [doc] if doc.exists else []
    else:
        docs = list(db.collection("emissionData").document(company_id).collection("scope2").where("year", "==", target_year).stream())
        docs = _prefer_month_docs(docs)

    result = {
        "year": target_year,
        "electricity": [],
        "heating": [],
        "renewables": []
    }
    seen_entries = set()

    for doc in docs:
        data = doc.to_dict()
        results = data.get("results", {})
        raw_data = data.get("rawData", {})
        month_val = _normalize_doc_month(data)

        electricity_entries = raw_data.get("electricity") or ((results.get("electricity") or {}).get("entries") or [])
        for entry in electricity_entries:
            signature = _entry_signature("electricity", entry, month_val)
            if signature in seen_entries:
                continue
            seen_entries.add(signature)
            result["electricity"].append({
                "id": entry.get("id", f"{doc.id}_electricity_{len(result['electricity'])}"),
                "consumption": entry.get("consumptionKwh", 0),
                "certificateType": entry.get("certificateType", "grid_average"),
                "certificateLabel": entry.get("certificateLabel", "Grid Average"),
                "method": entry.get("method", "location"),
                "month": month_val or data.get("month", ""),
                "kgCO2e": entry.get("kgCO2e", 0)
            })

        heating_entries = raw_data.get("heating") or ((results.get("heating") or {}).get("entries") or [])
        for entry in heating_entries:
            signature = _entry_signature("heating", entry, month_val)
            if signature in seen_entries:
                continue
            seen_entries.add(signature)
            result["heating"].append({
                "id": entry.get("id", f"{doc.id}_heating_{len(result['heating'])}"),
                "energyType": entry.get("energyType", ""),
                "consumption": entry.get("consumptionKwh", 0),
                "month": month_val or data.get("month", ""),
                "kgCO2e": entry.get("kgCO2e", 0)
            })

        renewable_entries = raw_data.get("renewables") or ((results.get("renewables") or {}).get("entries") or [])
        for entry in renewable_entries:
            signature = _entry_signature("renewables", entry, month_val)
            if signature in seen_entries:
                continue
            seen_entries.add(signature)
            result["renewables"].append({
                "id": entry.get("id", f"{doc.id}_renewables_{len(result['renewables'])}"),
                "sourceType": entry.get("sourceType", ""),
                "consumption": entry.get("generationKwh", 0),
                "month": month_val or data.get("month", ""),
                "kgCO2e": entry.get("kgCO2e", 0)
            })

    return result


@router.post("/scope2")
async def save_scope2(body: dict, current_user: dict = Depends(get_current_user)):
    """Save Scope 2 emission data and calculate tCO2e."""
    db = get_db()
    uid = current_user.get("uid")

    try:
        company_id, company_data, primary_location = get_company_and_location(uid)

        region = body.get("region", "middle-east")
        country = body.get("country", "uae")
        city = body.get("city", primary_location.get("city", "dubai").lower() if primary_location else "dubai")
        year = body.get("year", company_data.get("basicInfo", {}).get("fiscalYear", 2026))
        month = body.get("month")

        results = calculate_scope2(body, region, country, city)

        doc_id = f"{month}" if month else f"{year}-annual"
        
        existing_doc = db.collection("emissionData").document(company_id).collection("scope2").document(doc_id).get()
        existing_raw_data = existing_doc.to_dict().get("rawData", {}) if existing_doc.exists else {}
        
        def preserve_ids(existing_entries, new_entries, doc_id, prefix):
            existing_map = {}
            for e in existing_entries:
                if e.get("id"):
                    key = json.dumps({k: v for k, v in e.items() if k != "id"}, sort_keys=True, default=str)
                    existing_map[key] = e.get("id")
            
            result = []
            for idx, new_entry in enumerate(new_entries):
                key = json.dumps(new_entry, sort_keys=True, default=str)
                entry_id = existing_map.get(key, f"{doc_id}_{prefix}_{idx}_{int(datetime.utcnow().timestamp())}")
                new_entry_copy = new_entry.copy()
                new_entry_copy["id"] = entry_id
                result.append(new_entry_copy)
            return result
        
        electricity_entries = preserve_ids(existing_raw_data.get("electricity", []), body.get("electricity", []), doc_id, "electricity")
        heating_entries = preserve_ids(existing_raw_data.get("heating", []), body.get("heating", []), doc_id, "heating")
        renewable_entries = preserve_ids(existing_raw_data.get("renewables", []), body.get("renewables", []), doc_id, "renewable")
        
        db.collection("emissionData").document(company_id).collection("scope2").document(doc_id).set({
            "companyId": company_id,
            "year": year,
            "month": month,
            "region": region,
            "country": country,
            "city": city,
            "rawData": {
                "electricity": electricity_entries,
                "heating": heating_entries,
                "renewables": renewable_entries,
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


@router.delete("/scope2")
async def delete_scope2_entry(
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    """Delete a specific Scope 2 entry."""
    db = get_db()
    uid = current_user.get("uid")

    try:
        company_id, _, _ = get_company_and_location(uid)
        year = body.get("year")
        month = body.get("month")
        category = body.get("category")
        entry = body.get("entry") or {}

        if isinstance(year, str):
            year = int(year)

        if category not in ["electricity", "heating", "renewables"]:
            raise HTTPException(status_code=400, detail="Invalid Scope 2 category")

        doc_id = month if month else f"{year}-annual"
        doc_ref = db.collection("emissionData").document(company_id).collection("scope2").document(doc_id)
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


# ============ SUMMARY AND OTHER ENDPOINTS ============

@router.get("/summary")
async def get_summary(year: int = 2026, current_user: dict = Depends(get_current_user)):
    """Return aggregated Scope 1 + Scope 2 totals for a given year."""
    db = get_db()
    uid = current_user.get("uid")

    try:
        company_id, _, _ = get_company_and_location(uid)

        scope1_total = 0.0
        scope2_location_total = 0.0
        scope2_market_total = 0.0
        scope1_breakdown = {}
        scope2_breakdown = {}

        scope1_docs = db.collection("emissionData").document(company_id).collection("scope1").stream()
        for doc in scope1_docs:
            data = doc.to_dict()
            if data.get("year") == year:
                results = data.get("results", {})
                scope1_total += results.get("totalKgCO2e", 0)
                for category in ["mobile", "stationary", "refrigerants", "fugitive"]:
                    cat_total = results.get(category, {}).get("totalKgCO2e", 0)
                    scope1_breakdown[category] = scope1_breakdown.get(category, 0) + cat_total

        scope2_docs = db.collection("emissionData").document(company_id).collection("scope2").stream()
        for doc in scope2_docs:
            data = doc.to_dict()
            if data.get("year") == year:
                results = data.get("results", {})
                scope2_location_total += results.get("locationBasedKgCO2e", 0)
                scope2_market_total += results.get("marketBasedKgCO2e", 0)

                electricity_location = (results.get("electricity") or {}).get("locationBasedKgCO2e", 0)
                heating_total = (results.get("heating") or {}).get("totalKgCO2e", 0)
                renewables_total = (results.get("renewables") or {}).get("totalKgCO2e", 0)

                scope2_breakdown["electricity"] = scope2_breakdown.get("electricity", 0) + electricity_location
                scope2_breakdown["heating"] = scope2_breakdown.get("heating", 0) + heating_total
                scope2_breakdown["renewables"] = scope2_breakdown.get("renewables", 0) + renewables_total

        grand_total_kg = scope1_total + scope2_location_total

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


@router.get("/month-status")
async def get_month_status(year: int, current_user: dict = Depends(get_current_user)):
    """Get submission status for each month of the year."""
    db = get_db()
    uid = current_user.get("uid")
    company_id, _, _ = get_company_and_location(uid)

    status = {str(i): "none" for i in range(12)}

    s1_ref = db.collection("emissionData").document(company_id).collection("scope1")
    s1_docs = s1_ref.where("year", "==", year).stream()

    for doc in s1_docs:
        data = doc.to_dict()
        month_str = data.get("month")
        if month_str and "-" in month_str:
            try:
                month_num = int(month_str.split("-")[1]) - 1
                if 0 <= month_num < 12:
                    if status[str(month_num)] == "none":
                        status[str(month_num)] = "scope1"
                    elif status[str(month_num)] == "scope2":
                        status[str(month_num)] = "both"
            except (ValueError, IndexError):
                continue

    s2_ref = db.collection("emissionData").document(company_id).collection("scope2")
    s2_docs = s2_ref.where("year", "==", year).stream()

    for doc in s2_docs:
        data = doc.to_dict()
        month_str = data.get("month")
        if month_str and "-" in month_str:
            try:
                month_num = int(month_str.split("-")[1]) - 1
                if 0 <= month_num < 12:
                    if status[str(month_num)] == "none":
                        status[str(month_num)] = "scope2"
                    elif status[str(month_num)] == "scope1":
                        status[str(month_num)] = "both"
            except (ValueError, IndexError):
                continue

    return status