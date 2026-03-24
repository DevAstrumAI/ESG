from app.utils.firebase import get_db

# Fuel types that use distance-based calculation (kg CO₂e/km)
DISTANCE_BASED_TYPES = {
    "jet_aircraft_per_km", "cargo_ship_hfo", "marine_hfo", "diesel_train", "diesel_bus"
}

# Fuel types that are biogenic
BIOGENIC_FUEL_TYPES = {
    "biodiesel", "bioethanol", "biogas", "wood_pellets"
}


def get_emission_factors(region: str, country: str, city: str, scope: str) -> dict:
    db = get_db()
    try:
        factors_doc = (
            db.collection("emissionFactors")
            .document("regions")
            .collection(region)
            .document("countries")
            .collection(country)
            .document("cities")
            .collection("city_data")
            .document(city)
            .collection(scope)
            .document("factors")
            .get()
        )
        if factors_doc.exists:
            return factors_doc.to_dict()
    except Exception as e:
        print(f"Error fetching factors for {city}/{scope}: {e}")
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

    # --- Mobile ---
    mobile_entries = []
    mobile_total = 0.0
    for entry in data.get("mobile", []):
        fuel_type = entry.get("fuelType", "")
        factor_data = factors.get("mobile", {}).get(fuel_type, {})
        factor_value = float(factor_data.get("value", 0))
        unit = factor_data.get("unit", "")

        # Use distance for aviation/marine/rail, litres for road vehicles
        if fuel_type in DISTANCE_BASED_TYPES:
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
        factor_data = factors.get("stationary", {}).get(fuel_type, {})
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
        factor_data = factors.get("fugitive", {}).get(refrigerant_type, {})
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
        factor_data = factors.get("fugitive", {}).get(source_type, {})
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
        "electricity": [{"facilityName": "HQ", "consumptionKwh": 50000, "method": "location", "certificateType": "rec_ppa"}, ...],
        "heating": [{"energyType": "steam_hot_water", "consumptionKwh": 1000}, ...],
        "renewables": [{"sourceType": "solar_ppa", "generationKwh": 5000}, ...]
    }
    """
    factors = get_emission_factors(region, country, city, "scope2")
    results = {}

    location_grand_total = 0.0
    market_grand_total = 0.0

    # --- Electricity ---
    electricity_entries = []
    electricity_location_total = 0.0
    electricity_market_total = 0.0

    for entry in data.get("electricity", []):
        consumption_kwh = float(entry.get("consumptionKwh", 0))
        method = entry.get("method", "location")

        # Location-based always uses grid average
        location_factor_data = factors.get("electricity", {}).get("grid_average", {})
        location_factor_value = float(location_factor_data.get("value", 0))
        location_kg_co2e = consumption_kwh * location_factor_value

        # Market-based uses certificate type if provided, otherwise grid average
        if method == "market" and entry.get("certificateType"):
            market_factor_key = entry.get("certificateType", "rec_ppa")
        else:
            market_factor_key = "grid_average"
        market_factor_data = factors.get("electricity", {}).get(market_factor_key, {})
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
                "unit": market_factor_data.get("unit", ""),
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
        factor_data = factors.get("heating", {}).get(energy_type, {})
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
        factor_data = factors.get("electricity", {}).get(source_type, {})
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