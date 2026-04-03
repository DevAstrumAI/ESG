// src/store/emissionStore.js
import { create } from 'zustand';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Must match backend DISTANCE_BASED_TYPES exactly
const DISTANCE_BASED_TYPES = new Set([
  "jet_aircraft_per_km",
  "cargo_ship_hfo",
  "marine_hfo",
  "diesel_train",
  "diesel_bus",
]);

function mapVehicleFuelType(vehicleType, fuelTypeUI) {
  const type = (vehicleType || "").toLowerCase();
  const fuel = (fuelTypeUI || "").toLowerCase();
  if (type === "car"        && fuel === "petrol")  return "petrol_car";
  if (type === "car"        && fuel === "diesel")  return "diesel_car";
  if (type === "truck"      && fuel === "diesel")  return "diesel_truck";
  if (type === "bus"        && fuel === "diesel")  return "diesel_bus";
  if (type === "motorcycle" && fuel === "petrol")  return "petrol_motorcycle";
  if (type === "motorcycle")                        return "motorcycle";
  if (type === "motorboat")                         return "motorboat_gasoline";
  if (type === "cargo van"  && fuel === "diesel")  return "diesel_van";
  if (type === "airplane")                          return "jet_aircraft_per_km";
  if (type === "ship")                              return "cargo_ship_hfo";
  if (type === "train"      && fuel === "diesel")  return "diesel_train";
  return fuel === "petrol" ? "petrol_car" : "diesel_car";
}

function getRegionFromCountry(country) {
  const middleEast = ['uae', 'saudi-arabia', 'qatar', 'kuwait', 'bahrain', 'oman'];
  const asiaPacific = ['singapore', 'malaysia', 'indonesia', 'thailand'];
  if (middleEast.includes(country)) return 'middle-east';
  if (asiaPacific.includes(country)) return 'asia-pacific';
  return 'middle-east';
}

