#!/usr/bin/env python3
"""
One-time UAE Scope 2 normalization migration.

Goals:
1) Ensure `district_cooling` exists under `heating` (copy from `cooling` when needed)
2) Promote heating/cooling/electricity factor keys to top level (Saudi-like convenience)
3) Keep existing grouped maps by default (safe), unless --strip-groups is provided

Usage:
  cd backend
  python scripts/normalize_uae_scope2_heating_factors.py --dry-run
  python scripts/normalize_uae_scope2_heating_factors.py --apply
  python scripts/normalize_uae_scope2_heating_factors.py --apply --city dubai
"""

import argparse
import os
import sys
from typing import Dict, Tuple

CURRENT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.utils.firebase import get_db  # noqa: E402

UAE_CITY_CANDIDATES = [
    "abu-dhabi",
    "ajman",
    "dubai",
    "fujairah",
    "ras-al-khaimah",
    "sharjah",
    "umm-al-quwain",
]


def iter_scope2_docs(db, city_filter=None):
    cities = [city_filter] if city_filter else UAE_CITY_CANDIDATES
    for city in cities:
        for scope_node in ("scope2", "('scope2',)"):
            path = (
                f"emissionFactors/regions/middle-east/countries/uae/"
                f"cities/city_data/{city}/{scope_node}/factors"
            )
            ref = db.document(path)
            snap = ref.get()
            if snap.exists:
                yield {
                    "city": city,
                    "scope_node": scope_node,
                    "doc_ref": ref,
                    "data": snap.to_dict() or {},
                }


def patch_doc(data: Dict, overwrite_top_level=False, strip_groups=False) -> Tuple[Dict, int]:
    patched = dict(data)
    changed = 0

    heating = patched.get("heating")
    if not isinstance(heating, dict):
        heating = {}

    cooling = patched.get("cooling")
    if not isinstance(cooling, dict):
        cooling = {}

    # 1) Normalize district cooling placement
    district = cooling.get("district_cooling")
    if district is not None and "district_cooling" not in heating:
        heating["district_cooling"] = district
        changed += 1

    patched["heating"] = heating

    # 2) Promote grouped keys to top-level
    for group_key in ("electricity", "heating", "cooling"):
        group = patched.get(group_key)
        if not isinstance(group, dict):
            continue
        for key, value in group.items():
            if key in patched and not overwrite_top_level:
                continue
            patched[key] = value
            changed += 1

    # 3) Optional strip groups
    if strip_groups:
        for g in ("electricity", "heating", "cooling"):
            if g in patched:
                patched.pop(g, None)
                changed += 1

    return patched, changed


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Apply writes. Default is dry-run.")
    parser.add_argument("--dry-run", action="store_true", help="Dry-run mode (default).")
    parser.add_argument("--city", type=str, default=None, help="Single UAE city slug")
    parser.add_argument("--overwrite-top-level", action="store_true")
    parser.add_argument("--strip-groups", action="store_true")
    args = parser.parse_args()

    db = get_db()
    do_apply = bool(args.apply)

    scanned = 0
    changed_docs = 0
    changed_fields = 0

    for row in iter_scope2_docs(db, city_filter=args.city):
        scanned += 1
        patched, changed = patch_doc(
            row["data"],
            overwrite_top_level=args.overwrite_top_level,
            strip_groups=args.strip_groups,
        )
        if changed <= 0:
            continue

        changed_docs += 1
        changed_fields += changed
        print(f"[MATCH] city={row['city']} scope={row['scope_node']} changed_fields={changed}")

        if do_apply:
            row["doc_ref"].set(patched)
            print("  -> applied")
        else:
            print("  -> dry-run only")

    print("\n=== Scope2 Normalization Summary ===")
    print(f"Mode: {'APPLY' if do_apply else 'DRY-RUN'}")
    print(f"Scanned docs: {scanned}")
    print(f"Changed docs: {changed_docs}")
    print(f"Changed fields: {changed_fields}")


if __name__ == "__main__":
    main()

