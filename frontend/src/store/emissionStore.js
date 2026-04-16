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
import { getApiBaseUrl } from '../utils/getApiBaseUrl';

const API_URL = getApiBaseUrl('http://localhost:8001');

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
  selectedMonth:     null,
  loading:           false,
  error:             null,
  isSubmitting:      false,

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
      selectedMonth:     null,
      loading:           false,
      error:             null,
      isSubmitting:      false,
    }),

  // ─── Set Current Month/Year ─────────────────────────────────────────────
  setSelectedMonth: (month) => set({ selectedMonth: month }),
  setSelectedYear: (year) => set({ selectedYear: year }),

  // ─── Scope 1 Actions (Local only - for UI) ─────────────────────────────
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

  addScope1Stationary: (entry) =>
    set((state) => ({ 
      scope1Stationary: [...state.scope1Stationary, { 
        ...entry, 
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
      }] 
    })),
  updateScope1Stationary: (updatedEntry) =>
    set((state) => ({
      scope1Stationary: state.scope1Stationary.map((entry) =>
        entry.id === updatedEntry.id ? { ...entry, ...updatedEntry } : entry
      ),
    })),

  addScope1Refrigerant: (entry) =>
    set((state) => ({ 
      scope1Refrigerants: [...state.scope1Refrigerants, { 
        ...entry, 
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
      }] 
    })),
  updateScope1Refrigerant: (updatedEntry) =>
    set((state) => ({
      scope1Refrigerants: state.scope1Refrigerants.map((entry) =>
        entry.id === updatedEntry.id ? { ...entry, ...updatedEntry } : entry
      ),
    })),

  addScope1Fugitive: (entry) =>
    set((state) => ({ 
      scope1Fugitive: [...state.scope1Fugitive, { 
        ...entry, 
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
      }] 
    })),
  updateScope1Fugitive: (updatedEntry) =>
    set((state) => ({
      scope1Fugitive: state.scope1Fugitive.map((entry) =>
        entry.id === updatedEntry.id ? { ...entry, ...updatedEntry } : entry
      ),
    })),

  // Local deletes used by Scope 1 UI components
  deleteScope1Vehicle: (id) =>
    set((state) => ({
      scope1Vehicles: state.scope1Vehicles.filter((vehicle) => vehicle.id !== id),
    })),

  deleteScope1Stationary: (id) =>
    set((state) => ({
      scope1Stationary: state.scope1Stationary.filter((entry) => entry.id !== id),
    })),

  deleteScope1Refrigerant: (id) =>
    set((state) => ({
      scope1Refrigerants: state.scope1Refrigerants.filter((entry) => entry.id !== id),
    })),

  deleteScope1Fugitive: (id) =>
    set((state) => ({
      scope1Fugitive: state.scope1Fugitive.filter((entry) => entry.id !== id),
    })),

  // ─── Scope 2 Actions (Local only - for UI) ─────────────────────────────
  addScope2Electricity: (entry) =>
    set((state) => ({ 
      scope2Electricity: [...state.scope2Electricity, { 
        ...entry, 
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
      }] 
    })),
  updateScope2Electricity: (updatedEntry) =>
    set((state) => ({
      scope2Electricity: state.scope2Electricity.map((entry) =>
        entry.id === updatedEntry.id ? { ...entry, ...updatedEntry } : entry
      ),
    })),

  addScope2Heating: (entry) =>
    set((state) => ({ 
      scope2Heating: [...state.scope2Heating, { 
        ...entry, 
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
      }] 
    })),
  updateScope2Heating: (updatedEntry) =>
    set((state) => ({
      scope2Heating: state.scope2Heating.map((entry) =>
        entry.id === updatedEntry.id ? { ...entry, ...updatedEntry } : entry
      ),
    })),

  addScope2Renewable: (entry) =>
    set((state) => ({ 
      scope2Renewable: [...state.scope2Renewable, { 
        ...entry, 
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
      }] 
    })),
  updateScope2Renewable: (updatedEntry) =>
    set((state) => ({
      scope2Renewable: state.scope2Renewable.map((entry) =>
        entry.id === updatedEntry.id ? { ...entry, ...updatedEntry } : entry
      ),
    })),

  // Local deletes used by Scope 2 UI components
  deleteScope2Electricity: (id) =>
    set((state) => ({
      scope2Electricity: state.scope2Electricity.filter((entry) => entry.id !== id),
    })),

  deleteScope2Heating: (id) =>
    set((state) => ({
      scope2Heating: state.scope2Heating.filter((entry) => entry.id !== id),
    })),

  deleteScope2Renewable: (id) =>
    set((state) => ({
      scope2Renewable: state.scope2Renewable.filter((entry) => entry.id !== id),
    })),

  // ─── BACKEND-SYNCHRONIZED DELETE METHODS ───────────────────────────────
  
  // Scope 1 - Vehicle/ Mobile Combustion
 
