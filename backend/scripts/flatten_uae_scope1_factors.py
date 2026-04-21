#!/usr/bin/env python3
"""
One-time Firestore migration:
Flatten UAE Scope 1 factor docs so factor keys are available at top level
(Saudi-like structure), optionally removing grouped categories.

This script reads:
  emissionFactors/regions/<region>/countries/uae/cities/city_data/<city>/(scope1|('scope1',))/factors

It promotes keys from grouped maps:
  mobile, stationary, refrigerants, fugitive
into top-level keys:
  petrol_car, diesel, r410a, methane, ...

Usage:
  cd backend
  python scripts/flatten_uae_scope1_factors.py --dry-run
  python scripts/flatten_uae_scope1_factors.py --apply

Optional:
  --city dubai               # run one emirate only
  --strip-groups             # remove mobile/stationary/refrigerants/fugitive maps after flattening
  --overwrite-top-level      # grouped keys override existing top-level keys
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


GROUP_KEYS = ("mobile", "stationary", "refrigerants", "fugitive")
UAE_CITY_CANDIDATES = [
    "abu-dhabi",
    "ajman",
    "dubai",
    "fujairah",
    "ras-al-khaimah",
    "sharjah",
    "umm-al-quwain",
]


def iter_uae_scope1_factor_docs(db, city_filter: str = None):
    regions_doc = db.collection("emissionFactors").document("regions")
    for region_col in regions_doc.collections():
        region = region_col.id
        uae_col = region_col.document("countries").collection("uae")
        if not any(True for _ in uae_col.limit(1).stream()):
            continue

        city_data_col = region_col.document("countries").collection("uae").document("cities").collection("city_data")
        for city_doc in city_data_col.stream():
            city = city_doc.id
            if city_filter and city != city_filter:
                continue
            city_ref = city_doc.reference
            for scope_node in ("scope1", "('scope1',)"):
                factors_ref = city_ref.collection(scope_node).document("factors")
                snap = factors_ref.get()
                if snap.exists:
                    yield {
                        "region": region,
                        "city": city,
                        "scope_node": scope_node,
                        "doc_ref": factors_ref,
                        "data": snap.to_dict() or {},
                    }

    # Fallback: direct-known UAE city paths (works when listing is restricted).
    regions = ["middle-east"]
    cities = [city_filter] if city_filter else UAE_CITY_CANDIDATES
    for region in regions:
        for city in cities:
            for scope_node in ("scope1", "('scope1',)"):
                path = (
                    f"emissionFactors/regions/{region}/countries/uae/"
                    f"cities/city_data/{city}/{scope_node}/factors"
                )
                ref = db.document(path)
                snap = ref.get()
                if snap.exists:
                    yield {
                        "region": region,
                        "city": city,
                        "scope_node": scope_node,
                        "doc_ref": ref,
                        "data": snap.to_dict() or {},
                    }


def flatten_scope1_doc(data: Dict, overwrite_top_level: bool, strip_groups: bool) -> Tuple[Dict, int]:
    patched = dict(data)
    moved = 0

    for group in GROUP_KEYS:
        group_map = patched.get(group)
        if not isinstance(group_map, dict):
            continue
        for factor_key, factor_value in group_map.items():
            if factor_key in patched and not overwrite_top_level:
                continue
            patched[factor_key] = factor_value
            moved += 1

    if strip_groups:
        for group in GROUP_KEYS:
            patched.pop(group, None)

    return patched, moved


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Apply writes. Default is dry-run.")
    parser.add_argument("--dry-run", action="store_true", help="Dry-run mode (default).")
    parser.add_argument("--city", type=str, default=None, help="Single UAE city slug (e.g., dubai)")
    parser.add_argument("--strip-groups", action="store_true", help="Remove grouped maps after flattening.")
    parser.add_argument("--overwrite-top-level", action="store_true", help="Grouped keys override existing top-level keys.")
    args = parser.parse_args()

    db = get_db()
    do_apply = bool(args.apply)

    scanned = 0
    changed = 0
    moved_total = 0

    for row in iter_uae_scope1_factor_docs(db, city_filter=args.city):
        scanned += 1
        patched, moved = flatten_scope1_doc(
            row["data"],
            overwrite_top_level=args.overwrite_top_level,
            strip_groups=args.strip_groups,
        )
        if moved == 0 and not args.strip_groups:
            continue

        changed += 1
        moved_total += moved
        print(f"[MATCH] region={row['region']} city={row['city']} scope={row['scope_node']} moved={moved}")

        if do_apply:
            row["doc_ref"].set(patched)
            print("  -> applied")
        else:
            print("  -> dry-run only")

    mode = "APPLY" if do_apply else "DRY-RUN"
    print("\n=== Flatten Summary ===")
    print(f"Mode: {mode}")
    print(f"Scanned docs: {scanned}")
    print(f"Changed docs: {changed}")
    print(f"Top-level keys promoted: {moved_total}")
    print(f"Strip groups: {args.strip_groups}")


if __name__ == "__main__":
    main()

