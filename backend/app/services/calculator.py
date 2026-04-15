from app.utils.firebase import get_db
from app.utils.location_resolver import resolve_location

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
                return doc.to_dict() or {}

        # If neither format works
        print(f"⚠️ No factors found for {resolved_country}/{resolved_city}/{scope}")
        return {}

    except Exception as e:
        print(f"❌ Error fetching factors: {e}")
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

    return results


def calculate_scope2(data: dict, region: str, country: str, city: str) -> dict:
    """
    Calculate Scope 2 emissions from raw input data.
    Returns both location-based and market-based totals separately.

    Input data format:
    {
        "electricity": [
            {
                "facilityName": "HQ",
                "consumptionKwh": 50000,
                "method": "location",          # "location" or "market"
                "certificateType": "rec_ppa"   # only relevant when method == "market"
            },
            ...
        ],
        "heating": [{"energyType": "steam_hot_water", "consumptionKwh": 1000}, ...],
        "renewables": [{"sourceType": "solar_ppa", "generationKwh": 5000}, ...]
    }

    Market-based rules (GHG Protocol Scope 2 Guidance):
    - method == "location"  → location_kg_co2e = grid factor × kWh, market_kg_co2e = 0
    - method == "market" + renewable certificate (non grid_average)
                            → location_kg_co2e = grid factor × kWh, market_kg_co2e = 0
    - method == "market" + certificateType == "grid_average" (no certificate)
                            → location_kg_co2e = grid factor × kWh, market_kg_co2e = grid factor × kWh
    """
    factors = get_emission_factors(region, country, city, "scope2")
    results = {}

    # Scope 2 factors may be stored with an `electricity`/`heating` group,
    # or directly at the top level. We normalise by selecting the group dict when present.
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

        # For market-based entries backed by renewable certificates, apply zero factor.
        # This aligns app behavior with the UX expectation that certified market entries emit 0.
        location_factor_data = electricity_factors.get("grid_average", {})
        location_factor_value = float(location_factor_data.get("value", 0))
        if method == "market" and certificate_type and certificate_type != "grid_average":
            location_factor_value = 0.0
        location_kg_co2e = consumption_kwh * location_factor_value

        # Market-based logic:
        # - method == "location"  → not participating in market accounting → market = 0
        # - method == "market" + renewable cert → zero-emission claim → market = 0
        # - method == "market" + grid_average (no cert) → use grid factor → market = location value
        if method == "market":
            if certificate_type and certificate_type != "grid_average":
                # Renewable energy certificate — zero market-based emission claim
                market_factor_value = 0.0
            else:
                # No certificate held — fall back to grid average for market-based too
                market_factor_data = electricity_factors.get("grid_average", {})
                market_factor_value = float(market_factor_data.get("value", 0))
        else:
            # method == "location" — entry is not part of market-based accounting
            market_factor_value = 0.0

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
    # Renewables intentionally NOT added to grand totals

    results["locationBasedKgCO2e"] = round(location_grand_total, 4)
    results["marketBasedKgCO2e"] = round(market_grand_total, 4)
    results["locationBasedTonneCO2e"] = round(location_grand_total / 1000, 6)
    results["marketBasedTonneCO2e"] = round(market_grand_total / 1000, 6)

    return results