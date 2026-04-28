import { useSelectedLocationStore, locationKey } from "../../store/selectedLocationStore";
import ThemedSelect from "../ui/ThemedSelect";

const COUNTRY_LABEL = {
  uae: "UAE",
  qatar: "Qatar",
  "saudi-arabia": "Saudi Arabia",
  singapore: "Singapore",
};

function labelForLocation(loc) {
  const r = loc.region ? `${String(loc.region).replace("-", " ")} / ` : "";
  const c = COUNTRY_LABEL[loc.country] || loc.country;
  const branch = (loc.branch || "").trim();
  return `${r}${loc.city}, ${c}${branch ? ` - ${branch}` : ""}`;
}

export default function FacilityCitySelect({ company, disabled, menuDirection = "up", layout = "default" }) {
  const locationKeyVal = useSelectedLocationStore((s) => s.locationKey);
  const setLocationKey = useSelectedLocationStore((s) => s.setLocationKey);
  const locs = company?.locations || [];

  const selectedLocation = (() => {
    const found = locs.find((l) => locationKey(l.region, l.country, l.city, l.branch) === locationKeyVal);
    return found || locs[0];
  })();

  const regionOptions = (() => {
    const seen = new Set();
    return locs
      .filter((loc) => {
        const key = String(loc.region || "").toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((loc) => ({
        value: loc.region,
        label: String(loc.region || "").replace("-", " "),
      }));
  })();

  const countryOptions = (() => {
    const seen = new Set();
    const region = selectedLocation?.region || regionOptions[0]?.value;
    return locs
      .filter((loc) => {
        if (region && loc.region !== region) return false;
        const key = (loc.country || "").toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((loc) => ({
        value: loc.country,
        label: COUNTRY_LABEL[loc.country] || loc.country,
      }));
  })();

  const cityOptions = (() => {
    const region = selectedLocation?.region || regionOptions[0]?.value;
    const country = selectedLocation?.country || countryOptions[0]?.value;
    return locs
      .filter((loc) => (!region || loc.region === region) && loc.country === country)
      .map((loc) => ({
        value: loc.city,
        label: loc.city,
      }));
  })();

  const branchOptions = (() => {
    const region = selectedLocation?.region || regionOptions[0]?.value;
    const country = selectedLocation?.country || countryOptions[0]?.value;
    const city = selectedLocation?.city || cityOptions[0]?.value;
    return locs
      .filter((loc) => (!region || loc.region === region) && loc.country === country && loc.city === city)
      .map((loc) => ({
        value: loc.branch || "",
        label: loc.branch || "Main",
      }));
  })();

  const handleRegionChange = (region) => {
    if (!region) return;
    const firstForRegion = locs.find((loc) => loc.region === region);
    if (!firstForRegion) return;
    setLocationKey(locationKey(firstForRegion.region, firstForRegion.country, firstForRegion.city, firstForRegion.branch));
  };

  if (!locs.length) return null;

  const handleCountryChange = (country) => {
    if (!country) return;
    const firstForCountry = locs.find((loc) => loc.country === country);
    if (!firstForCountry) return;
    setLocationKey(locationKey(firstForCountry.region, country, firstForCountry.city, firstForCountry.branch));
  };

  const handleCityChange = (city) => {
    if (!city) return;
    const country = selectedLocation?.country || countryOptions[0]?.value;
    const firstForCity = locs.find((loc) => loc.country === country && loc.city === city);
    if (!country || !firstForCity) return;
    setLocationKey(locationKey(firstForCity.region, country, city, firstForCity.branch));
  };

  const handleBranchChange = (branch) => {
    const country = selectedLocation?.country || countryOptions[0]?.value;
    const city = selectedLocation?.city || cityOptions[0]?.value;
    if (!country || !city) return;
    const region = selectedLocation?.region || regionOptions[0]?.value;
    setLocationKey(locationKey(region, country, city, branch));
  };

  return (
    <div className={`facility-city-select ${layout === "dashboard" ? "dashboard-layout" : ""}`}>
      <div className="selector-block">
        <label>Region</label>
        <ThemedSelect
          value={selectedLocation?.region || ""}
          onChange={handleRegionChange}
          options={regionOptions}
          placeholder="Select Region"
          disabled={disabled}
          className="location-select"
          menuDirection={menuDirection}
        />
      </div>
      <div className="selector-block">
        <label>Country</label>
        <ThemedSelect
          value={selectedLocation?.country || ""}
          onChange={handleCountryChange}
          options={countryOptions}
          placeholder="Select Country"
          disabled={disabled}
          className="location-select"
          menuDirection={menuDirection}
        />
      </div>
      <div className="selector-block">
        <label>City</label>
        <ThemedSelect
          value={selectedLocation?.city || ""}
          onChange={handleCityChange}
          options={cityOptions}
          placeholder="Select City"
          disabled={disabled}
          className="location-select"
          menuDirection={menuDirection}
        />
      </div>
      <div className="selector-block">
        <label>Branch</label>
        <ThemedSelect
          value={selectedLocation?.branch || ""}
          onChange={handleBranchChange}
          options={branchOptions}
          placeholder="Select Branch"
          disabled={disabled}
          className="location-select"
          menuDirection={menuDirection}
        />
      </div>
      <div className="selected-text" title={labelForLocation(selectedLocation || locs[0])}>
        {labelForLocation(selectedLocation || locs[0])}
      </div>
      <input
        type="hidden"
        value={locationKeyVal || locationKey(locs[0].region, locs[0].country, locs[0].city, locs[0].branch)}
        disabled={disabled}
        readOnly
      />
      <style jsx>{`
        .facility-city-select {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          min-width: 0;
          width: 100%;
        }
        .selector-block {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1 1 210px;
          min-width: 0;
        }
        label {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          white-space: nowrap;
        }
        .location-select {
          width: 100%;
          min-width: 140px;
          max-width: none;
        }
        .selected-text {
          flex: 1 1 100%;
          min-width: 220px;
          font-size: 12px;
          color: #6b7280;
          white-space: normal;
          overflow: visible;
          text-overflow: clip;
          text-align: left;
        }
        @media (max-width: 960px) {
          .facility-city-select {
            overflow: visible;
            padding-bottom: 2px;
          }
          .selector-block { flex: 1 1 100%; }
          .selected-text { min-width: 100%; }
        }
        @media (max-width: 640px) {
          .selector-block { flex: 1 1 100%; }
        }
        .facility-city-select.dashboard-layout {
          display: grid;
          grid-template-columns: repeat(4, minmax(170px, 1fr));
          gap: 10px 12px;
          align-items: end;
          width: 100%;
        }
        .facility-city-select.dashboard-layout .selector-block {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 4px;
          min-width: 0;
        }
        .facility-city-select.dashboard-layout label {
          font-size: 11px;
          font-weight: 700;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .facility-city-select.dashboard-layout .selected-text {
          grid-column: 1 / -1;
          margin-top: -2px;
          font-size: 12px;
          color: #6B7280;
        }
        @media (max-width: 1100px) {
          .facility-city-select.dashboard-layout {
            grid-template-columns: repeat(2, minmax(170px, 1fr));
          }
        }
        @media (max-width: 700px) {
          .facility-city-select.dashboard-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
