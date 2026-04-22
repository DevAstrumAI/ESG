import { create } from "zustand";
import { persist } from "zustand/middleware";

export function locationKey(country, city) {
  const c = (country || "").trim().toLowerCase().replace(/\s+/g, "-");
  const t = (city || "").trim().toLowerCase();
  return `${c}|${t}`;
}

export const useSelectedLocationStore = create(
  persist(
    (set, get) => ({
      companyId: null,
      locationKey: null,
      setLocationKey: (key) => set({ locationKey: key }),
      syncFromCompany: (company) => {
        const id = company?.id ?? company?.basicInfo?.name ?? null;
        const locs = company?.locations || [];
        if (!locs.length) {
          set({ companyId: id, locationKey: null });
          return;
        }
        if (get().companyId !== id) {
          const first = locs[0];
          set({ companyId: id, locationKey: locationKey(first.country, first.city) });
          return;
        }
        const k = get().locationKey;
        const valid = locs.some((l) => locationKey(l.country, l.city) === k);
        if (!k || !valid) {
          const first = locs[0];
          set({ locationKey: locationKey(first.country, first.city) });
        }
      },
      getSelectedLocation: (company) => {
        const locs = company?.locations || [];
        if (!locs.length) return null;
        const k = get().locationKey;
        const found = locs.find((l) => locationKey(l.country, l.city) === k);
        return found || locs[0];
      },
    }),
    { name: "esg-selected-facility" }
  )
);
