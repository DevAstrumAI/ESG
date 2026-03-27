// src/store/settingsStore.js
import { create } from "zustand";
import { settingsAPI } from "../services/api";

export const useSettingsStore = create((set, get) => ({
  reportingYear: new Date().getFullYear(),
  currency: "USD",
  region: "UAE",
  distanceUnit: "km",
  fuelUnit: "litres",
  electricityUnit: "kWh",
  heatUnit: "MJ",
  factorSource: "UAE MoCCaE",

  updateSetting: (key, value) => set(() => ({ [key]: value })),

  resetSettings: () =>
    set(() => ({
      reportingYear: new Date().getFullYear(),
      currency: "USD",
      region: "UAE",
      distanceUnit: "km",
      fuelUnit: "litres",
      electricityUnit: "kWh",
      heatUnit: "MJ",
      factorSource: "UAE MoCCaE",
    })),

  fetchSettings: async (token) => {
    try {
      const { settings } = await settingsAPI.get(token);
      set({
        reportingYear: settings.reportingPreferences?.defaultYear || new Date().getFullYear(),
        currency: settings.reportingPreferences?.currency || "USD",
        region: settings.reportingPreferences?.region || "UAE",
        distanceUnit: settings.reportingPreferences?.distanceUnit || "km",
        fuelUnit: settings.reportingPreferences?.fuelUnit || "litres",
        electricityUnit: settings.reportingPreferences?.electricityUnit || "kWh",
        heatUnit: settings.reportingPreferences?.heatUnit || "MJ",
        factorSource: settings.factorSource || "UAE MoCCaE",
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  saveSettings: async (token, updates) => {
    try {
      await settingsAPI.update(token, {
        reportingPreferences: {
          defaultYear:      updates.reportingYear,
          currency:         updates.currency,
          region:           updates.region,
          distanceUnit:     updates.distanceUnit,
          fuelUnit:         updates.fuelUnit,
          electricityUnit:  updates.electricityUnit,
          heatUnit:         updates.heatUnit,
        },
        factorSource: updates.factorSource,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
}));