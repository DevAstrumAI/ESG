// src/utils/UnitConverter.js

/**
 * UnitConverter Utility
 * Standardizes all activity data into common units.
 *
 * Later EmissionCalculator will rely on these conversions.
 */

export const UnitConverter = {
  // ----------------------------
  // Energy Conversions
  // ----------------------------

  // kWh → MJ
  kwhToMJ(kwh) {
    return Number(kwh) * 3.6;
  },

  // MJ → kWh
  mjToKwh(mj) {
    return Number(mj) / 3.6;
  },

  // ----------------------------
  // Mass Conversions
  // ----------------------------

  // tons → kg
  tonsToKg(tons) {
    return Number(tons) * 1000;
  },

  // kg → tons
  kgToTons(kg) {
    return Number(kg) / 1000;
  },

  // ----------------------------
  // Volume Conversions
  // ----------------------------

  // liters → m³
  litersToCubicMeters(liters) {
    return Number(liters) / 1000;
  },

  // m³ → liters
  cubicMetersToLiters(m3) {
    return Number(m3) * 1000;
  },

  // ----------------------------
  // Distance Conversions
  // ----------------------------

  // km → miles
  kmToMiles(km) {
    return Number(km) * 0.621371;
  },

  // miles → km
  milesToKm(miles) {
    return Number(miles) / 0.621371;
  },
};
