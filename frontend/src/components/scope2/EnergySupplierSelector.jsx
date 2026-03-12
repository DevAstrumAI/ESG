import SelectDropdown from "../ui/SelectDropdown";

export default function EnergySupplierSelector({ value, onChange }) {
  return (
    <SelectDropdown
      label="Energy Supplier"
      value={value}
      onChange={onChange}
      options={[
        { label: "Default National Grid Mix", value: "grid" },
        { label: "Renewable Supplier", value: "renewable" },
        { label: "Custom Supplier (future)", value: "custom" },
      ]}
    />
  );
}