export const useEmissionStore = create((set, get) => ({
  // ─── State ────────────────────────────────────────────────────────────────
  scope1Vehicles:    [],
  scope1Stationary:  [],
  scope1Refrigerants:[],
  scope1Fugitive:    [],
  scope2Electricity: [],
  scope2Heating:     [],
  scope2Renewable:   [],
  scope1Results:     null,
  scope2Results:     null,
  scope2Total:       0,
  selectedYear:      new Date().getFullYear(),
  loading:           false,
  error:             null,

  // ─── Scope 1 Actions ──────────────────────────────────────────────────────
  addScope1Vehicle: (vehicle) =>
    set((state) => ({ scope1Vehicles: [...state.scope1Vehicles, vehicle] })),

  updateScope1Vehicle: (updatedVehicle) =>
    set((state) => ({
      scope1Vehicles: state.scope1Vehicles.map((v) =>
        v.id === updatedVehicle.id ? updatedVehicle : v
      ),
    })),

  deleteScope1Vehicle: (id) =>
    set((state) => ({
      scope1Vehicles: state.scope1Vehicles.filter((v) => v.id !== id),
    })),

  addScope1Stationary: (entry) =>
    set((state) => ({ scope1Stationary: [...state.scope1Stationary, entry] })),

  deleteScope1Stationary: (id) =>
    set((state) => ({
      scope1Stationary: state.scope1Stationary.filter((e) => e.id !== id),
    })),

  addScope1Refrigerant: (entry) =>
    set((state) => ({ scope1Refrigerants: [...state.scope1Refrigerants, entry] })),

  deleteScope1Refrigerant: (id) =>
    set((state) => ({
      scope1Refrigerants: state.scope1Refrigerants.filter((r) => r.id !== id),
    })),

  addScope1Fugitive: (entry) =>
    set((state) => ({ scope1Fugitive: [...state.scope1Fugitive, entry] })),

  deleteScope1Fugitive: (id) =>
    set((state) => ({
      scope1Fugitive: state.scope1Fugitive.filter((f) => f.id !== id),
    })),

  // ─── Scope 2 Actions ──────────────────────────────────────────────────────
  addScope2Electricity: (entry) =>
    set((state) => ({ scope2Electricity: [...state.scope2Electricity, entry] })),

  deleteScope2Electricity: (id) =>
    set((state) => ({
      scope2Electricity: state.scope2Electricity.filter((e) => e.id !== id),
    })),

  addScope2Heating: (entry) =>
    set((state) => ({ scope2Heating: [...state.scope2Heating, entry] })),

  deleteScope2Heating: (id) =>
    set((state) => ({
      scope2Heating: state.scope2Heating.filter((h) => h.id !== id),
    })),

  addScope2Renewable: (entry) =>
    set((state) => ({ scope2Renewable: [...state.scope2Renewable, entry] })),

  deleteScope2Renewable: (id) =>
    set((state) => ({
      scope2Renewable: state.scope2Renewable.filter((r) => r.id !== id),
    })),

  // ─── Submit Scope 1 ───────────────────────────────────────────────────────
  submitScope1: async (token, year, month) => {
    set({ loading: true, error: null });
    try {
      const state = get();

      const { useCompanyStore } = require('./companyStore');
      const companyStore = useCompanyStore.getState();
      const primaryLocation =
        companyStore.company?.locations?.find((loc) => loc.isPrimary) ||
        companyStore.company?.locations?.[0];

      const country = primaryLocation?.country || 'uae';
      const city    = (primaryLocation?.city || 'dubai').toLowerCase();
      const region  = getRegionFromCountry(country);

      const payload = {
        year,
        month,
        region,
        country,
        city,
        mobile: state.scope1Vehicles.map((v) => {
          const fuelType   = mapVehicleFuelType(v.vehicleType, v.fuelType);
          const useDistance = DISTANCE_BASED_TYPES.has(fuelType);
          return {
            fuelType,
            ...(useDistance
              ? { distanceKm:     Number(v.km     || 0) }
              : { litresConsumed: Number(v.litres || 0) }
            ),
          };
        }),
        stationary: state.scope1Stationary.map((s) => ({
          fuelType:    s.fuelType,
          consumption: Number(s.consumption || 0),
        })),
        refrigerants: state.scope1Refrigerants.map((r) => ({
          refrigerantType: r.refrigerantKey,
          leakageKg:       Number(r.leakageKg || 0),
        })),
        fugitive: state.scope1Fugitive.map((f) => ({
          sourceType: f.sourceType || 'methane',
          emissionKg: Number(f.emissionKg || f.amount || 0),
        })),
      };

      const response = await fetch(`${API_URL}/api/emissions/scope1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Submission failed');
      }

      const data = await response.json();

      set({
        scope1Results: {
          mobile:       { kgCO2e: data.results?.mobile?.totalKgCO2e       || 0 },
          stationary:   { kgCO2e: data.results?.stationary?.totalKgCO2e   || 0 },
          refrigerants: { kgCO2e: data.results?.refrigerants?.totalKgCO2e || 0 },
          fugitive:     { kgCO2e: data.results?.fugitive?.totalKgCO2e     || 0 },
          total:        { kgCO2e: data.results?.totalKgCO2e               || 0 },
        },
        selectedYear: year,
        loading: false,
      });

      await get().fetchSummary(token, year);
      return { success: true, results: data.results };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  // ─── Submit Scope 2 ───────────────────────────────────────────────────────
  submitScope2: async (token, year, month) => {
    set({ loading: true, error: null });
    try {
      const state = get();

      const { useCompanyStore } = require('./companyStore');
      const companyStore = useCompanyStore.getState();
      const primaryLocation =
        companyStore.company?.locations?.find((loc) => loc.isPrimary) ||
        companyStore.company?.locations?.[0];

      const country = primaryLocation?.country || 'uae';
      const city    = (primaryLocation?.city || 'dubai').toLowerCase();
      const region  = getRegionFromCountry(country);

      const payload = {
        year,
        month,
        region,
        country,
        city,
        electricity: state.scope2Electricity.map((e) => ({
          facilityName:    e.facilityName || 'Main Facility',
          consumptionKwh:  Number(e.consumption || e.kwh || 0),
          method:          e.certificateType === "grid_average" ? "location" : "market",
          certificateType: e.certificateType,
        })),
        heating: state.scope2Heating.map((h) => ({
          energyType:     h.energyType || 'steam_hot_water',
          consumptionKwh: Number(h.consumption || 0),
        })),
        renewables: state.scope2Renewable.map((r) => ({
          sourceType:    r.sourceType || 'solar_ppa',
          generationKwh: Number(r.consumption || 0),
        })),
      };

      const response = await fetch(`${API_URL}/api/emissions/scope2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Submission failed');
      }

      const data = await response.json();

      set({
        scope2Results: {
          electricity: { 
            locationBasedKgCO2e: data.results?.electricity?.locationBasedKgCO2e || 0,
            marketBasedKgCO2e: data.results?.electricity?.marketBasedKgCO2e || 0,
          },
          heating: { kgCO2e: data.results?.heating?.totalKgCO2e || 0 },
          renewables: { kgCO2e: data.results?.renewables?.totalKgCO2e || 0 },
          locationBasedKgCO2e: data.results?.locationBasedKgCO2e || 0,
          marketBasedKgCO2e: data.results?.marketBasedKgCO2e || 0,
        },
        scope2Total: data.results?.locationBasedKgCO2e || 0,
        selectedYear: year,
        loading: false,
      });

      await get().fetchSummary(token, year);
      return { success: true, results: data.results };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  // ─── Fetch Summary - FIXED to include heating in location-based total ────
  fetchSummary: async (token, year) => {
    const resolvedYear = year || get().selectedYear;
    try {
      const response = await fetch(
        `${API_URL}/api/emissions/summary?year=${resolvedYear}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch summary');
      }

      const result = await response.json();

      // Extract values from backend response
      const electricityLocation = result.scope2?.breakdown?.electricityLocation || 
                                  result.scope2?.breakdown?.electricity || 0;
      const electricityMarket = result.scope2?.breakdown?.electricityMarket || 
                                result.scope2?.breakdown?.electricity || 0;
      const heatingKg = result.scope2?.breakdown?.heating || 0;
      
      // IMPORTANT: Location-based total MUST include heating
      // Market-based total typically does NOT include heating (unless certificates exist)
      const locationBasedTotal = electricityLocation + heatingKg;
      const marketBasedTotal = electricityMarket; // Heating only added if renewable certificates exist

      set({
        scope1Results: {
          mobile:       { kgCO2e: result.scope1?.breakdown?.mobile || 0 },
          stationary:   { kgCO2e: result.scope1?.breakdown?.stationary || 0 },
          refrigerants: { kgCO2e: result.scope1?.breakdown?.refrigerants || 0 },
          fugitive:     { kgCO2e: result.scope1?.breakdown?.fugitive || 0 },
          total:        { kgCO2e: result.scope1?.totalKgCO2e || 0 },
        },
        scope2Results: {
          electricity: { 
            locationBasedKgCO2e: electricityLocation,
            marketBasedKgCO2e: electricityMarket,
          },
          heating: { kgCO2e: heatingKg },
          renewables: { kgCO2e: result.scope2?.breakdown?.renewables || 0 },
          // These are the corrected totals
          locationBasedKgCO2e: locationBasedTotal,
          marketBasedKgCO2e: marketBasedTotal,
        },
        selectedYear: resolvedYear,
      });

      return { success: true };
    } catch (error) {
      console.error("Fetch summary error:", error);
      return { success: false, error: error.message };
    }
  },

  // ─── Clear All (logout) ───────────────────────────────────────────────────
  clearAllData: () => {
    set({
      scope1Vehicles:    [],
      scope1Stationary:  [],
      scope1Refrigerants:[],
      scope1Fugitive:    [],
      scope2Electricity: [],
      scope2Heating:     [],
      scope2Renewable:   [],
      scope1Results:     null,
      scope2Results:     null,
      scope2Total:       0,
      selectedYear:      new Date().getFullYear(),
      loading:           false,
      error:             null,
    });
  },
}));