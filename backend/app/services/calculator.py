from app.utils.firebase import get_db
from app.utils.location_resolver import resolve_location

# Fuel types that use distance-based calculation (kg CO₂e/km)
DISTANCE_BASED_TYPES = {
    "jet_aircraft_per_km", "cargo_ship_hfo", "marine_hfo", "diesel_train"
}

# Fuel types that are biogenic
BIOGENIC_FUEL_TYPES = {
    "biodiesel", "bioethanol", "biogas", "wood_pellets"
}

# UI / form keys may differ from Firestore keys (e.g. petrol_car vs petrol). Try in order.
MOBILE_FUEL_LOOKUP_KEYS: dict[str, tuple[str, ...]] = {
    "petrol_car": ("petrol_car", "petrol", "gasoline"),
    "diesel_car": ("diesel_car", "diesel"),
    "motorcycle": ("motorcycle", "petrol_motorcycle"),
    "motorboat_gasoline": ("motorboat_gasoline", "petrol", "gasoline"),
    "diesel_van": ("diesel_van", "diesel", "diesel_car"),
    "cargo van": ("diesel_van", "diesel", "diesel_car"),
}

# Default fuel economy assumptions used only when factors are provided in kg CO2e/km
# but frontend submits litres for road-vehicle records.
# Formula: kg CO2e/litre = (kg CO2e/km) * (km/litre)
MOBILE_KM_PER_LITRE_ASSUMPTIONS: dict[str, float] = {
    "petrol_motorcycle": 35.0,
    "motorcycle": 35.0,
    "petrol_car": 12.5,
    "diesel_car": 14.0,
    "diesel_bus": 3.0,
    "diesel_van": 10.0,
    "diesel_truck": 4.0,
    "diesel_train": 2.5,
    "cargo_ship_hfo": 0.35,
    "marine_hfo": 0.35,
}

DISTANCE_UNIT_MARKERS = ("/km", "per km")

def _factor_numeric(fd: dict) -> float:
    if not isinstance(fd, dict):
        return 0.0
    for k in ("value", "factor", "emissionFactor"):
        v = fd.get(k)
        if v is None:
            continue
        try:
            return float(v)
        except (TypeError, ValueError):
            continue
    return 0.0


def _coerce_factor_data(raw_factor, default_unit: str = "") -> dict:
    """
    Normalize factor nodes that may be stored either as:
    - object: {"value": 0.2, "unit": "..."}
    - number/string: 0.2
    """
    if isinstance(raw_factor, dict):
        return raw_factor
    if raw_factor is None:
        return {}
    try:
        return {"value": float(raw_factor), "unit": default_unit}
    except (TypeError, ValueError):
        return {}


def _mobile_factor_keys_for(fuel_type: str) -> tuple[str, ...]:
    return MOBILE_FUEL_LOOKUP_KEYS.get(fuel_type, (fuel_type,))


def _is_distance_unit(unit: str) -> bool:
    unit_l = (unit or "").strip().lower()
    return any(marker in unit_l for marker in DISTANCE_UNIT_MARKERS)


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

        # Saudi Arabia factors are maintained at national level under Riyadh.
        city_candidates = [resolved_city]
        if resolved_country == "saudi-arabia" and resolved_city != "riyadh":
            city_candidates.append("riyadh")

        for city_key in city_candidates:
            # Try both path formats
            path_formats = [
                # Format 1: with parentheses (Saudi Arabia)
                f"emissionFactors/regions/{resolved_region}/"
                f"countries/{resolved_country}/"
                f"cities/city_data/{city_key}/"
                f"('{scope}',)/"
                f"factors",

                # Format 2: without parentheses (UAE and others)
                f"emissionFactors/regions/{resolved_region}/"
                f"countries/{resolved_country}/"
                f"cities/city_data/{city_key}/"
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
                return _coerce_factor_data(group.get(fuel_key))
        return _coerce_factor_data(factors.get(fuel_key))

    # --- Mobile ---
    mobile_entries = []
    mobile_total = 0.0

    for entry in data.get("mobile", []):
        fuel_type = entry.get("fuelType", "")
        factor_data: dict = {}
        for fk in _mobile_factor_keys_for(fuel_type):
            fd = _get_factor(fk, ["mobile"])
            if _factor_numeric(fd) > 0:
                factor_data = fd
                break

        factor_value = _factor_numeric(factor_data)
        unit = factor_data.get("unit", "") if isinstance(factor_data, dict) else ""

        # Prefer whichever user-provided quantity is present.
        # If factor unit is per-km and litres are supplied, convert factor to per-litre.
        distance_km = float(entry.get("distanceKm", 0))
        litres_consumed = float(entry.get("litresConsumed", 0))
        factor_is_distance = _is_distance_unit(unit) or fuel_type in DISTANCE_BASED_TYPES

        converted_from_distance_factor = False
        km_per_litre_used = None
        if factor_is_distance and litres_consumed > 0:
            if distance_km > 0:
                km_per_litre_used = distance_km / litres_consumed
            else:
                km_per_litre_used = MOBILE_KM_PER_LITRE_ASSUMPTIONS.get(fuel_type, 12.0)
            factor_value = factor_value * km_per_litre_used
            unit = "kg CO2e/litre (converted from per-km factor)"
            converted_from_distance_factor = True
            quantity = litres_consumed
        elif factor_is_distance:
            quantity = distance_km
        else:
            quantity = litres_consumed

        kg_co2e = quantity * factor_value
        mobile_total += kg_co2e

        row = {
            **entry,
            "factorUsed": factor_value,
            "unit": unit,
            "kgCO2e": round(kg_co2e, 4),
        }
        if converted_from_distance_factor:
            row["factorConversion"] = {
                "fromUnit": (factor_data.get("unit", "") if isinstance(factor_data, dict) else ""),
                "toUnit": unit,
                "kmPerLitreAssumption": km_per_litre_used,
            }
        mobile_entries.append(row)

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
        factor_value = _factor_numeric(factor_data)
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
        factor_value = _factor_numeric(factor_data)
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
        factor_value = _factor_numeric(factor_data)
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
        location_factor_data = _coerce_factor_data(electricity_factors.get("grid_average"), "kg CO2e/kWh")
        location_factor_value = _factor_numeric(location_factor_data)
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
                market_factor_data = _coerce_factor_data(electricity_factors.get("grid_average"), "kg CO2e/kWh")
                market_factor_value = _factor_numeric(market_factor_data)
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
        factor_data = _coerce_factor_data(heating_factors.get(energy_type), "kg CO2e/kWh")
        factor_value = _factor_numeric(factor_data)
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
        factor_data = _coerce_factor_data(electricity_factors.get(source_type), "kg CO2e/kWh")
        factor_value = _factor_numeric(factor_data)
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