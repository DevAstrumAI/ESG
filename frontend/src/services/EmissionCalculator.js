// src/services/EmissionCalculator.js

export const EmissionCalculator = {
  calculateScope1: ({ vehicles, stationary, refrigerants, fugitive }) => {
    const vehicleTotal = vehicles.reduce((sum, v) => sum + Number(v.km || 0), 0);
    const stationaryTotal = stationary.reduce((sum, s) => sum + Number(s.consumption || 0), 0);
    const refrigerantsTotal = refrigerants.reduce((sum, r) => sum + Number(r.gwp || 0), 0);
    const fugitiveTotal = fugitive.reduce((sum, f) => sum + Number(f.amount || 0), 0);

    return vehicleTotal + stationaryTotal + refrigerantsTotal + fugitiveTotal;
  },

  calculateScope2: ({ electricity, heating, renewable }) => {
    const electricityTotal = electricity.reduce((sum, e) => sum + Number(e.consumption || e.kwh || 0), 0);
    const heatingTotal = heating.reduce((sum, h) => sum + Number(h.consumption || 0), 0);
    const renewableTotal = renewable.reduce((sum, r) => sum + Number(r.consumption || 0), 0);

    return electricityTotal + heatingTotal + renewableTotal;
  },
};
