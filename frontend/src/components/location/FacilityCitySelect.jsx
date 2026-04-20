import { FiMapPin } from "react-icons/fi";
import { useSelectedLocationStore, locationKey } from "../../store/selectedLocationStore";

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

export default function FacilityCitySelect({ company, disabled }) {
  const locationKeyVal = useSelectedLocationStore((s) => s.locationKey);
  const setLocationKey = useSelectedLocationStore((s) => s.setLocationKey);
  const locs = company?.locations || [];

  if (!locs.length) return null;

  return (
    <div className="facility-city-select">
      <FiMapPin className="pin" aria-hidden />
      <label htmlFor="facility-city-select">City</label>
      <select
        id="facility-city-select"
        value={locationKeyVal || locationKey(locs[0].country, locs[0].city)}
        onChange={(e) => setLocationKey(e.target.value)}
        disabled={disabled}
      >
        {locs.map((loc) => {
          const v = locationKey(loc.country, loc.city);
          return (
            <option key={v} value={v}>
              {labelForLocation(loc)}
            </option>
          );
        })}
      </select>
      <style jsx>{`
        .facility-city-select {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: nowrap;
          white-space: nowrap;
        }
        .pin {
          color: #2e7d64;
          flex-shrink: 0;
        }
        label {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }
        select {
          min-width: 220px;
          width: fit-content;
          max-width: 320px;
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          background: #fff;
          cursor: pointer;
          text-align: left;
        }
        select:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
