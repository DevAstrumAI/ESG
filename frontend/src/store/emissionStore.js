// src/store/emissionStore.js
import { create } from 'zustand';
import {
  normalizeScope1MobileEntry,
  normalizeScope1StationaryEntry,
  normalizeScope1RefrigerantEntry,
  normalizeScope1FugitiveEntry,
  normalizeScope2ElectricityEntry,
  normalizeScope2HeatingEntry,
  normalizeScope2RenewableEntry,
} from '../utils/emissionHydration';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

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
  isSubmitting:      false, // ✅ TC-014/016: Add submission guard flag

  // ─── Reset All Emission Data ─────────────────────────────────────────────
  reset: () =>
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
      isSubmitting:      false,
    }),

  // ─── Scope 1 Actions ──────────────────────────────────────────────────────
  // ✅ TC-014: Add unique IDs when adding entries
  addScope1Vehicle: (vehicle) =>
    set((state) => ({ 
      scope1Vehicles: [...state.scope1Vehicles, { 
        ...vehicle, 
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
      }] 
    })),

  updateScope1Vehicle: (updatedVehicle) =>
    set((state) => ({
      scope1Vehicles: state.scope1Vehicles.map((v) =>
        v.id === updatedVehicle.id ? updatedVehicle : v
      ),
    })),

  // ✅ TC-015: Immutable delete (only removes specific entry)
  deleteScope1Vehicle: (id) =>
    set((state) => ({
      scope1Vehicles: state.scope1Vehicles.filter((v) => v.id !== id)
    })),

  // ✅ TC-014: Add unique IDs when adding entries
  addScope1Stationary: (entry) =>
    set((state) => ({ 
      scope1Stationary: [...state.scope1Stationary, { 
        ...entry, 
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
      }] 
    })),

  // ✅ TC-015: Immutable delete
  deleteScope1Stationary: (id) =>
    set((state) => ({
      scope1Stationary: state.scope1Stationary.filter((e) => e.id !== id)
    })),

  // ✅ TC-014: Add unique IDs when adding entries
  addScope1Refrigerant: (entry) =>
    set((state) => ({ 
      scope1Refrigerants: [...state.scope1Refrigerants, { 
        ...entry, 
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
      }] 
    })),

  // ✅ TC-015: Immutable delete
  deleteScope1Refrigerant: (id) =>
    set((state) => ({
      scope1Refrigerants: state.scope1Refrigerants.filter((r) => r.id !== id)
    })),

  // ✅ TC-014: Add unique IDs when adding entries
  addScope1Fugitive: (entry) =>
    set((state) => ({ 
      scope1Fugitive: [...state.scope1Fugitive, { 
        ...entry, 
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
      }] 
    })),

  // ✅ TC-015: Immutable delete
  deleteScope1Fugitive: (id) =>
    set((state) => ({
      scope1Fugitive: state.scope1Fugitive.filter((f) => f.id !== id)
    })),

  // ─── Scope 2 Actions ──────────────────────────────────────────────────────
  // ✅ TC-014: Add unique IDs when adding entries
  addScope2Electricity: (entry) =>
    set((state) => ({ 
      scope2Electricity: [...state.scope2Electricity, { 
        ...entry, 
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
      }] 
    })),

  // ✅ TC-015: Immutable delete
  deleteScope2Electricity: (id) =>
    set((state) => ({
      scope2Electricity: state.scope2Electricity.filter((e) => e.id !== id)
    })),

  // ✅ TC-014: Add unique IDs when adding entries
  addScope2Heating: (entry) =>
    set((state) => ({ 
      scope2Heating: [...state.scope2Heating, { 
        ...entry, 
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
      }] 
    })),

  // ✅ TC-015: Immutable delete
  deleteScope2Heating: (id) =>
    set((state) => ({
      scope2Heating: state.scope2Heating.filter((h) => h.id !== id)
    })),

  // ✅ TC-014: Add unique IDs when adding entries
  addScope2Renewable: (entry) =>
    set((state) => ({ 
      scope2Renewable: [...state.scope2Renewable, { 
        ...entry, 
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
      }] 
    })),

  // ✅ TC-015: Immutable delete
  deleteScope2Renewable: (id) =>
    set((state) => ({
      scope2Renewable: state.scope2Renewable.filter((r) => r.id !== id)
    })),

  // ─── Replace entire arrays (prevents duplicates) ─────────────────────────
  setScope1Vehicles: (vehicles) =>
    set({ scope1Vehicles: vehicles }),

  setScope1Stationary: (stationary) =>
    set({ scope1Stationary: stationary }),

  setScope1Refrigerants: (refrigerants) =>
    set({ scope1Refrigerants: refrigerants }),

  setScope1Fugitive: (fugitive) =>
    set({ scope1Fugitive: fugitive }),

  setScope2Electricity: (electricity) =>
    set({ scope2Electricity: electricity }),

  setScope2Heating: (heating) =>
    set({ scope2Heating: heating }),

  setScope2Renewable: (renewable) =>
    set({ scope2Renewable: renewable }),

  // ─── Load Scope 1 Data from API (replaces existing data) ────────────────────
  loadScope1Data: async (token, year) => {
    try {
      const response = await fetch(`${API_URL}/api/emissions/scope1?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to load Scope 1 data (${response.status})`);
      }

      const data = await response.json();

      const mobileData = (data.mobile || []).map((item, index) =>
        normalizeScope1MobileEntry(item, `${Date.now()}-mobile-${index}`)
      );
      const stationaryData = (data.stationary || []).map((item, index) =>
        normalizeScope1StationaryEntry(item, `${Date.now()}-stationary-${index}`)
      );
      const refrigerantData = (data.refrigerants || []).map((item, index) =>
        normalizeScope1RefrigerantEntry(item, `${Date.now()}-refrigerant-${index}`)
      );
      const fugitiveData = (data.fugitive || []).map((item, index) =>
        normalizeScope1FugitiveEntry(item, `${Date.now()}-fugitive-${index}`)
      );

      set({
        scope1Vehicles: mobileData,
        scope1Stationary: stationaryData,
        scope1Refrigerants: refrigerantData,
        scope1Fugitive: fugitiveData,
      });

      return { success: true, data };
    } catch (error) {
      console.error("Failed to load Scope 1 data:", error);
      return { success: false, error: error.message };
    }
  },

  // ─── Load Scope 2 Data from API (replaces existing data) ────────────────────
  loadScope2Data: async (token, year) => {
    try {
      const response = await fetch(`${API_URL}/api/emissions/scope2?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to load Scope 2 data (${response.status})`);
      }

      const data = await response.json();

      const electricityData = (data.electricity || []).map((item, index) =>
        normalizeScope2ElectricityEntry(item, `${Date.now()}-electricity-${index}`)
      );
      const heatingData = (data.heating || []).map((item, index) =>
        normalizeScope2HeatingEntry(item, `${Date.now()}-heating-${index}`)
      );
      const renewableData = (data.renewables || []).map((item, index) =>
        normalizeScope2RenewableEntry(item, `${Date.now()}-renewable-${index}`)
      );

      set({
        scope2Electricity: electricityData,
        scope2Heating: heatingData,
        scope2Renewable: renewableData,
      });

      return { success: true, data };
    } catch (error) {
      console.error("Failed to load Scope 2 data:", error);
      return { success: false, error: error.message };
    }
  },

  // ─── Submit Scope 1 ───────────────────────────────────────────────────────
  // ✅ TC-014/016: Add submission guard to prevent double submission
  submitScope1: async (token, year, monthString) => {
    const { isSubmitting } = get();
    
    // ✅ Prevent double submission
    if (isSubmitting) {
      console.log("Submission already in progress");
      return { success: false, error: "Already submitting" };
    }
    
    set({ isSubmitting: true, loading: true, error: null });
    
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
        month: monthString,
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
        isSubmitting: false,
        loading: false,
      });

      await get().fetchSummary(token, year);
      return { success: true, results: data.results };
    } catch (error) {
      set({ error: error.message, loading: false, isSubmitting: false });
      return { success: false, error: error.message };
    }
  },

  // ─── Submit Scope 2 ───────────────────────────────────────────────────────
  // ✅ TC-014/016: Add submission guard to prevent double submission
  submitScope2: async (token, year, monthString) => {
    const { isSubmitting } = get();
    
    // ✅ Prevent double submission
    if (isSubmitting) {
      console.log("Submission already in progress");
      return { success: false, error: "Already submitting" };
    }
    
    set({ isSubmitting: true, loading: true, error: null });
    
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
        month: monthString,
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
        isSubmitting: false,
        loading: false,
      });

      await get().fetchSummary(token, year);
      return { success: true, results: data.results };
    } catch (error) {
      set({ error: error.message, loading: false, isSubmitting: false });
      return { success: false, error: error.message };
    }
  },

  // ─── Fetch Summary - FIXED with months count ──────────────────────────────
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
      const electricityLocation = result.scope2?.breakdown?.electricity || 
                                  result.scope2?.breakdown?.electricityLocation || 0;
      const electricityMarket = result.scope2?.breakdown?.electricityMarket || 0;
      const heatingKg = result.scope2?.breakdown?.heating || 0;
      
      // IMPORTANT: Location-based total MUST include heating
      const locationBasedTotal = electricityLocation + heatingKg;
      const marketBasedTotal = electricityMarket;

      // Calculate months with data - fetch from month-status endpoint or use fallback
      let monthsCount = 0;
      try {
        const monthStatusResponse = await fetch(`${API_URL}/api/emissions/month-status?year=${resolvedYear}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (monthStatusResponse.ok) {
          const monthStatus = await monthStatusResponse.json();
          monthsCount = Object.values(monthStatus).filter(s => s !== "none").length;
        } else {
          // Fallback: check if any data exists
          if (result.scope1?.totalKgCO2e > 0 || result.scope2?.locationBasedKgCO2e > 0) {
            monthsCount = 1;
          }
        }
      } catch (err) {
        console.error("Failed to fetch month status:", err);
        // Fallback: check if any data exists
        if (result.scope1?.totalKgCO2e > 0 || result.scope2?.locationBasedKgCO2e > 0) {
          monthsCount = 1;
        }
      }
      set({
        scope1Results: {
          mobile:       { kgCO2e: result.scope1?.breakdown?.mobile || 0 },
          stationary:   { kgCO2e: result.scope1?.breakdown?.stationary || 0 },
          refrigerants: { kgCO2e: result.scope1?.breakdown?.refrigerants || 0 },
          fugitive:     { kgCO2e: result.scope1?.breakdown?.fugitive || 0 },
          total:        { kgCO2e: result.scope1?.totalKgCO2e || 0 },
          monthsCount: monthsCount,
        },
        scope2Results: {
          electricity: { 
            locationBasedKgCO2e: electricityLocation,
            marketBasedKgCO2e: electricityMarket,
          },
          heating: { kgCO2e: heatingKg },
          renewables: { kgCO2e: result.scope2?.breakdown?.renewables || 0 },
          locationBasedKgCO2e: locationBasedTotal,
          marketBasedKgCO2e: marketBasedTotal,
          monthsCount: monthsCount,
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
      isSubmitting:      false,
    });
  },
}));