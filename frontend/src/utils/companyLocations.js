/**
 * Region / country / city helpers for company setup and validation.
 * Must stay aligned with CountrySelector + LocationManager options.
 */

export const countriesByRegion = {
  "middle-east": [
    { label: "🇦🇪 United Arab Emirates", value: "uae" },
    { label: "🇸🇦 Saudi Arabia", value: "saudi-arabia" },
  ],
  "asia-pacific": [{ label: "🇸🇬 Singapore", value: "singapore" }],
};

export const citiesByCountry = {
  uae: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"],
  qatar: ["Doha", "Al Wakrah", "Al Khor", "Al Rayyan"],
  "saudi-arabia": ["Riyadh", "Jeddah", "Dammam", "Khobar", "Medina", "Mecca"],
  singapore: ["Singapore"],
};

export function getValidCountryValuesForRegion(region) {
  return (countriesByRegion[region] || []).map((c) => c.value);
}

export function filterLocationsForRegion(region, locations = []) {
  const valid = new Set(getValidCountryValuesForRegion(region));
  return (locations || []).filter((loc) => loc?.country && valid.has(loc.country));
}
