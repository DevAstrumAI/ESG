from fastapi import APIRouter, HTTPException, status, Depends
from app.middleware.auth import get_current_user
from app.utils.firebase import get_db
from app.services.calculator import calculate_scope1, calculate_scope2
from datetime import datetime

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

    # Get primary location
    locations = company_data.get("locations", [])
    primary = next((loc for loc in locations if loc.get("isPrimary")), locations[0] if locations else None)

    return company_id, company_data, primary


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
        scope2_total = 0.0
        scope1_breakdown = {}
        scope2_breakdown = {}

        # Aggregate Scope 1
        scope1_docs = db.collection("emissionData").document(company_id).collection("scope1").stream()
        for doc in scope1_docs:
            data = doc.to_dict()
            if data.get("year") == year:
                results = data.get("results", {})
                scope1_total += results.get("totalKgCO2e", 0)
                for category in ["mobile", "stationary", "refrigerants", "fugitive"]:
                    cat_total = results.get(category, {}).get("totalKgCO2e", 0)
                    scope1_breakdown[category] = scope1_breakdown.get(category, 0) + cat_total

        # Aggregate Scope 2
        scope2_docs = db.collection("emissionData").document(company_id).collection("scope2").stream()
        for doc in scope2_docs:
            data = doc.to_dict()
            if data.get("year") == year:
                results = data.get("results", {})
                scope2_total += results.get("totalKgCO2e", 0)
                for category in ["electricity", "heating", "renewables"]:
                    cat_total = results.get(category, {}).get("totalKgCO2e", 0)
                    scope2_breakdown[category] = scope2_breakdown.get(category, 0) + cat_total

        grand_total_kg = scope1_total + scope2_total

        return {
            "year": year,
            "scope1": {
                "totalKgCO2e": round(scope1_total, 4),
                "totalTonneCO2e": round(scope1_total / 1000, 6),
                "breakdown": scope1_breakdown,
            },
            "scope2": {
                "totalKgCO2e": round(scope2_total, 4),
                "totalTonneCO2e": round(scope2_total / 1000, 6),
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