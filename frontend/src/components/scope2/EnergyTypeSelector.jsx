import SelectDropdown from "../ui/SelectDropdown";

export default function EnergyTypeSelector({ value, onChange }) {
  return (
    <SelectDropdown
      label="Energy Type"
      value={value}
      onChange={onChange}
      options={[
        { label: "Grid Electricity", value: "electricity" },
        { label: "District Heating", value: "heating" },
        { label: "Cooling", value: "cooling" },
        { label: "Steam", value: "steam" },
      ]}
    />
  );
}
