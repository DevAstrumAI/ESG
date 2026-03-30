from app.utils.firebase import get_db
from app.utils.location_resolver import resolve_location
from typing import Dict, Any
import json
from datetime import datetime

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
# Fuel types that use distance-based calculation (kg CO₂e/km)
DISTANCE_BASED_TYPES = {
    "jet_aircraft_per_km", "cargo_ship_hfo", "marine_hfo", "diesel_train", "diesel_bus"
}

# Fuel types that are biogenic
BIOGENIC_FUEL_TYPES = {
    "biodiesel", "bioethanol", "biogas", "wood_pellets"
}


def get_emission_factors(region: str, country: str, city: str, scope: str) -> dict:
    """
    Fetch emission factors from Firestore.
    Handles both formats: with parentheses ('scope1',) and without (scope1)
    """
    db = get_db()
    try:
        # Resolve location
        resolved_region, resolved_country, resolved_city = resolve_location(country, city)

        # #region agent log H15
        _append_agent_log(
            hypothesisId="H15",
            location="backend/app/services/calculator.py:get_emission_factors",
            message="Resolved location + requested scope",
            data={
                "input": {"region": region, "country": country, "city": city, "scope": scope},
                "resolved": {"region": resolved_region, "country": resolved_country, "city": resolved_city},
            },
            runId="pre-fix",
        )
        # #endregion
        
        # Use provided region if it's not empty
        if region:
            resolved_region = region
        
        # Try both path formats
        path_formats = [
            # Format 1: with parentheses (Saudi Arabia)
            f"emissionFactors/regions/{resolved_region}/"
            f"countries/{resolved_country}/"
            f"cities/city_data/{resolved_city}/"
            f"('{scope}',)/"
            f"factors",
            
            # Format 2: without parentheses (UAE and others)
            f"emissionFactors/regions/{resolved_region}/"
            f"countries/{resolved_country}/"
            f"cities/city_data/{resolved_city}/"
            f"{scope}/"
            f"factors"
        ]
        
        # Try each path format
        for doc_path in path_formats:
            print(f"🔍 Trying: {doc_path}")
            doc_ref = db.document(doc_path)
            doc = doc_ref.get()
            
            if doc.exists:
                print(f"✅ Found {len(doc.to_dict())} factors at: {doc_path}")
                to_dict = doc.to_dict() or {}
                # #region agent log H16
                _append_agent_log(
                    hypothesisId="H16",
                    location="backend/app/services/calculator.py:get_emission_factors",
                    message="Found factors document",
                    data={
                        "scope": scope,
                        "usedDocPath": doc_path,
                        "topLevelKeys": list(to_dict.keys()),
                        "mobileHasDieselBus": "diesel_bus" in (to_dict.get("mobile") or {}),
                        "mobileKeysSample": list((to_dict.get("mobile") or {}).keys())[:10],
                    },
                    runId="pre-fix",
                )
                # #endregion
                return to_dict
        
        # If neither format works
        print(f"⚠️ No factors found for {resolved_country}/{resolved_city}/{scope}")

        # #region agent log H17
        _append_agent_log(
            hypothesisId="H17",
            location="backend/app/services/calculator.py:get_emission_factors",
            message="No emission factors document found",
            data={
                "scope": scope,
                "resolved": {"region": resolved_region, "country": resolved_country, "city": resolved_city},
                "triedPaths": path_formats,
            },
            runId="pre-fix",
        )
        # #endregion
        return {}
            
    except Exception as e:
        print(f"❌ Error fetching factors: {e}")

        # #region agent log H18
        _append_agent_log(
            hypothesisId="H18",
            location="backend/app/services/calculator.py:get_emission_factors",
            message="Exception while fetching emission factors",
            data={
                "scope": scope,
                "error": str(e),
            },
            runId="pre-fix",
        )
        # #endregion
        return {}


