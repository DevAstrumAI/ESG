// src/store/emissionStore.js
import { create } from "zustand";
import { emissionsAPI } from "../services/api";

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
    "Petrol (liters)": "gasoline",
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

  // === Selected Year (saved on submission, used for fetching) ===
  selectedYear: new Date().getFullYear(),

  // ─── Scope 1 Vehicles ────────────────────────────────────────────────────
  addScope1Vehicle: (vehicle) =>
    set((state) => {
      const updated = [...state.scope1Vehicles, vehicle];
      const total =
        updated.reduce((sum, v) => sum + Number(v.km || 0), 0) +
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
        updated.reduce((sum, v) => sum + Number(v.km || 0), 0) +
        state.scope1Stationary.reduce((sum, s) => sum + Number(s.consumption || 0), 0) +
        state.scope1Refrigerants.reduce((sum, r) => sum + Number(r.gwp || 0), 0);
      return { scope1Vehicles: updated, scope1Total: total };
    }),
  deleteScope1Vehicle: (id) =>
    set((state) => {
      const updated = state.scope1Vehicles.filter((v) => v.id !== id);
      const total =
        updated.reduce((sum, v) => sum + Number(v.km || 0), 0) +
        state.scope1Stationary.reduce((sum, s) => sum + Number(s.consumption || 0), 0) +
        state.scope1Refrigerants.reduce((sum, r) => sum + Number(r.gwp || 0), 0);
      return { scope1Vehicles: updated, scope1Total: total };
    }),

  // ─── Scope 1 Stationary ──────────────────────────────────────────────────
  addScope1Stationary: (entry) =>
    set((state) => {
      const updated = [...state.scope1Stationary, entry];
      const total =
        state.scope1Vehicles.reduce((sum, v) => sum + Number(v.km || 0), 0) +
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
        state.scope1Vehicles.reduce((sum, v) => sum + Number(v.km || 0), 0) +
        updated.reduce((sum, s) => sum + Number(s.consumption || 0), 0) +
        state.scope1Refrigerants.reduce((sum, r) => sum + Number(r.gwp || 0), 0);
      return { scope1Stationary: updated, scope1Total: total };
    }),
  deleteScope1Stationary: (id) =>
    set((state) => {
      const updated = state.scope1Stationary.filter((s) => s.id !== id);
      const total =
        state.scope1Vehicles.reduce((sum, v) => sum + Number(v.km || 0), 0) +
        updated.reduce((sum, s) => sum + Number(s.consumption || 0), 0) +
        state.scope1Refrigerants.reduce((sum, r) => sum + Number(r.gwp || 0), 0);
      return { scope1Stationary: updated, scope1Total: total };
    }),

  // ─── Scope 1 Refrigerants ────────────────────────────────────────────────
  addScope1Refrigerant: (entry) =>
    set((state) => {
      const updated = [...state.scope1Refrigerants, entry];
      const total =
        state.scope1Vehicles.reduce((sum, v) => sum + Number(v.km || 0), 0) +
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
        state.scope1Vehicles.reduce((sum, v) => sum + Number(v.km || 0), 0) +
        state.scope1Stationary.reduce((sum, s) => sum + Number(s.consumption || 0), 0) +
        updated.reduce((sum, r) => sum + Number(r.gwp || 0), 0);
      return { scope1Refrigerants: updated, scope1Total: total };
    }),
  deleteScope1Refrigerant: (id) =>
    set((state) => {
      const updated = state.scope1Refrigerants.filter((r) => r.id !== id);
      const total =
        state.scope1Vehicles.reduce((sum, v) => sum + Number(v.km || 0), 0) +
        state.scope1Stationary.reduce((sum, s) => sum + Number(s.consumption || 0), 0) +
        updated.reduce((sum, r) => sum + Number(r.gwp || 0), 0);
      return { scope1Refrigerants: updated, scope1Total: total };
    }),

  // ─── Scope 1 Fugitive ────────────────────────────────────────────────────
  addScope1Fugitive: (entry) =>
    set((state) => {
      const updated = [...state.scope1Fugitive, entry];
      const vehiclesTotal = state.scope1Vehicles.reduce((sum, v) => sum + Number(v.km || 0), 0);
      const stationaryTotal = state.scope1Stationary.reduce((sum, s) => sum + Number(s.consumption || 0), 0);
      const fugitiveTotal = updated.reduce((sum, f) => sum + Number(f.amount || 0), 0);
      return { scope1Fugitive: updated, scope1Total: vehiclesTotal + stationaryTotal + fugitiveTotal };
    }),
  deleteScope1Fugitive: (id) =>
    set((state) => {
      const updated = state.scope1Fugitive.filter((f) => f.id !== id);
      const vehiclesTotal = state.scope1Vehicles.reduce((sum, v) => sum + Number(v.km || 0), 0);
      const stationaryTotal = state.scope1Stationary.reduce((sum, s) => sum + Number(s.consumption || 0), 0);
      const fugitiveTotal = updated.reduce((sum, f) => sum + Number(f.amount || 0), 0);
      return { scope1Fugitive: updated, scope1Total: vehiclesTotal + stationaryTotal + fugitiveTotal };
    }),

  // ─── Scope 2 Electricity ─────────────────────────────────────────────────
  addScope2Electricity: (entry) =>
    set((state) => {
      const updated = [...state.scope2Electricity, entry];
      const total =
        updated.reduce((sum, e) => sum + Number(e.consumption || e.kwh || 0), 0) +
        state.scope2Heating.reduce((sum, h) => sum + Number(h.consumption || 0), 0) +
        state.scope2Renewable.reduce((sum, r) => sum + Number(r.consumption || 0), 0);
      return { scope2Electricity: updated, scope2Total: total };
    }),
  deleteScope2Electricity: (id) =>
    set((state) => {
      const updated = state.scope2Electricity.filter((e) => e.id !== id);
      const total =
        updated.reduce((sum, e) => sum + Number(e.consumption || e.kwh || 0), 0) +
        state.scope2Heating.reduce((sum, h) => sum + Number(h.consumption || 0), 0) +
        state.scope2Renewable.reduce((sum, r) => sum + Number(r.consumption || 0), 0);
      return { scope2Electricity: updated, scope2Total: total };
    }),

  // ─── Scope 2 Heating ─────────────────────────────────────────────────────
  addScope2Heating: (entry) =>
    set((state) => {
      const updated = [...state.scope2Heating, entry];
      const total =
        state.scope2Electricity.reduce((sum, e) => sum + Number(e.consumption || e.kwh || 0), 0) +
        updated.reduce((sum, h) => sum + Number(h.consumption || 0), 0) +
        state.scope2Renewable.reduce((sum, r) => sum + Number(r.consumption || 0), 0);
      return { scope2Heating: updated, scope2Total: total };
    }),
  deleteScope2Heating: (id) =>
    set((state) => {
      const updated = state.scope2Heating.filter((h) => h.id !== id);
      const total =
        state.scope2Electricity.reduce((sum, e) => sum + Number(e.consumption || e.kwh || 0), 0) +
        updated.reduce((sum, h) => sum + Number(h.consumption || 0), 0) +
        state.scope2Renewable.reduce((sum, r) => sum + Number(r.consumption || 0), 0);
      return { scope2Heating: updated, scope2Total: total };
    }),

  // ─── Scope 2 Renewable ───────────────────────────────────────────────────
  addScope2Renewable: (entry) =>
    set((state) => {
      const updated = [...state.scope2Renewable, entry];
      const total =
        state.scope2Electricity.reduce((sum, e) => sum + Number(e.consumption || e.kwh || 0), 0) +
        state.scope2Heating.reduce((sum, h) => sum + Number(h.consumption || 0), 0) +
        updated.reduce((sum, r) => sum + Number(r.consumption || 0), 0);
      return { scope2Renewable: updated, scope2Total: total };
    }),
  deleteScope2Renewable: (id) =>
    set((state) => {
      const updated = state.scope2Renewable.filter((r) => r.id !== id);
      const total =
        state.scope2Electricity.reduce((sum, e) => sum + Number(e.consumption || e.kwh || 0), 0) +
        state.scope2Heating.reduce((sum, h) => sum + Number(h.consumption || 0), 0) +
        updated.reduce((sum, r) => sum + Number(r.consumption || 0), 0);
      return { scope2Renewable: updated, scope2Total: total };
    }),

  // ─── Fetch Summary from Backend (on login) ───────────────────────────────
  fetchSummary: async (token) => {
    const year = get().selectedYear;
    try {
      const result = await emissionsAPI.getSummary(token, year);
      set({
        scope1Results: {
          mobile: { kgCO2e: result.scope1?.breakdown?.mobile || 0 },
          stationary: { kgCO2e: result.scope1?.breakdown?.stationary || 0 },
          refrigerants: { kgCO2e: result.scope1?.breakdown?.refrigerants || 0 },
          fugitive: { kgCO2e: result.scope1?.breakdown?.fugitive || 0 },
          total: { kgCO2e: result.scope1?.totalKgCO2e || 0 },
        },
        scope2Results: {
          electricity: { kgCO2e: result.scope2?.breakdown?.electricity || 0 },
          heating: { kgCO2e: result.scope2?.breakdown?.heating || 0 },
          renewables: { kgCO2e: result.scope2?.breakdown?.renewables || 0 },
          total: { kgCO2e: result.scope2?.totalKgCO2e || 0 },
        },
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ─── Backend Submission ──────────────────────────────────────────────────
  submitScope1: async (token, year, month, city = "dubai") => {
    const state = get();
    const payload = {
      year,
      month,
      region: "middle-east",
      country: "uae",
      city,
      mobile: state.scope1Vehicles.map((v) => ({
      fuelType: mapVehicleFuelType(v.vehicleType, v.fuelType),
      distanceKm: Number(v.km || 0),
      })),
      stationary: state.scope1Stationary.map((s) => ({
        fuelType: mapFuelType(s.fuel),
        consumption: Number(s.consumption || 0),
      })),
      refrigerants: state.scope1Refrigerants.map((r) => ({
        refrigerantType: mapRefrigerantType(r.refrigerantType),
        leakageKg: Number(r.gwp || 0),
      })),
      fugitive: state.scope1Fugitive.map((f) => ({
        sourceType: f.sourceType || "methane",
        emissionKg: Number(f.amount || 0),
      })),
    };
    console.log("Vehicles being submitted:", state.scope1Vehicles);
    console.log("Mapped fuel types:", state.scope1Vehicles.map(v => 
      `${v.vehicleType} + ${v.fuelType} → ${mapVehicleFuelType(v.vehicleType, v.fuelType)}`
    ));
    try {
      const result = await emissionsAPI.submitScope1(token, payload);
      set({
        scope1Results: {
          mobile: { kgCO2e: result.results?.mobile?.totalKgCO2e || 0 },
          stationary: { kgCO2e: result.results?.stationary?.totalKgCO2e || 0 },
          refrigerants: { kgCO2e: result.results?.refrigerants?.totalKgCO2e || 0 },
          fugitive: { kgCO2e: result.results?.fugitive?.totalKgCO2e || 0 },
          total: { kgCO2e: result.results?.totalKgCO2e || 0 },
        },
        selectedYear: year,
      });
      return { success: true, results: result.results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  submitScope2: async (token, year, month, city = "dubai") => {
    const state = get();
    const payload = {
      year,
      month,
      region: "middle-east",
      country: "uae",
      city,
      electricity: state.scope2Electricity.map((e) => ({
        facilityName: e.facilityName || "Main Facility",
        consumptionKwh: Number(e.consumption || e.kwh || 0),
        method: e.method || "location",
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
    try {
      const result = await emissionsAPI.submitScope2(token, payload);
      set({
        scope2Results: {
          electricity: { kgCO2e: result.results?.electricity?.totalKgCO2e || 0 },
          heating: { kgCO2e: result.results?.heating?.totalKgCO2e || 0 },
          renewables: { kgCO2e: result.results?.renewables?.totalKgCO2e || 0 },
          total: { kgCO2e: result.results?.totalKgCO2e || 0 },
        },
        selectedYear: year,
      });
      return { success: true, results: result.results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
}));