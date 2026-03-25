// src/store/emissionStore.js
import { create } from "zustand";
import { emissionsAPI } from "../services/api";
import { useCompanyStore } from "./companyStore";

// Vehicle types that use distance-based calculation (must match backend)
const DISTANCE_BASED_TYPES = new Set([
  "jet_aircraft_per_km", "cargo_ship_hfo", "marine_hfo", "diesel_train", "diesel_bus"
]);

function mapFuelType(fuel) {
  const map = {
    "Biodiesel (liters)": "biodiesel",
    "Bioethanol (liters)": "bioethanol",
    "Biogas (tons)": "biogas",
    "Diesel (liters)": "diesel",
    "CNG (liters)": "cng",
    "Domestic coal (tons)": "coal",
    "Heating oil (liters)": "heavy_fuel_oil",
    "Industrial coal (tons)": "coal",
    "LPG (liters)": "lpg",
    "Petrol (liters)": "petrol",
    "Wood pellets (tons)": "wood_pellets",
    "Kerosene (tons)": "kerosene",
    "Other": "natural_gas",
  };
  return map[fuel] || "natural_gas";
}

function mapVehicleFuelType(vehicleType, fuelType) {
  const type = vehicleType.toLowerCase();
  const fuel = fuelType.toLowerCase();

  if (type === "car" && fuel === "petrol") return "petrol_car";
  if (type === "car" && fuel === "diesel") return "diesel_car";
  if (type === "truck" && fuel === "diesel") return "diesel_truck";
  if (type === "bus" && fuel === "diesel") return "diesel_bus";
  if (type === "motorcycle" && fuel === "petrol") return "petrol_motorcycle";
  if (type === "motorcycle") return "motorcycle";
  if (type === "forklift" && fuel === "lpg") return "lpg_forklift";
  if (type === "motorboat") return "motorboat_gasoline";
  if (type === "cargo van" && fuel === "diesel") return "diesel_van";
  if (type === "airplane") return "jet_aircraft_per_km";
  if (type === "ship") return "cargo_ship_hfo";

  return fuel === "petrol" ? "petrol_car" : "diesel_car";
}

function shouldUseDistance(vehicleType, fuelType) {
  const type = vehicleType.toLowerCase();
  // Only these use distance — must match backend DISTANCE_BASED_TYPES exactly
  const distanceBasedVehicles = ["airplane", "ship", "bus", "motorboat"];
  return distanceBasedVehicles.includes(type);
}

function mapRefrigerantType(type) {
  const map = {
    "R-134a":    "r134a",
    "R-410A":    "r410a",
    "R-22":      "r22",
    "R-404A":    "r404a",
    "R-407C":    "r407c",
    "R-32":      "r32",
    "R-507":     "r507",
    "SF6":       "sf6",
    "HFC-23":    "hfc23",
    "HFC-227ea": "hfc227ea",
    "PFC-14":    "pfc14",
    "PFC-116":   "pfc116",
    "Methane":   "methane",
    "N2O":       "n2o",
  };
  return map[type] || "methane";
}

function getRegionFromCountry(country) {
  const middleEastCountries = [
    'uae', 'saudi-arabia', 'qatar', 'kuwait', 'bahrain', 'oman', 'jordan', 'lebanon'
  ];
  const asiaPacificCountries = [
    'singapore', 'malaysia', 'indonesia', 'thailand', 'vietnam', 'philippines'
  ];
  
  if (middleEastCountries.includes(country)) return 'middle-east';
  if (asiaPacificCountries.includes(country)) return 'asia-pacific';
  return 'middle-east'; // default
}