def calculate_scope1(data: dict, region: str, country: str, city: str) -> dict:
    """
    Calculate Scope 1 emissions from raw input data.

    Input data format:
    {
        "mobile": [
            {"fuelType": "petrol_car", "litresConsumed": 200},        # road vehicles
            {"fuelType": "jet_aircraft_per_km", "distanceKm": 5000},  # aviation/marine/rail
        ],
        "stationary": [{"fuelType": "natural_gas", "consumption": 1000, "unit": "kWh"}, ...],
        "refrigerants": [{"refrigerantType": "r410a", "leakageKg": 2.5}, ...],
        "fugitive": [{"sourceType": "methane", "emissionKg": 1.0}, ...]
    }
    """
    factors = get_emission_factors(region, country, city, "scope1")
    results = {}
    grand_total = 0.0

    # Firestore emission factor documents are stored in a couple of different shapes.
    # Current observed shape: fuel types (e.g., `diesel_bus`, `cng`, `methane`) exist at the top level
    # rather than nested under `mobile`/`stationary`/`fugitive`. We support both.
    def _get_factor(fuel_key: str, group_keys: list[str]) -> dict:
        for group_key in group_keys:
            group = factors.get(group_key)
            if isinstance(group, dict) and fuel_key in group:
                return group.get(fuel_key) or {}
        direct = factors.get(fuel_key)
        return direct if isinstance(direct, dict) else {}

    # --- Mobile ---
    mobile_entries = []
    mobile_total = 0.0
    mobile_debug_logged = False

    # #region agent log H5
    _append_agent_log(
        hypothesisId="H5",
        location="backend/app/services/calculator.py:calculate_scope1",
        message="Scope1 factors presence for mobile",
        data={
            "inputLocation": {"region": region, "country": country, "city": city},
            "factorsTopKeys": list((factors or {}).keys()),
            "mobileFactorCount": len((factors or {}).get("mobile", {}) or {}),
        },
        runId="pre-fix",
    )
    # #endregion

    for entry in data.get("mobile", []):
        fuel_type = entry.get("fuelType", "")
        factor_data = _get_factor(fuel_type, ["mobile"])
        factor_value = float(factor_data.get("value", 0))
        unit = factor_data.get("unit", "")

        # Use distance for aviation/marine/rail, litres for road vehicles
        is_distance_based = fuel_type in DISTANCE_BASED_TYPES
        if is_distance_based:
            quantity = float(entry.get("distanceKm", 0))
        else:
            quantity = float(entry.get("litresConsumed", 0))

        kg_co2e = quantity * factor_value
        mobile_total += kg_co2e

        # #region agent log H19
        if factor_value == 0:
            _append_agent_log(
                hypothesisId="H19",
                location="backend/app/services/calculator.py:calculate_scope1/mobile",
                message="Mobile factor resolved to 0",
                data={
                    "fuelType": fuel_type,
                    "factorDataKeys": list((factor_data or {}).keys()),
                    "factorDataValueRaw": factor_data.get("value"),
                    "quantityUsed": quantity,
                    "distanceKm": entry.get("distanceKm"),
                    "litresConsumed": entry.get("litresConsumed"),
                    "unit": unit,
                    "hasMobileFactors": "mobile" in (factors or {}),
                    "mobileFactorsCount": len((factors or {}).get("mobile", {}) or {}),
                },
                runId="pre-fix",
            )
        # #endregion

        # #region agent log H7
        if not mobile_debug_logged:
            mobile_debug_logged = True
            _append_agent_log(
                hypothesisId="H7",
                location="backend/app/services/calculator.py:calculate_scope1/mobile",
                message="Mobile calculation inputs -> quantity -> kgCO2e",
                data={
                    "fuelType": fuel_type,
                    "isDistanceBasedBackend": is_distance_based,
                    "rawDistanceKm": entry.get("distanceKm", None),
                    "rawLitresConsumed": entry.get("litresConsumed", None),
                    "quantityUsed": quantity,
                    "factorValue": factor_value,
                    "unit": unit,
                    "kgCO2e": kg_co2e,
                },
                runId="pre-fix",
            )
        # #endregion

        mobile_entries.append({
            **entry,
            "factorUsed": factor_value,
            "unit": unit,
            "kgCO2e": round(kg_co2e, 4),
        })

    results["mobile"] = {
        "entries": mobile_entries,
        "totalKgCO2e": round(mobile_total, 4)
    }
    grand_total += mobile_total

    # --- Stationary ---
    stationary_entries = []
    stationary_total = 0.0
    for entry in data.get("stationary", []):
        fuel_type = entry.get("fuelType", "")
        consumption = float(entry.get("consumption", 0))
        factor_data = _get_factor(fuel_type, ["stationary"])
        factor_value = float(factor_data.get("value", 0))
        kg_co2e = consumption * factor_value
        stationary_total += kg_co2e
        stationary_entries.append({
            **entry,
            "factorUsed": factor_value,
            "unit": factor_data.get("unit", ""),
            "kgCO2e": round(kg_co2e, 4),
            "isBiogenic": fuel_type in BIOGENIC_FUEL_TYPES,
        })

    results["stationary"] = {
        "entries": stationary_entries,
        "totalKgCO2e": round(stationary_total, 4)
    }
    grand_total += stationary_total

    # --- Refrigerants ---
    refrigerant_entries = []
    refrigerant_total = 0.0
    for entry in data.get("refrigerants", []):
        refrigerant_type = entry.get("refrigerantType", "")
        leakage_kg = float(entry.get("leakageKg", 0))
        factor_data = _get_factor(refrigerant_type, ["refrigerants"])
        factor_value = float(factor_data.get("value", 0))
        kg_co2e = leakage_kg * factor_value
        refrigerant_total += kg_co2e
        refrigerant_entries.append({
            **entry,
            "factorUsed": factor_value,
            "unit": factor_data.get("unit", ""),
            "kgCO2e": round(kg_co2e, 4),
        })

    results["refrigerants"] = {
        "entries": refrigerant_entries,
        "totalKgCO2e": round(refrigerant_total, 4)
    }
    grand_total += refrigerant_total

    # --- Fugitive ---
    fugitive_entries = []
    fugitive_total = 0.0
    for entry in data.get("fugitive", []):
        source_type = entry.get("sourceType", "")
        emission_kg = float(entry.get("emissionKg", 0))
        factor_data = _get_factor(source_type, ["fugitive"])
        factor_value = float(factor_data.get("value", 0))
        kg_co2e = emission_kg * factor_value
        fugitive_total += kg_co2e
        fugitive_entries.append({
            **entry,
            "factorUsed": factor_value,
            "unit": factor_data.get("unit", ""),
            "kgCO2e": round(kg_co2e, 4),
        })

    results["fugitive"] = {
        "entries": fugitive_entries,
        "totalKgCO2e": round(fugitive_total, 4)
    }
    grand_total += fugitive_total

    results["totalKgCO2e"] = round(grand_total, 4)
    results["totalTonneCO2e"] = round(grand_total / 1000, 6)

    # #region agent log H10
    _append_agent_log(
        hypothesisId="H10",
        location="backend/app/services/calculator.py:calculate_scope1",
        message="Scope1 totals after full calculation",
        data={
            "mobileTotalKgCO2e": results.get("mobile", {}).get("totalKgCO2e"),
            "stationaryTotalKgCO2e": results.get("stationary", {}).get("totalKgCO2e"),
            "refrigerantsTotalKgCO2e": results.get("refrigerants", {}).get("totalKgCO2e"),
            "fugitiveTotalKgCO2e": results.get("fugitive", {}).get("totalKgCO2e"),
            "grandTotalKgCO2e": results.get("totalKgCO2e"),
        },
        runId="pre-fix",
    )
    # #endregion

    return results