deleteScope1VehicleWithSync: async (vehicle, token, year, month) => {
  set({ loading: true });
  try {
    // Find the entry ID from the vehicle object
    const entryId = vehicle.id;
    
    const response = await fetch(`${API_URL}/api/emissions/scope1/vehicle/${entryId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ year, month }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete vehicle');
    }

    // Remove from local state
    set((state) => ({
      scope1Vehicles: state.scope1Vehicles.filter((v) => v.id !== entryId),
      loading: false,
    }));

    // Refresh summary
    await get().fetchSummary(token, year);
    
    return { success: true };
  } catch (error) {
    console.error('Delete vehicle error:', error);
    set({ error: error.message, loading: false });
    return { success: false, error: error.message };
  }
},

deleteScope1StationaryWithSync: async (entry, token, year, month) => {
  set({ loading: true });
  try {
    const entryId = entry.id;
    
    const response = await fetch(`${API_URL}/api/emissions/scope1/stationary/${entryId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ year, month }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete stationary entry');
    }

    set((state) => ({
      scope1Stationary: state.scope1Stationary.filter((e) => e.id !== entryId),
      loading: false,
    }));

    await get().fetchSummary(token, year);
    return { success: true };
  } catch (error) {
    console.error('Delete stationary error:', error);
    set({ error: error.message, loading: false });
    return { success: false, error: error.message };
  }
},