export const useEmissionStore = create((set, get) => ({
  // === Scope 1 ===
  scope1Vehicles: [],
  scope1Stationary: [],
  scope1Refrigerants: [],
  scope1Fugitive: [],
  scope1Total: 0,

  // === Scope 2 ===
  scope2Electricity: [],
  scope2Heating: [],
  scope2Renewable: [],
  scope2Total: 0,

  // === Results from Backend ===
  scope1Results: null,
  scope2Results: null,

  // === Selected Year ===
  selectedYear: new Date().getFullYear(),

  // ─── Scope 1 Vehicles ────────────────────────────────────────────────────
  addScope1Vehicle: (vehicle) =>
    set((state) => {
      const updated = [...state.scope1Vehicles, vehicle];
      const total =
        updated.reduce((sum, v) => sum + Number(v.litres || 0), 0) +
        state.scope1Stationary.reduce((sum, s) => sum + Number(s.consumption || 0), 0) +
        state.scope1Refrigerants.reduce((sum, r) => sum + Number(r.gwp || 0), 0);
      return { scope1Vehicles: updated, scope1Total: total };
    }),

  updateScope1Vehicle: (vehicle) =>
    set((state) => {
      const updated = state.scope1Vehicles.map((v) =>
        v.id === vehicle.id ? vehicle : v
      );
      const total =
        updated.reduce((sum, v) => sum + Number(v.litres || 0), 0) +
        state.scope1Stationary.reduce((sum, s) => sum + Number(s.consumption || 0), 0) +
        state.scope1Refrigerants.reduce((sum, r) => sum + Number(r.gwp || 0), 0);
      return { scope1Vehicles: updated, scope1Total: total };
    }),

  deleteScope1Vehicle: (id) =>
    set((state) => {
      const updated = state.scope1Vehicles.filter((v) => v.id !== id);
      const total =
        updated.reduce((sum, v) => sum + Number(v.litres || 0), 0) +
        state.scope1Stationary.reduce((sum, s) => sum + Number(s.consumption || 0), 0) +
        state.scope1Refrigerants.reduce((sum, r) => sum + Number(r.gwp || 0), 0);
      return { scope1Vehicles: updated, scope1Total: total };
    }),

  // ─── Scope 1 Stationary ──────────────────────────────────────────────────
  addScope1Stationary: (entry) =>
    set((state) => {
      const updated = [...state.scope1Stationary, entry];
      const total =
        state.scope1Vehicles.reduce((sum, v) => sum + Number(v.litres || 0), 0) +
        updated.reduce((sum, s) => sum + Number(s.consumption || 0), 0) +
        state.scope1Refrigerants.reduce((sum, r) => sum + Number(r.gwp || 0), 0);
      return { scope1Stationary: updated, scope1Total: total };
    }),

  updateScope1Stationary: (entry) =>
    set((state) => {
      const updated = state.scope1Stationary.map((s) =>
        s.id === entry.id ? entry : s
      );
      const total =
        state.scope1Vehicles.reduce((sum, v) => sum + Number(v.litres || 0), 0) +
        updated.reduce((sum, s) => sum + Number(s.consumption || 0), 0) +
        state.scope1Refrigerants.reduce((sum, r) => sum + Number(r.gwp || 0), 0);
      return { scope1Stationary: updated, scope1Total: total };
    }),

  deleteScope1Stationary: (id) =>
    set((state) => {
      const updated = state.scope1Stationary.filter((s) => s.id !== id);
      const total =
        state.scope1Vehicles.reduce((sum, v) => sum + Number(v.litres || 0), 0) +
        updated.reduce((sum, s) => sum + Number(s.consumption || 0), 0) +
        state.scope1Refrigerants.reduce((sum, r) => sum + Number(r.gwp || 0), 0);
      return { scope1Stationary: updated, scope1Total: total };
    }),

  // ─── Scope 1 Refrigerants ────────────────────────────────────────────────
  addScope1Refrigerant: (entry) =>
    set((state) => {
      const updated = [...state.scope1Refrigerants, entry];
      const total =
        state.scope1Vehicles.reduce((sum, v) => sum + Number(v.litres || 0), 0) +
        state.scope1Stationary.reduce((sum, s) => sum + Number(s.consumption || 0), 0) +
        updated.reduce((sum, r) => sum + Number(r.gwp || 0), 0);
      return { scope1Refrigerants: updated, scope1Total: total };
    }),

  updateScope1Refrigerant: (entry) =>
    set((state) => {
      const updated = state.scope1Refrigerants.map((r) =>
        r.id === entry.id ? entry : r
      );
      const total =
        state.scope1Vehicles.reduce((sum, v) => sum + Number(v.litres || 0), 0) +
        state.scope1Stationary.reduce((sum, s) => sum + Number(s.consumption || 0), 0) +
        updated.reduce((sum, r) => sum + Number(r.gwp || 0), 0);
      return { scope1Refrigerants: updated, scope1Total: total };
    }),

  deleteScope1Refrigerant: (id) =>
    set((state) => {
      const updated = state.scope1Refrigerants.filter((r) => r.id !== id);
      const total =
        state.scope1Vehicles.reduce((sum, v) => sum + Number(v.litres || 0), 0) +
        state.scope1Stationary.reduce((sum, s) => sum + Number(s.consumption || 0), 0) +
        updated.reduce((sum, r) => sum + Number(r.gwp || 0), 0);
      return { scope1Refrigerants: updated, scope1Total: total };
    }),

  // ─── Scope 1 Fugitive ────────────────────────────────────────────────────
  addScope1Fugitive: (entry) =>
    set((state) => {
      const updated = [...state.scope1Fugitive, entry];
      const total =
        state.scope1Vehicles.reduce((sum, v) => sum + Number(v.litres || 0), 0) +
        state.scope1Stationary.reduce((sum, s) => sum + Number(s.consumption || 0), 0) +
        updated.reduce((sum, f) => sum + Number(f.amount || 0), 0);
      return { scope1Fugitive: updated, scope1Total: total };
    }),

  deleteScope1Fugitive: (id) =>
    set((state) => {
      const updated = state.scope1Fugitive.filter((f) => f.id !== id);
      const total =
        state.scope1Vehicles.reduce((sum, v) => sum + Number(v.litres || 0), 0) +
        state.scope1Stationary.reduce((sum, s) => sum + Number(s.consumption || 0), 0) +
        updated.reduce((sum, f) => sum + Number(f.amount || 0), 0);
      return { scope1Fugitive: updated, scope1Total: total };
    }),

  // ─── Scope 2 Electricity ─────────────────────────────────────────────────
  addScope2Electricity: (entry) =>
    set((state) => {
      const updated = [...state.scope2Electricity, entry];
      const total =
        updated.reduce((sum, e) => sum + Number(e.consumption || e.kwh || 0), 0) +
        state.scope2Heating.reduce((sum, h) => sum + Number(h.consumption || 0), 0);
      return { scope2Electricity: updated, scope2Total: total };
    }),

  deleteScope2Electricity: (id) =>
    set((state) => {
      const updated = state.scope2Electricity.filter((e) => e.id !== id);
      const total =
        updated.reduce((sum, e) => sum + Number(e.consumption || e.kwh || 0), 0) +
        state.scope2Heating.reduce((sum, h) => sum + Number(h.consumption || 0), 0);
      return { scope2Electricity: updated, scope2Total: total };
    }),

  // ─── Scope 2 Heating ─────────────────────────────────────────────────────
  addScope2Heating: (entry) =>
    set((state) => {
      const updated = [...state.scope2Heating, entry];
      const total =
        state.scope2Electricity.reduce((sum, e) => sum + Number(e.consumption || e.kwh || 0), 0) +
        updated.reduce((sum, h) => sum + Number(h.consumption || 0), 0);
      return { scope2Heating: updated, scope2Total: total };
    }),

  deleteScope2Heating: (id) =>
    set((state) => {
      const updated = state.scope2Heating.filter((h) => h.id !== id);
      const total =
        state.scope2Electricity.reduce((sum, e) => sum + Number(e.consumption || e.kwh || 0), 0) +
        updated.reduce((sum, h) => sum + Number(h.consumption || 0), 0);
      return { scope2Heating: updated, scope2Total: total };
    }),

  // ─── Scope 2 Renewable ───────────────────────────────────────────────────
  // Renewables don't contribute to scope2Total per GHG Protocol
  addScope2Renewable: (entry) =>
    set((state) => ({
      scope2Renewable: [...state.scope2Renewable, entry],
    })),

  deleteScope2Renewable: (id) =>
    set((state) => ({
      scope2Renewable: state.scope2Renewable.filter((r) => r.id !== id),
    })),

  // ─── Fetch Summary from Backend ──────────────────────────────────────────
  fetchSummary: async (token) => {
    const year = get().selectedYear;
    try {
      const result = await emissionsAPI.getSummary(token, year);
      const mappedScope1Results = {
        mobile: { kgCO2e: result.scope1?.breakdown?.mobile || 0 },
        stationary: { kgCO2e: result.scope1?.breakdown?.stationary || 0 },
        refrigerants: { kgCO2e: result.scope1?.breakdown?.refrigerants || 0 },
        fugitive: { kgCO2e: result.scope1?.breakdown?.fugitive || 0 },
        total: { kgCO2e: result.scope1?.totalKgCO2e || 0 },
      };

      const mappedScope2Results = {
        electricity: { kgCO2e: result.scope2?.breakdown?.electricity || 0 },
        heating: { kgCO2e: result.scope2?.breakdown?.heating || 0 },
        renewables: { kgCO2e: result.scope2?.breakdown?.renewables || 0 },
        locationBasedKgCO2e: result.scope2?.locationBasedKgCO2e || 0,
        marketBasedKgCO2e: result.scope2?.marketBasedKgCO2e || 0,
        total: { kgCO2e: result.scope2?.locationBasedKgCO2e || 0 },
      };

      // #region agent log H2
      fetch(
        "http://127.0.0.1:7312/ingest/558453d5-0857-4b96-9467-7f67bad3b71f",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "841ec6",
          },
          body: JSON.stringify({
            sessionId: "841ec6",
            runId: "pre-fix",
            hypothesisId: "H2",
            location: "frontend/src/store/emissionStore.js:fetchSummary",
            message: "Backend summary response + store mapping (scope2)",
            data: {
              summaryScope1Keys: Object.keys(result.scope1 || {}),
              summaryScope1TotalKgCO2e: result.scope1?.totalKgCO2e,
              summaryScope1Breakdown: result.scope1?.breakdown || null,
              mappedScope1Results,
              summaryScope2Keys: Object.keys(result.scope2 || {}),
              summaryScope2Breakdown: result.scope2?.breakdown || null,
              mappedScope2Results,
            },
            timestamp: Date.now(),
          }),
        }
      ).catch(() => {});
      // #endregion

      set({
        scope1Results: mappedScope1Results,
        scope2Results: mappedScope2Results,
        selectedYear: year,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ─── Submit Scope 1 ──────────────────────────────────────────────────────
  submitScope1: async (token, year, month) => {
    console.log("🔍=== SUBMIT SCOPE 1 DEBUG ===");
    
    // Get the current state
    const state = get();
    console.log("📦 Current store state:", {
      scope1Vehicles: state.scope1Vehicles,
      scope1Stationary: state.scope1Stationary,
      scope1Refrigerants: state.scope1Refrigerants,
      scope1Fugitive: state.scope1Fugitive
    });
    
    // Get company location from company store
    const companyStore = useCompanyStore.getState();
    console.log("1. Full company store:", companyStore);
    console.log("2. Company object:", companyStore.company);
    
    // Get primary location or first location
    const primaryLocation = companyStore.company?.locations?.find(loc => loc.isPrimary) || 
                            companyStore.company?.locations?.[0];
    console.log("3. Primary location:", primaryLocation);
    
    // Set default if no location exists
    const country = primaryLocation?.country || 'uae';
    const city = primaryLocation?.city?.toLowerCase() || 'dubai';
    const region = getRegionFromCountry(country);
    
    console.log("4. Final location:", { region, country, city });

    const payload = {
      year,
      month,
      region: region,
      country: country,
      city: city,
      mobile: state.scope1Vehicles.map((v) => {
        const fuelType = mapVehicleFuelType(v.vehicleType, v.fuelType);
        // Backend decides distance vs litres purely from `fuelType` (DISTANCE_BASED_TYPES).
        const useDistance = DISTANCE_BASED_TYPES.has(fuelType);
        
        console.log(`🚗 Vehicle: ${v.vehicleType}, fuel: ${v.fuelType} -> ${fuelType}, useDistance: ${useDistance}, km: ${v.km}, litres: ${v.litres}`);
        
        return {
          fuelType,
          ...(useDistance
            ? { distanceKm: Number(v.km || 0) }
            : { litresConsumed: Number(v.litres || 0) }
          ),
        };
      }),
      stationary: state.scope1Stationary.map((s) => ({
        fuelType: mapFuelType(s.fuel),
        consumption: Number(s.consumption || 0),
      })),
      refrigerants: state.scope1Refrigerants.map((r) => ({
        refrigerantType: mapRefrigerantType(r.refrigerantType),
        leakageKg: Number(r.leakageKg || r.gwp || 0),
      })),
      fugitive: state.scope1Fugitive.map((f) => ({
        sourceType: f.sourceType || "methane",
        emissionKg: Number(f.amount || 0),
      })),
    };

    console.log("📤 Final payload being sent:", JSON.stringify(payload, null, 2));

    // #region agent log H12
    fetch(
      "http://127.0.0.1:7312/ingest/558453d5-0857-4b96-9467-7f67bad3b71f",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "841ec6",
        },
        body: JSON.stringify({
          sessionId: "841ec6",
          runId: "pre-fix",
          hypothesisId: "H12",
          location: "frontend/src/store/emissionStore.js:submitScope1",
          message: "Scope1 payload mobile (field chosen + fuelType)",
          data: {
            payloadMobileCount: payload.mobile?.length || 0,
            firstMobileEntry: payload.mobile?.[0] || null,
          },
          timestamp: Date.now(),
        }),
      }
    ).catch(() => {});
    // #endregion

    try {
      const result = await emissionsAPI.submitScope1(token, payload);
      console.log("✅ Submit result:", result);
      set({
        scope1Results: {
          mobile:      { kgCO2e: result.results?.mobile?.totalKgCO2e || 0 },
          stationary:  { kgCO2e: result.results?.stationary?.totalKgCO2e || 0 },
          refrigerants:{ kgCO2e: result.results?.refrigerants?.totalKgCO2e || 0 },
          fugitive:    { kgCO2e: result.results?.fugitive?.totalKgCO2e || 0 },
          total:       { kgCO2e: result.results?.totalKgCO2e || 0 },
        },
        selectedYear: year,
      });
      return { success: true, results: result.results };
    } catch (error) {
      console.error("❌ Submit error:", error);
      return { success: false, error: error.message };
    }
  },

  // ─── Submit Scope 2 ──────────────────────────────────────────────────────
  submitScope2: async (token, year, month) => {
    console.log("🔍=== SUBMIT SCOPE 2 DEBUG ===");
    
    const state = get();
    
    // Get company location from company store
    const companyStore = useCompanyStore.getState();
    console.log("1. Full company store:", companyStore);
    console.log("2. Company object:", companyStore.company);
    
    // Get primary location or first location
    const primaryLocation = companyStore.company?.locations?.find(loc => loc.isPrimary) || 
                            companyStore.company?.locations?.[0];
    console.log("3. Primary location:", primaryLocation);
    
    // Set default if no location exists
    const country = primaryLocation?.country || 'uae';
    const city = primaryLocation?.city?.toLowerCase() || 'dubai';
    const region = getRegionFromCountry(country);
    
    console.log("4. Final location:", { region, country, city });
    
    const payload = {
      year,
      month,
      region: region,
      country: country,
      city: city,
      electricity: state.scope2Electricity.map((e) => ({
        facilityName: e.facilityName || "Main Facility",
        consumptionKwh: Number(e.consumption || e.kwh || 0),
        method: e.method || "location",
        ...(e.certificateType ? { certificateType: e.certificateType } : {}),
      })),
      heating: state.scope2Heating.map((h) => ({
        energyType: h.energyType || "steam_hot_water",
        consumptionKwh: Number(h.consumption || 0),
      })),
      renewables: state.scope2Renewable.map((r) => ({
        sourceType: r.sourceType || "solar_ppa",
        generationKwh: Number(r.consumption || 0),
      })),
    };

    console.log("📤 Final payload being sent:", JSON.stringify(payload, null, 2));

    try {
      const result = await emissionsAPI.submitScope2(token, payload);
      console.log("✅ Submit result:", result);
      set({
        scope2Results: {
          electricity: { kgCO2e: result.results?.electricity?.locationBasedKgCO2e || 0 },
          heating:     { kgCO2e: result.results?.heating?.totalKgCO2e || 0 },
          renewables:  {
            kgCO2e: result.results?.renewables?.totalKgCO2e || 0,
            note: result.results?.renewables?.note || "",
          },
          locationBasedKgCO2e: result.results?.locationBasedKgCO2e || 0,
          marketBasedKgCO2e:   result.results?.marketBasedKgCO2e || 0,
          total: { kgCO2e: result.results?.locationBasedKgCO2e || 0 },
        },
        selectedYear: year,
      });
      return { success: true, results: result.results };
    } catch (error) {
      console.error("❌ Submit error:", error);
      return { success: false, error: error.message };
    }
  },
}));