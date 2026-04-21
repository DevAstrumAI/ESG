import { useSelectedLocationStore, locationKey } from "../../store/selectedLocationStore";
import ThemedSelect from "../ui/ThemedSelect";

const COUNTRY_LABEL = {
  uae: "UAE",
  qatar: "Qatar",
  "saudi-arabia": "Saudi Arabia",
  singapore: "Singapore",
};

function labelForLocation(loc) {
  const c = COUNTRY_LABEL[loc.country] || loc.country;
  return `${loc.city}, ${c}`;
}

export default function FacilityCitySelect({ company, disabled, menuDirection = "up" }) {
  const locationKeyVal = useSelectedLocationStore((s) => s.locationKey);
  const setLocationKey = useSelectedLocationStore((s) => s.setLocationKey);
  const locs = company?.locations || [];

  const selectedLocation = (() => {
    const found = locs.find((l) => locationKey(l.country, l.city) === locationKeyVal);
    return found || locs[0];
  })();

  const countryOptions = (() => {
    const seen = new Set();
    return locs
      .filter((loc) => {
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
    const country = selectedLocation?.country || countryOptions[0]?.value;
    return locs
      .filter((loc) => loc.country === country)
      .map((loc) => ({
        value: loc.city,
        label: loc.city,
      }));
  })();

  if (!locs.length) return null;

  const handleCountryChange = (country) => {
    if (!country) return;
    const firstCityForCountry = locs.find((loc) => loc.country === country)?.city;
    if (!firstCityForCountry) return;
    setLocationKey(locationKey(country, firstCityForCountry));
  };

  const handleCityChange = (city) => {
    if (!city) return;
    const country = selectedLocation?.country || countryOptions[0]?.value;
    if (!country) return;
    setLocationKey(locationKey(country, city));
  };

  return (
    <div className="facility-city-select">
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
      <div className="selected-text" title={labelForLocation(selectedLocation || locs[0])}>
        {labelForLocation(selectedLocation || locs[0])}
      </div>
      <input
        type="hidden"
        value={locationKeyVal || locationKey(locs[0].country, locs[0].city)}
        disabled={disabled}
        readOnly
      />
      <style jsx>{`
        .facility-city-select {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: nowrap;
          min-width: 0;
        }
        .selector-block {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 0 0 auto;
          min-width: 0;
        }
        label {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          white-space: nowrap;
        }
        .location-select {
          width: 200px;
          min-width: 180px;
          max-width: 240px;
        }
        .selected-text {
          flex: 0 1 auto;
          min-width: 0;
          font-size: 12px;
          color: #6b7280;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: left;
        }
        @media (max-width: 960px) {
          .facility-city-select {
            overflow-x: auto;
            padding-bottom: 2px;
          }
          .selected-text {
            display: none;
          }
          .location-select {
            width: 180px;
            min-width: 170px;
          }
        }
        @media (max-width: 640px) {
          .location-select {
            width: 170px;
            min-width: 160px;
          }
        }
      `}</style>
    </div>
  );
}
