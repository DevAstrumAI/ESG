from app.utils.firebase import get_db
from typing import Optional


def get_emission_factors(region: str, country: str, city: str, scope: str) -> dict:
    """
    Fetch emission factors for a given city and scope from Firestore.
    Returns a flat dict of {category: {factor_name: {value, unit, ...}}}
    """
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
            data = factors_doc.to_dict()
            print(f"🔍 Factors for {city}/{scope}:")
            print(f"  Categories: {list(data.keys())}")
            if "mobile" in data:
                print(f"  Mobile keys: {list(data['mobile'].keys())}")
            return data
    except Exception as e:
        print(f"❌ Error fetching factors: {e}")
        return {}


def calculate_scope1(data: dict, region: str, country: str, city: str) -> dict:
    """
    Calculate Scope 1 emissions from raw input data.
    
    Input data format:
    {
        "mobile": [{"fuelType": "petrol_car", "distanceKm": 500}, ...],
        "stationary": [{"fuelType": "natural_gas", "consumption": 1000, "unit": "kWh"}, ...],
        "refrigerants": [{"refrigerantType": "r410a", "leakageKg": 2.5}, ...],
        "fugitive": [{"sourceType": "methane", "emissionKg": 1.0}, ...]
    }
    
    Returns:
    {
        "mobile": {"totalKgCO2e": 87.5, "entries": [...]},
        "stationary": {"totalKgCO2e": 202.0, "entries": [...]},
        "refrigerants": {"totalKgCO2e": 5220.0, "entries": [...]},
        "fugitive": {"totalKgCO2e": 28.0, "entries": [...]},
        "totalKgCO2e": 5537.5,
        "totalTonneCO2e": 5.5375
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
        distance_km = float(entry.get("distanceKm", 0))
        print(f"🔍 Looking for mobile factors. Keys in factors['mobile']: {list(factors.get('mobile', {}).keys())}")
        print(f"🔍 Looking for fuel_type: '{fuel_type}'")
        

        factor_data = factors.get("mobile", {}).get(fuel_type, {})
        print(f"🔍 Found factor_data: {factor_data}")
        factor_value = float(factor_data.get("value", 0))
        kg_co2e = distance_km * factor_value
        mobile_total += kg_co2e
        mobile_entries.append({
            **entry,
            "factorUsed": factor_value,
            "unit": factor_data.get("unit", ""),
            "kgCO2e": round(kg_co2e, 4),
        })
    results["mobile"] = {"entries": mobile_entries, "totalKgCO2e": round(mobile_total, 4)}
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
        })
    results["stationary"] = {"entries": stationary_entries, "totalKgCO2e": round(stationary_total, 4)}
    grand_total += stationary_total

    # --- Refrigerants ---
    refrigerant_entries = []
    refrigerant_total = 0.0
    for entry in data.get("refrigerants", []):
        refrigerant_type = entry.get("refrigerantType", "")
        leakage_kg = float(entry.get("leakageKg", 0))
        print(f"🔍 Looking for refrigerant: '{refrigerant_type}'")
        print(f"🔍 Fugitive keys in factors: {list(factors.get('fugitive', {}).keys())}")
        
        factor_data = factors.get("fugitive", {}).get(refrigerant_type, {})
        print(f"🔍 Found factor_data: {factor_data}")
        
        factor_value = float(factor_data.get("value", 0))
        kg_co2e = leakage_kg * factor_value
        refrigerant_total += kg_co2e
        refrigerant_entries.append({
            **entry,
            "factorUsed": factor_value,
            "unit": factor_data.get("unit", ""),
            "kgCO2e": round(kg_co2e, 4),
        })

    results["refrigerants"] = {"entries": refrigerant_entries, "totalKgCO2e": round(refrigerant_total, 4)}
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
    results["fugitive"] = {"entries": fugitive_entries, "totalKgCO2e": round(fugitive_total, 4)}
    grand_total += fugitive_total

    results["totalKgCO2e"] = round(grand_total, 4)
    results["totalTonneCO2e"] = round(grand_total / 1000, 6)

    return results


def calculate_scope2(data: dict, region: str, country: str, city: str) -> dict:
    """
    Calculate Scope 2 emissions from raw input data.

    Input data format:
    {
        "electricity": [{"facilityName": "HQ", "consumptionKwh": 50000, "method": "location"}, ...],
        "heating": [{"energyType": "steam_hot_water", "consumptionKwh": 1000}, ...],
        "renewables": [{"sourceType": "solar_ppa", "generationKwh": 5000}, ...]
    }
    """
    print(f"🔍 Scope2 data received: {data}")  
    factors = get_emission_factors(region, country, city, "scope2")
    results = {}
    grand_total = 0.0

    # --- Electricity ---
    electricity_entries = []
    electricity_total = 0.0
    for entry in data.get("electricity", []):
        consumption_kwh = float(entry.get("consumptionKwh", 0))
        # Use market-based if REC/PPA, otherwise location-based grid average
        method = entry.get("method", "location")
        if method == "market" and entry.get("certificateType"):
            factor_key = entry.get("certificateType", "rec_ppa")
        else:
            factor_key = "grid_average"  
        factor_data = factors.get("electricity", {}).get(factor_key, {})
        factor_value = float(factor_data.get("value", 0))
        kg_co2e = consumption_kwh * factor_value
        electricity_total += kg_co2e
        electricity_entries.append({
            **entry,
            "factorUsed": factor_value,
            "unit": factor_data.get("unit", ""),
            "kgCO2e": round(kg_co2e, 4),
        })
    results["electricity"] = {"entries": electricity_entries, "totalKgCO2e": round(electricity_total, 4)}
    grand_total += electricity_total

    # --- Heating ---
    heating_entries = []
    heating_total = 0.0
    for entry in data.get("heating", []):
        energy_type = entry.get("energyType", "")
        consumption_kwh = float(entry.get("consumptionKwh", 0))
        print(f"🔍 Heating energy_type received: '{energy_type}'")
        print(f"🔍 Heating keys in Firestore: {list(factors.get('heating', {}).keys())}")
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
    results["heating"] = {"entries": heating_entries, "totalKgCO2e": round(heating_total, 4)}
    grand_total += heating_total

    # --- Renewables (reduce total) ---
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
    results["renewables"] = {"entries": renewable_entries, "totalKgCO2e": round(renewable_total, 4)}
    grand_total += renewable_total

    results["totalKgCO2e"] = round(grand_total, 4)
    results["totalTonneCO2e"] = round(grand_total / 1000, 6)

    return results