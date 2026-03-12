from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from datetime import datetime

from ..utils.firebase import get_db
from ..middleware.auth import require_role

router = APIRouter()  # No prefix here — main.py handles it


def get_factor_path(db, region: str, country: str, city: str, scope: str):
    """Get the Firestore reference to a scope's factors document."""
    return (
        db.collection("emissionFactors")
        .document("regions")
        .collection(region)
        .document("metadata")
        .collection("countries")
        .document(country)
        .collection("cities")
        .document(city)
        .collection(scope)
        .document("factors")
    )


@router.get("/cities")
async def get_cities(
    region: str = "middle-east",
    country: str = "uae",
    current_user: dict = Depends(require_role("admin"))
):
    """Get all cities for a country."""
    db = get_db()
    try:
        print(f"🔍 Fetching cities for region: {region}, country: {country}")

        cities_ref = (
            db.collection("emissionFactors")
            .document("regions")
            .collection(region)
            .document("metadata")
            .collection("countries")
            .document(country)
            .collection("cities")
        )

        cities = []
        for city_doc in cities_ref.stream():
            city_data = city_doc.to_dict() or {}
            cities.append({
                "id": city_doc.id,
                "name": city_data.get("name", city_doc.id),
            })
            print(f"   Found city: {city_doc.id}")

        print(f"✅ Found {len(cities)} cities")
        return {"cities": cities}

    except Exception as e:
        print(f"❌ Error fetching cities: {e}")
        return {"cities": []}


@router.get("/factors")
async def get_factors(
    region: Optional[str] = Query("middle-east"),
    country: Optional[str] = Query("uae"),
    city: Optional[str] = Query(None),
    scope: Optional[str] = Query(None, description="scope1 or scope2"),
    category: Optional[str] = Query(None),
    year: Optional[int] = Query(2026),
    current_user: dict = Depends(require_role("admin")),
):
    """Get emission factors with optional filters."""
    db = get_db()
    try:
        print(f"🔍 GET /factors — region={region}, country={country}, city={city}, scope={scope}, category={category}, year={year}")

        if not city:
            return {"factors": [], "total": 0}

        factors = []
        city_ref = (
            db.collection("emissionFactors")
            .document("regions")
            .collection(region)
            .document("metadata")
            .collection("countries")
            .document(country)
            .collection("cities")
            .document(city)
        )

        scopes_to_fetch = [scope] if scope else ["scope1", "scope2"]

        for sc in scopes_to_fetch:
            scope_doc = city_ref.collection(sc).document("factors").get()
            if not scope_doc.exists:
                continue

            data = scope_doc.to_dict() or {}
            categories_to_fetch = [category] if category and category in data else data.keys()

            for cat_name in categories_to_fetch:
                cat_factors = data.get(cat_name, {})
                for factor_name, factor_value in cat_factors.items():
                    if not isinstance(factor_value, dict):
                        continue
                    if "year" in factor_value and factor_value["year"] != year:
                        continue
                    factors.append({
                        "id": f"{region}_{country}_{city}_{sc}_{cat_name}_{factor_name}",
                        "region": region,
                        "country": country,
                        "city": city,
                        "scope": sc,
                        "category": cat_name,
                        "factor_name": factor_name,
                        "value": factor_value.get("value", 0),
                        "unit": factor_value.get("unit", ""),
                        "source": factor_value.get("source", ""),
                        "year": factor_value.get("year", year),
                    })

        return {"factors": factors, "total": len(factors)}

    except Exception as e:
        print(f"❌ Error in GET /factors: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/factors")
async def create_factor(
    factor: dict,
    current_user: dict = Depends(require_role("admin"))
):
    """Create or update an emission factor."""
    db = get_db()
    try:
        print(f"📝 Creating factor: {factor}")

        required_fields = ["region", "country", "city", "scope", "category", "factor_name", "value", "unit"]
        for field in required_fields:
            if field not in factor:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

        factors_doc_ref = get_factor_path(db, factor["region"], factor["country"], factor["city"], factor["scope"])

        current = factors_doc_ref.get()
        data = current.to_dict() if current.exists else {}

        if factor["category"] not in data:
            data[factor["category"]] = {}

        data[factor["category"]][factor["factor_name"]] = {
            "value": factor["value"],
            "unit": factor["unit"],
            "source": factor.get("source", "Manual Entry"),
            "year": factor.get("year", 2026),
            "updated_at": datetime.now().isoformat(),
        }

        factors_doc_ref.set(data)
        return {"message": "Factor created successfully", "factor": factor}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in POST /factors: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/factors/{factor_id}")
async def delete_factor(
    factor_id: str,
    current_user: dict = Depends(require_role("admin"))
):
    """Delete a factor by its composite ID (region_country_city_scope_category_factorName)."""
    db = get_db()
    try:
        parts = factor_id.split("_")
        if len(parts) < 6:
            raise HTTPException(status_code=400, detail="Invalid factor ID format.")

        region, country, city, scope, category = parts[0], parts[1], parts[2], parts[3], parts[4]
        factor_name = "_".join(parts[5:])

        factors_doc_ref = get_factor_path(db, region, country, city, scope)
        current = factors_doc_ref.get()

        if not current.exists:
            raise HTTPException(status_code=404, detail="Factor document not found.")

        data = current.to_dict() or {}

        if category not in data or factor_name not in data[category]:
            raise HTTPException(status_code=404, detail="Factor not found.")

        del data[category][factor_name]
        if not data[category]:
            del data[category]

        factors_doc_ref.set(data)
        return {"message": f"Factor '{factor_name}' deleted successfully."}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in DELETE /factors: {e}")
        raise HTTPException(status_code=500, detail=str(e))