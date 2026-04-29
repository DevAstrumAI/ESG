const VEHICLE_TYPE_BY_CODE = {
  petrol_car: "Car",
  diesel_car: "Car",
  diesel_truck: "Truck",
  diesel_bus: "Bus",
  petrol_motorcycle: "Motorcycle",
  motorcycle: "Motorcycle",
  jet_aircraft_per_km: "Airplane",
  cargo_ship_hfo: "Ship",
  diesel_train: "Train",
  diesel_van: "Cargo van",
};

const FUEL_LABEL_BY_CODE = {
  petrol_car: "Petrol",
  diesel_car: "Diesel",
  diesel_truck: "Diesel",
  diesel_bus: "Diesel",
  petrol_motorcycle: "Petrol",
  motorcycle: "Petrol",
  jet_aircraft_per_km: "Jet Fuel",
  cargo_ship_hfo: "HFO",
  diesel_train: "Diesel",
  diesel_van: "Diesel",
};

const STATIONARY_FUEL_META = {
  biodiesel: { label: "Biodiesel", unit: "litres" },
  bioethanol: { label: "Bioethanol", unit: "litres" },
  biogas: { label: "Biogas", unit: "tons" },
  diesel: { label: "Diesel", unit: "litres" },
  cng: { label: "CNG", unit: "litres" },
  coal: { label: "Coal", unit: "tons" },
  heavy_fuel_oil: { label: "Heating Oil", unit: "litres" },
  lpg: { label: "LPG", unit: "litres" },
  petrol: { label: "Petrol", unit: "litres" },
  wood_pellets: { label: "Wood Pellets", unit: "tons" },
  kerosene: { label: "Kerosene", unit: "tons" },
  natural_gas: { label: "Natural Gas", unit: "kWh" },
};

const REFRIGERANT_LABEL_BY_CODE = {
  r134a: "R-134a",
  r410a: "R-410A",
  r22: "R-22",
  r404a: "R-404A",
  r407c: "R-407C",
  r32: "R-32",
  r507: "R-507",
  sf6: "SF6",
  hfc23: "HFC-23",
  pfc14: "PFC-14",
  pfc116: "PFC-116",
};

const REFRIGERANT_GWP_BY_CODE = {
  r134a: 1300,
  r410a: 2088,
  r22: 1760,
  r404a: 3942.8,
  r407c: 1624.21,
  r32: 67,
  r507: 3985,
  sf6: 23500,
  hfc23: 12400,
  pfc14: 6630,
  pfc116: 11100,
};

const FUGITIVE_SOURCE_LABELS = {
  methane: "Methane",
  n2o: "N2O",
};

const CERTIFICATE_LABEL_BY_CODE = {
  grid_average: "Grid Average",
  solar_ppa: "Solar PPA",
  wind_ppa: "Wind PPA",
  hydro_go: "Hydro GO",
  rec_ppa: "REC / I-REC",
};

const HEATING_TYPE_LABELS = {
  steam_hot_water: "Steam / Hot Water",
  district_cooling: "District Cooling",
  uae_average: "UAE Average",
  sg_average: "Singapore Average",
};

const RENEWABLE_TYPE_LABELS = {
  solar_ppa: "Solar PV / PPA",
  wind_ppa: "Wind PPA",
  hydro_go: "Hydro (GO)",
  nuclear_go: "Nuclear (GO)",
  rec_ppa: "REC / I-REC",
};

const normalizeId = (entry, fallbackId) => {
  if (entry?.id) return entry.id;
  return fallbackId || `${Date.now()}-${Math.random()}`;
};

export const normalizeScope1MobileEntry = (entry, fallbackId) => {
  const fuelCode = entry?.fuelType || "";
  return {
    id: normalizeId(entry, fallbackId),
    vehicleType: VEHICLE_TYPE_BY_CODE[fuelCode] || "Vehicle",
    fuelType: FUEL_LABEL_BY_CODE[fuelCode] || (String(fuelCode).includes("diesel") ? "Diesel" : "Petrol"),
    litres: entry?.litresConsumed ?? entry?.litres ?? 0,
    km: entry?.distanceKm ?? entry?.km ?? 0,
    vehicleCount: entry?.vehicleCount ?? entry?.count ?? 0,
    month: entry?.month ? String(entry.month) : "",
  };
};

export const normalizeScope1StationaryEntry = (entry, fallbackId) => {
  const key = entry?.fuelType || "";
  const meta = STATIONARY_FUEL_META[key] || { label: key || "Fuel", unit: "" };
  return {
    id: normalizeId(entry, fallbackId),
    equipment: entry?.equipment || meta.label,
    fuel: meta.label,
    fuelType: key,
    consumption: entry?.consumption ?? 0,
    unit: entry?.unit || meta.unit || "",
    month: entry?.month ? String(entry.month) : "",
  };
};

export const normalizeScope1RefrigerantEntry = (entry, fallbackId) => {
  const key = entry?.refrigerantType || entry?.refrigerantKey || "";
  return {
    id: normalizeId(entry, fallbackId),
    refrigerantType: REFRIGERANT_LABEL_BY_CODE[key] || key || "Refrigerant",
    refrigerantKey: key,
    leakageKg: entry?.leakageKg ?? 0,
    gwp: entry?.gwp ?? REFRIGERANT_GWP_BY_CODE[key] ?? 0,
    month: entry?.month ? String(entry.month) : "",
  };
};

export const normalizeScope1FugitiveEntry = (entry, fallbackId) => {
  const key = entry?.sourceType || "methane";
  return {
    id: normalizeId(entry, fallbackId),
    source: entry?.source || FUGITIVE_SOURCE_LABELS[key] || key || "Source",
    sourceType: key,
    emissionKg: entry?.emissionKg ?? entry?.amount ?? 0,
    amount: entry?.amount ?? entry?.emissionKg ?? 0,
    month: entry?.month ? String(entry.month) : "",
  };
};

export const normalizeScope2ElectricityEntry = (entry, fallbackId) => {
  const certificateType = entry?.certificateType || "grid_average";
  return {
    id: normalizeId(entry, fallbackId),
    facilityName: entry?.facilityName || "Main City",
    consumption: entry?.consumptionKwh ?? entry?.consumption ?? entry?.kwh ?? 0,
    certificateType,
    certificateLabel: CERTIFICATE_LABEL_BY_CODE[certificateType] || "Grid Average",
    method: entry?.method || (certificateType === "grid_average" ? "location" : "market"),
    month: entry?.month ? String(entry.month) : "",
  };
};

export const normalizeScope2HeatingEntry = (entry, fallbackId) => {
  const energyType = entry?.energyType || "steam_hot_water";
  return {
    id: normalizeId(entry, fallbackId),
    energyType,
    energyTypeLabel: HEATING_TYPE_LABELS[energyType] || entry?.energyType || "Heating",
    consumption: entry?.consumptionKwh ?? entry?.consumption ?? 0,
    month: entry?.month ? String(entry.month) : "",
  };
};

export const normalizeScope2RenewableEntry = (entry, fallbackId) => {
  const sourceType = entry?.sourceType || "solar_ppa";
  return {
    id: normalizeId(entry, fallbackId),
    sourceType,
    sourceTypeLabel: RENEWABLE_TYPE_LABELS[sourceType] || entry?.sourceType || "Renewable",
    consumption: entry?.generationKwh ?? entry?.consumption ?? 0,
    month: entry?.month ? String(entry.month) : "",
  };
};
