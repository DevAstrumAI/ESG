import { useMemo, useState } from "react";
import Modal from "../ui/Modal";
import ThemedSelect from "../ui/ThemedSelect";
import PrimaryButton from "../ui/PrimaryButton";

export default function AddOtherLocationDialog({ isOpen, onClose, company, onSubmit }) {
  const locations = company?.locations || [];
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [branch, setBranch] = useState("");

  const regionOptions = useMemo(() => {
    const seen = new Set();
    return locations
      .filter((loc) => {
        const key = String(loc.region || "").toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((loc) => ({ value: loc.region, label: String(loc.region || "").replace("-", " ") }));
  }, [locations]);

  const countryOptions = useMemo(() => {
    const seen = new Set();
    return locations
      .filter((loc) => {
        if (region && loc.region !== region) return false;
        const key = String(loc.country || "").toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((loc) => ({ value: loc.country, label: String(loc.country || "").toUpperCase() }));
  }, [locations, region]);

  const cityOptions = useMemo(() => {
    if (!country) return [];
    const seen = new Set();
    return locations
      .filter((loc) => (!region || loc.region === region) && loc.country === country)
      .filter((loc) => {
        const key = String(loc.city || "").toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((loc) => ({ value: loc.city, label: loc.city }));
  }, [locations, region, country]);

  const branchOptions = useMemo(() => {
    if (!country || !city) return [];
    return locations
      .filter((loc) => (!region || loc.region === region) && loc.country === country && loc.city === city)
      .map((loc) => ({ value: loc.branch || "", label: loc.branch || "Main" }));
  }, [locations, region, country, city]);

  const submit = () => {
    if (!region || !country || !city || !branch) return;
    onSubmit?.({ region, country, city, branch });
    onClose?.();
  };

  return (
    <Modal title="Add Other Locations" isOpen={isOpen} onClose={onClose}>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Region</label>
          <ThemedSelect
            value={region}
            onChange={(v) => {
              setRegion(v);
              setCountry("");
              setCity("");
              setBranch("");
            }}
            options={regionOptions}
            placeholder="Select region"
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Country</label>
          <ThemedSelect
            value={country}
            onChange={(v) => {
              setCountry(v);
              setCity("");
              setBranch("");
            }}
            options={countryOptions}
            placeholder="Select country"
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>City</label>
          <ThemedSelect
            value={city}
            onChange={(v) => {
              setCity(v);
              setBranch("");
            }}
            options={cityOptions}
            placeholder="Select city"
            disabled={!region}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Branch</label>
          <ThemedSelect
            value={branch}
            onChange={setBranch}
            options={branchOptions}
            placeholder="Select branch"
            disabled={!region || !country || !city}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <PrimaryButton onClick={submit} disabled={!region || !country || !city || !branch}>
            Submit
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
