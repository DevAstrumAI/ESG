// For your existing calculations (keep as object)
export const emissionFactors = {
  car: 0.2,
  truck: 0.5,
  bus: 0.3,
  "Diesel (liters)": 2.68,
  "Petrol (liters)": 2.31,
  "Natural Gas": 2.0,
  electricity: 0.45,
  heating: 0.07,
};

// FOR ADMIN PAGE - add this array
export const emissionFactorsList = [
  { id: 1, category: "Car", region: "Global", value: 0.2, unit: "kgCO₂e/km" },
  { id: 2, category: "Truck", region: "Global", value: 0.5, unit: "kgCO₂e/km" },
  { id: 3, category: "Diesel", region: "Global", value: 2.68, unit: "kgCO₂e/L" },
  { id: 4, category: "Petrol", region: "Global", value: 2.31, unit: "kgCO₂e/L" },
  { id: 5, category: "Natural Gas", region: "Global", value: 2.0, unit: "kgCO₂e/L" },
  { id: 6, category: "Electricity", region: "Global", value: 0.45, unit: "kgCO₂e/kWh" },
  { id: 7, category: "Heating", region: "Global", value: 0.07, unit: "kgCO₂e/MJ" },
];