def calculate_scope2(data: dict, region: str, country: str, city: str) -> dict:
    """
    Calculate Scope 2 emissions from raw input data.
    Returns both location-based and market-based totals separately.

    Input data format:
    {
        "electricity": [{"facilityName": "HQ", "consumptionKwh": 50000, "method": "location", "certificateType": "rec_ppa"}, ...],
        "heating": [{"energyType": "steam_hot_water", "consumptionKwh": 1000}, ...],
        "renewables": [{"sourceType": "solar_ppa", "generationKwh": 5000}, ...]
    }
    """
    factors = get_emission_factors(region, country, city, "scope2")
    results = {}

    # Similar to Scope 1, Scope 2 factors may be stored with an `electricity`/`heating` group,
    # or directly at the top level. We normalize by selecting the group dict when present.
    electricity_factors = factors.get("electricity") if isinstance(factors.get("electricity"), dict) else factors
    heating_factors = factors.get("heating") if isinstance(factors.get("heating"), dict) else factors

    location_grand_total = 0.0
    market_grand_total = 0.0

    # --- Electricity ---
    electricity_entries = []
    electricity_location_total = 0.0
    electricity_market_total = 0.0

    for entry in data.get("electricity", []):
        consumption_kwh = float(entry.get("consumptionKwh", 0))
        method = entry.get("method", "location")
        certificate_type = entry.get("certificateType", "")

        # Location-based always uses grid average
        location_factor_data = electricity_factors.get("grid_average", {})
        location_factor_value = float(location_factor_data.get("value", 0))
        location_kg_co2e = consumption_kwh * location_factor_value

        # Market-based: 0 for renewable certificates, grid factor for grid average
        if method == "market" and certificate_type != "grid_average":
            market_factor_value = 0
        else:
            market_factor_data = electricity_factors.get("grid_average", {})
            market_factor_value = float(market_factor_data.get("value", 0))
        
        market_kg_co2e = consumption_kwh * market_factor_value

        electricity_location_total += location_kg_co2e
        electricity_market_total += market_kg_co2e

        electricity_entries.append({
            **entry,
            "locationBased": {
                "factorUsed": location_factor_value,
                "unit": location_factor_data.get("unit", ""),
                "kgCO2e": round(location_kg_co2e, 4),
            },
            "marketBased": {
                "factorUsed": market_factor_value,
                "unit": "kg CO₂e/kWh",
                "kgCO2e": round(market_kg_co2e, 4),
            },
        })

    results["electricity"] = {
        "entries": electricity_entries,
        "locationBasedKgCO2e": round(electricity_location_total, 4),
        "marketBasedKgCO2e": round(electricity_market_total, 4),
    }
    location_grand_total += electricity_location_total
    market_grand_total += electricity_market_total

    # --- Heating ---
    heating_entries = []
    heating_total = 0.0
    for entry in data.get("heating", []):
        energy_type = entry.get("energyType", "")
        consumption_kwh = float(entry.get("consumptionKwh", 0))
        factor_data = heating_factors.get(energy_type, {})
        factor_value = float(factor_data.get("value", 0))
        kg_co2e = consumption_kwh * factor_value
        heating_total += kg_co2e
        heating_entries.append({
            **entry,
            "factorUsed": factor_value,
            "unit": factor_data.get("unit", ""),
            "kgCO2e": round(kg_co2e, 4),
        })

    results["heating"] = {
        "entries": heating_entries,
        "totalKgCO2e": round(heating_total, 4)
    }
    location_grand_total += heating_total
    market_grand_total += heating_total

    # --- Renewables ---
    # Reported separately per GHG Protocol — does NOT reduce Scope 2 totals
    renewable_entries = []
    renewable_total = 0.0
    for entry in data.get("renewables", []):
        source_type = entry.get("sourceType", "")
        generation_kwh = float(entry.get("generationKwh", 0))
        factor_data = electricity_factors.get(source_type, {})
        factor_value = float(factor_data.get("value", 0))
        kg_co2e = generation_kwh * factor_value
        renewable_total += kg_co2e
        renewable_entries.append({
            **entry,
            "factorUsed": factor_value,
            "unit": factor_data.get("unit", ""),
            "kgCO2e": round(kg_co2e, 4),
        })

    results["renewables"] = {
        "entries": renewable_entries,
        "totalKgCO2e": round(renewable_total, 4),
        "note": "Reported separately per GHG Protocol — does not reduce Scope 1 or 2 totals"
    }
    # renewables intentionally NOT added to grand totals

    results["locationBasedKgCO2e"] = round(location_grand_total, 4)
    results["marketBasedKgCO2e"] = round(market_grand_total, 4)
    results["locationBasedTonneCO2e"] = round(location_grand_total / 1000, 6)
    results["marketBasedTonneCO2e"] = round(market_grand_total / 1000, 6)

    return results