deleteScope1RefrigerantWithSync: async (entry, token, year, month) => {
  set({ loading: true });
  try {
    const entryId = entry.id;
    
    const response = await fetch(`${API_URL}/api/emissions/scope1/refrigerant/${entryId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ year, month }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete refrigerant entry');
    }

    set((state) => ({
      scope1Refrigerants: state.scope1Refrigerants.filter((r) => r.id !== entryId),
      loading: false,
    }));

    await get().fetchSummary(token, year);
    return { success: true };
  } catch (error) {
    console.error('Delete refrigerant error:', error);
    set({ error: error.message, loading: false });
    return { success: false, error: error.message };
  }
},

deleteScope1FugitiveWithSync: async (entry, token, year, month) => {
  set({ loading: true });
  try {
    const entryId = entry.id;
    
    const response = await fetch(`${API_URL}/api/emissions/scope1/fugitive/${entryId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ year, month }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete fugitive entry');
    }

    set((state) => ({
      scope1Fugitive: state.scope1Fugitive.filter((f) => f.id !== entryId),
      loading: false,
    }));

    await get().fetchSummary(token, year);
    return { success: true };
  } catch (error) {
    console.error('Delete fugitive error:', error);
    set({ error: error.message, loading: false });
    return { success: false, error: error.message };
  }
},

  // Scope 2 - Electricity (legacy endpoint sync)
  deleteScope2ElectricityWithSync: async (id, token, year, month) => {
    set({ loading: true });
    try {
      const response = await fetch(`${API_URL}/api/emissions/scope2/electricity/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ year, month }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete electricity entry');
      }

      set((state) => ({
        scope2Electricity: state.scope2Electricity.filter((e) => e.id !== id),
        loading: false,
      }));

      await get().fetchSummary(token, year);
      await get().loadScope2Data(token, year, month);
      
      return { success: true };
    } catch (error) {
      console.error('Delete electricity error:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  // Scope 2 - Heating (legacy endpoint sync)
  deleteScope2HeatingWithSync: async (id, token, year, month) => {
    set({ loading: true });
    try {
      const response = await fetch(`${API_URL}/api/emissions/scope2/heating/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ year, month }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete heating entry');
      }

      set((state) => ({
        scope2Heating: state.scope2Heating.filter((h) => h.id !== id),
        loading: false,
      }));

      await get().fetchSummary(token, year);
      await get().loadScope2Data(token, year, month);
      
      return { success: true };
    } catch (error) {
      console.error('Delete heating error:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  // Scope 2 - Renewable Energy (legacy endpoint sync)
  deleteScope2RenewableWithSync: async (id, token, year, month) => {
    set({ loading: true });
    try {
      const response = await fetch(`${API_URL}/api/emissions/scope2/renewable/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ year, month }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete renewable entry');
      }

      set((state) => ({
        scope2Renewable: state.scope2Renewable.filter((r) => r.id !== id),
        loading: false,
      }));

      await get().fetchSummary(token, year);
      await get().loadScope2Data(token, year, month);
      
      return { success: true };
    } catch (error) {
      console.error('Delete renewable error:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  // ─── Replace entire arrays (prevents duplicates) ─────────────────────────
  setScope1Vehicles: (vehicles) => set({ scope1Vehicles: vehicles }),
  setScope1Stationary: (stationary) => set({ scope1Stationary: stationary }),
  setScope1Refrigerants: (refrigerants) => set({ scope1Refrigerants: refrigerants }),
  setScope1Fugitive: (fugitive) => set({ scope1Fugitive: fugitive }),
  setScope2Electricity: (electricity) => set({ scope2Electricity: electricity }),
  setScope2Heating: (heating) => set({ scope2Heating: heating }),
  setScope2Renewable: (renewable) => set({ scope2Renewable: renewable }),

  // ─── Load Scope 1 Data from API (replaces existing data) ────────────────
  loadScope1Data: async (token, year, month = null) => {
    set({ loading: true });
    try {
      let url = `${API_URL}/api/emissions/scope1?year=${year}`;
      if (month) {
        url += `&month=${month}`;
      }
      
      const response = await fetch(url, {
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
        loading: false,
      });

      return { success: true, data };
    } catch (error) {
      console.error("Failed to load Scope 1 data:", error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  // ─── Load Scope 2 Data from API (replaces existing data) ────────────────
  loadScope2Data: async (token, year, month = null) => {
    set({ loading: true });
    try {
      let url = `${API_URL}/api/emissions/scope2?year=${year}`;
      if (month) {
        url += `&month=${month}`;
      }
      
      const response = await fetch(url, {
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
        loading: false,
      });

      return { success: true, data };
    } catch (error) {
      console.error("Failed to load Scope 2 data:", error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  // ─── Submit Scope 1 ─────────────────────────────────────────────────────
  submitScope1: async (token, year, monthString) => {
    const { isSubmitting } = get();
    
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

  // ─── Submit Scope 2 ─────────────────────────────────────────────────────
  submitScope2: async (token, year, monthString) => {
    const { isSubmitting } = get();
    
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

  // ─── Fetch Summary ──────────────────────────────────────────────────────
  fetchSummary: async (token, year) => {
    const resolvedYear = year || get().selectedYear;
    const emptyScope1 = {
      mobile: { kgCO2e: 0 },
      stationary: { kgCO2e: 0 },
      refrigerants: { kgCO2e: 0 },
      fugitive: { kgCO2e: 0 },
      total: { kgCO2e: 0 },
      monthsCount: 0,
    };
    const emptyScope2 = {
      electricity: {
        locationBasedKgCO2e: 0,
        marketBasedKgCO2e: 0,
      },
      heating: { kgCO2e: 0 },
      renewables: { kgCO2e: 0 },
      locationBasedKgCO2e: 0,
      marketBasedKgCO2e: 0,
      monthsCount: 0,
    };
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

      const electricityLocation = result.scope2?.breakdown?.electricity || 
                                  result.scope2?.breakdown?.electricityLocation || 0;
      const electricityMarket = result.scope2?.breakdown?.electricityMarket || 0;
      const heatingKg = result.scope2?.breakdown?.heating || 0;
      
      const locationBasedTotal = electricityLocation + heatingKg;
      const marketBasedTotal = electricityMarket;

      let monthsCount = 0;
      try {
        const monthStatusResponse = await fetch(`${API_URL}/api/emissions/month-status?year=${resolvedYear}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (monthStatusResponse.ok) {
          const monthStatus = await monthStatusResponse.json();
          monthsCount = Object.values(monthStatus).filter(s => s !== "none").length;
        } else {
          if (result.scope1?.totalKgCO2e > 0 || result.scope2?.locationBasedKgCO2e > 0) {
            monthsCount = 1;
          }
        }
      } catch (err) {
        console.error("Failed to fetch month status:", err);
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
      // Clear stale totals so year-switch never shows previous year's data.
      set({
        scope1Results: emptyScope1,
        scope2Results: emptyScope2,
        selectedYear: resolvedYear,
      });
      return { success: false, error: error.message };
    }
  },

  // ─── Clear All (logout) ─────────────────────────────────────────────────
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
      selectedMonth:     null,
      loading:           false,
      error:             null,
      isSubmitting:      false,
    });
  },
}));