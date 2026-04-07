// src/components/scope1/VehicleTable.jsx
import React, { useState } from "react";
import emissionsAPI from "../../services/api";
import { useEmissionStore } from "../../store/emissionStore";
import { FiTrash2, FiTruck } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";

const DISTANCE_BASED_TYPES = new Set([
  "jet_aircraft_per_km",
  "cargo_ship_hfo",
  "marine_hfo",
  "diesel_train",
  "diesel_bus",
]);

function mapVehicleFuelType(vehicleType, fuelTypeUI) {
  const type = (vehicleType || "").toLowerCase();
  const fuel = (fuelTypeUI || "").toLowerCase();
  if (type === "car"        && fuel === "petrol")  return "petrol_car";
  if (type === "car"        && fuel === "diesel")  return "diesel_car";
  if (type === "truck"      && fuel === "diesel")  return "diesel_truck";
  if (type === "bus"        && fuel === "diesel")  return "diesel_bus";
  if (type === "motorcycle" && fuel === "petrol")  return "petrol_motorcycle";
  if (type === "motorcycle")                        return "motorcycle";
  if (type === "motorboat")                         return "motorboat_gasoline";
  if (type === "cargo van"  && fuel === "diesel")  return "diesel_van";
  if (type === "airplane")                          return "jet_aircraft_per_km";
  if (type === "ship")                              return "cargo_ship_hfo";
  if (type === "train"      && fuel === "diesel")  return "diesel_train";
  return fuel === "petrol" ? "petrol_car" : "diesel_car";
}

const VEHICLE_OPTIONS = [
  "Car", "Truck", "Bus", "Ship", "Airplane",
  "Train", "Cargo van", "Motorboat", "Motorcycle", "Other",
];
const FUEL_OPTIONS = ["Petrol", "Diesel", "LPG", "Biodiesel", "Other"];

