"""
Quick runtime diagnostics for Firestore emission factors + calculator output.

Run from `backend/`:
  python test_emissions_factors.py
"""

from app.services.calculator import get_emission_factors, calculate_scope1, calculate_scope2
from app.utils.firebase import initialize_firebase


def main():
    # Ensure credentials are set up (FastAPI does this at startup, but this script must too).
    initialize_firebase()

    # Match the failing example from the frontend payload
    region = "asia-pacific"
    country = "singapore"
    city = "singapore"

    scope1_test_payload = {
        "mobile": [{"fuelType": "diesel_bus", "distanceKm": 268}],
        "stationary": [{"fuelType": "cng", "consumption": 90}],
        "refrigerants": [{"refrigerantType": "r134a", "leakageKg": 88}],
        "fugitive": [{"sourceType": "methane", "emissionKg": 199.99}],
    }

    scope2_test_payload = {
        "electricity": [
            {
                "facilityName": "HQ",
                "consumptionKwh": 12000,
                "method": "market",
                "certificateType": "wind_ppa",
            }
        ],
        "heating": [{"energyType": "steam_hot_water", "consumptionKwh": 1000}],
        "renewables": [{"sourceType": "solar_ppa", "generationKwh": 5000}],
    }

    print("=== FACTOR FETCH: scope1 ===")
    scope1_factors = get_emission_factors(region, country, city, "scope1")
    print("scope1_factors_top_keys:", list(scope1_factors.keys()))
    mobile = scope1_factors.get("mobile") or {}
    print("scope1 mobile fuel keys sample:", list(mobile.keys())[:20])
    diesel_bus_factor = scope1_factors.get("diesel_bus") or mobile.get("diesel_bus") or {}
    print("diesel_bus factor raw:", diesel_bus_factor)

    print("\n=== CALCULATE: scope1 ===")
    scope1_results = calculate_scope1(scope1_test_payload, region, country, city)
    print("scope1 totalKgCO2e:", scope1_results.get("totalKgCO2e"))
    print("scope1 mobile totalKgCO2e:", (scope1_results.get("mobile") or {}).get("totalKgCO2e"))
    print("scope1 mobile first entry:", (scope1_results.get("mobile") or {}).get("entries", [{}])[0])

    print("\n=== FACTOR FETCH: scope2 ===")
    scope2_factors = get_emission_factors(region, country, city, "scope2")
    print("scope2_factors_top_keys:", list(scope2_factors.keys()))
    electricity_factors = scope2_factors if isinstance(scope2_factors, dict) else {}
    print("scope2 electricity factor keys sample:", list(electricity_factors.keys())[:20])
    print("grid_average factor raw:", electricity_factors.get("grid_average"))
    print("wind_ppa factor raw:", electricity_factors.get("wind_ppa"))
    print("sg_average factor raw:", electricity_factors.get("sg_average"))
    print("steam_hot_water factor raw:", scope2_factors.get("steam_hot_water"))

    print("\n=== CALCULATE: scope2 ===")
    scope2_results = calculate_scope2(scope2_test_payload, region, country, city)
    print("scope2 locationBasedKgCO2e:", scope2_results.get("locationBasedKgCO2e"))
    print("scope2 marketBasedKgCO2e:", scope2_results.get("marketBasedKgCO2e"))
    print("scope2 electricity first entry:", (scope2_results.get("electricity") or {}).get("entries", [{}])[0])
    print("scope2 heating first entry:", (scope2_results.get("heating") or {}).get("entries", [{}])[0])


if __name__ == "__main__":
    main()