const MONTHS = [
  "2026-01","2026-02","2026-03","2026-04","2026-05","2026-06",
  "2026-07","2026-08","2026-09","2026-10","2026-11","2026-12",
  "2025-01","2025-02","2025-03","2025-04","2025-05","2025-06",
  "2025-07","2025-08","2025-09","2025-10","2025-11","2025-12",
];

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function VehicleTable({ onSubmitSuccess }) {
  const vehicles      = useEmissionStore((s) => s.scope1Vehicles);
  const addVehicle    = useEmissionStore((s) => s.addScope1Vehicle);
  const deleteVehicle = useEmissionStore((s) => s.deleteScope1Vehicle);
  const selectedYear  = useEmissionStore((s) => s.selectedYear);
  const token = useAuthStore((s) => s.token);

  const handleDeleteVehicle = async (id, month) => {
    const deleted = vehicles.find((v) => v.id === id);
    if (!deleted) return;

    const fuelType = mapVehicleFuelType(deleted.vehicleType, deleted.fuelType);
    const entry = DISTANCE_BASED_TYPES.has(fuelType)
      ? { fuelType, distanceKm: Number(deleted.km || 0) }
      : { fuelType, litresConsumed: Number(deleted.litres || 0) };

    const [year] = month ? month.split("-").map(Number) : [selectedYear];

    try {
      await emissionsAPI.deleteScope1Entry(token, {
        year,
        month,
        category: "mobile",
        entry,
      });
      deleteVehicle(id);
    } catch (error) {
      console.error("Failed to delete vehicle entry:", error);
    }
  };

  const [vehicleType, setVehicleType] = useState("");
  const [fuelType, setFuelType]       = useState("");
  const [quantity, setQuantity]       = useState("");
  const [month, setMonth]             = useState(currentMonth());

  const mappedFuelType = vehicleType && fuelType
    ? mapVehicleFuelType(vehicleType, fuelType)
    : "";
  const useDistance = DISTANCE_BASED_TYPES.has(mappedFuelType);

  const handleAddRow = () => {
    if (!vehicleType || !fuelType || quantity === "") return;
    addVehicle({
      id: Date.now(),
      vehicleType,
      fuelType,
      km:     useDistance ? Number(quantity) : 0,
      litres: useDistance ? 0 : Number(quantity),
      month,
    });
    setVehicleType("");
    setFuelType("");
    setQuantity("");
    setMonth(currentMonth());
  };

  return (
    <div className="vt-wrap">
      <div className="vt-desc-header">
        <FiTruck className="vt-header-icon" />
        <p className="vt-desc">
          Road vehicles use <strong>litres consumed</strong>. Aviation, marine, and rail use <strong>distance (km)</strong>.
        </p>
      </div>

      <div className="vt-table-wrap">
        <table className="vt-table">
          <thead>
            <tr>
              <th>Vehicle Type</th>
              <th>Fuel Type</th>
              <th>Quantity</th>
              <th>Month</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={5} className="vt-empty">
                  No entries yet. Fill the row below and click + Add.
                </td>
              </tr>
            )}

            {vehicles.map((v) => {
              const ft = mapVehicleFuelType(v.vehicleType, v.fuelType);
              const isDistRow = DISTANCE_BASED_TYPES.has(ft);
              const qty  = isDistRow ? v.km : v.litres;
              const unit = isDistRow ? "km" : "L";
              return (
                <tr key={v.id}>
                  <td>{v.vehicleType}</td>
                  <td>{v.fuelType}</td>
                  <td>
                    <span className="vt-qty">{qty}</span>
                    <span className="vt-unit"> {unit}</span>
                  </td>
                  <td>{v.month || "—"}</td>
                  <td>
                    <button
                      className="vt-delete"
                      onClick={() => deleteVehicle(v.id)}
                      title="Remove"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* ── Inline Add Row ── */}
            <tr className="vt-add-row">
              <td>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="vt-select"
                >
                  <option value="">Vehicle Type</option>
                  {VEHICLE_OPTIONS.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  className="vt-select"
                >
                  <option value="">Fuel Type</option>
                  {FUEL_OPTIONS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </td>
              <td>
                <div className="vt-qty-input">
                  <input
                    type="number"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="vt-input"
                    min="0"
                  />
                  <span className="vt-unit-tag">
                    {mappedFuelType ? (useDistance ? "km" : "L") : "—"}
                  </span>
                </div>
              </td>
              <td>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="vt-select"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </td>
              {/* ── Add button at end of row ── */}
              <td>
                <button className="vt-add-btn-inline" onClick={handleAddRow}>
                  + Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Footer: submit only ── */}

      <style jsx>{`
        .vt-wrap { width: 100%; }

        .vt-desc-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        .vt-header-icon { font-size: 18px; color: #2E7D64; }
        .vt-desc { font-size: 13px; color: #6B7280; margin: 0; }
        .vt-desc strong { color: #1B4D3E; }

        .vt-table-wrap {
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          overflow: hidden;
        }

        .vt-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .vt-table thead tr { background: #F9FAFB; }

        .vt-table th {
          text-align: left;
          padding: 11px 14px;
          font-size: 12px;
          font-weight: 600;
          color: #6B7280;
          border-bottom: 1px solid #E5E7EB;
        }

        .vt-table td {
          padding: 11px 14px;
          color: #111827;
          border-bottom: 1px solid #F3F4F6;
          vertical-align: middle;
        }

        .vt-table tbody tr:last-child td { border-bottom: none; }

        .vt-empty {
          text-align: center;
          color: #9CA3AF;
          font-size: 13px;
          padding: 28px 0 !important;
        }

        .vt-qty { font-weight: 500; }
        .vt-unit { font-size: 12px; color: #6B7280; }

        .vt-delete {
          background: none;
          border: none;
          color: #9CA3AF;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
        }
        .vt-delete:hover { color: #DC2626; background: #FEF2F2; }

        .vt-add-row td { background: #FAFAFA; border-top: 1px solid #E5E7EB; }

        .vt-select {
          width: 100%;
          padding: 7px 10px;
          border: 1px solid #E5E7EB;
          border-radius: 7px;
          font-size: 13px;
          background: white;
          color: #374151;
          outline: none;
        }
        .vt-select:focus { border-color: #2E7D64; }

        .vt-qty-input {
          display: flex;
          align-items: center;
          border: 1px solid #E5E7EB;
          border-radius: 7px;
          background: white;
          overflow: hidden;
        }
        .vt-qty-input:focus-within { border-color: #2E7D64; }

        .vt-input {
          flex: 1;
          border: none;
          outline: none;
          padding: 7px 10px;
          font-size: 13px;
          background: transparent;
          min-width: 60px;
        }

        .vt-unit-tag {
          padding: 0 10px;
          font-size: 12px;
          color: #6B7280;
          background: #F3F4F6;
          border-left: 1px solid #E5E7EB;
          display: flex;
          align-items: center;
          min-height: 33px;
          white-space: nowrap;
        }

        .vt-add-btn-inline {
          padding: 7px 14px;
          background: #1B4D3E;
          color: white;
          border: none;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s;
        }
        .vt-add-btn-inline:hover { background: #2E7D64; }

        .vt-footer {
          display: flex;
          justify-content: flex-end;
          padding: 16px 0 0 0;
          margin-top: 16px;
        }

        .vt-footer-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .vt-error { font-size: 13px; color: #DC2626; }

        .vt-submit-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #1B4D3E;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .vt-submit-btn:hover:not(:disabled) { background: #2E7D64; }
        .vt-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .vt-submit-btn.submitted { background: #059669; }

        @media (max-width: 640px) {
          .vt-table th:nth-child(4),
          .vt-table td:nth-child(4) { display: none; }
        }
      `}</style>
    </div>
  );
}