#!/usr/bin/env python3
"""
One-time Firestore migration:
Move refrigerant factor keys that were mistakenly stored under scope1.fugitive
into scope1.refrigerants.

Usage:
  cd backend
  python scripts/migrate_refrigerants_from_fugitive.py --dry-run
  python scripts/migrate_refrigerants_from_fugitive.py --apply

Optional filters:
  --region middle-east --country uae --city dubai
"""

import argparse
import os
import re
import sys
from typing import Dict, Tuple

# Ensure "app" imports work when running from backend/
CURRENT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.utils.firebase import get_db  # noqa: E402


REFRIGERANT_KEY_RE = re.compile(r"^r\d", re.IGNORECASE)


def _is_refrigerant_key(key: str, value) -> bool:
    low = (key or "").strip().lower()
    if not low:
        return False
    if REFRIGERANT_KEY_RE.match(low):
        return True
    if any(token in low for token in ("hfc", "hcfc", "cfc", "pfc", "sf6", "nf3", "refrigerant")):
        return True

    if isinstance(value, dict):
        unit = str(value.get("unit", "")).lower()
        if "refrigerant" in unit:
            return True
    return False


UAE_CITY_CANDIDATES = [
    "abu-dhabi",
    "ajman",
    "dubai",
    "fujairah",
    "ras-al-khaimah",
    "sharjah",
    "umm-al-quwain",
]


def _traverse_scope1_factor_docs(db):
    regions_doc = db.collection("emissionFactors").document("regions")
    for region_col in regions_doc.collections():
        region = region_col.id
        countries_doc = region_col.document("countries")
        for country_col in countries_doc.collections():
            country = country_col.id
            city_data_col = country_col.document("cities").collection("city_data")
            for city_doc in city_data_col.stream():
                city = city_doc.id
                city_ref = city_doc.reference
                for scope_node in ("scope1", "('scope1',)"):
                    factors_ref = city_ref.collection(scope_node).document("factors")
                    snap = factors_ref.get()
                    if snap.exists:
                        yield {
                            "region": region,
                            "country": country,
                            "city": city,
                            "scope_node": scope_node,
                            "doc_ref": factors_ref,
                            "data": snap.to_dict() or {},
                        }


def _traverse_direct_uae_docs(db, region_filter=None, city_filter=None):
    regions = [region_filter] if region_filter else ["middle-east"]
    cities = [city_filter] if city_filter else UAE_CITY_CANDIDATES
    for region in regions:
        for city in cities:
            for scope_node in ("scope1", "('scope1',)"):
                doc_path = (
                    f"emissionFactors/regions/{region}/countries/uae/"
                    f"cities/city_data/{city}/{scope_node}/factors"
                )
                ref = db.document(doc_path)
                snap = ref.get()
                if snap.exists:
                    yield {
                        "region": region,
                        "country": "uae",
                        "city": city,
                        "scope_node": scope_node,
                        "doc_ref": ref,
                        "data": snap.to_dict() or {},
                    }


def _migrate_one(data: Dict, overwrite: bool) -> Tuple[Dict, int]:
    fugitive = data.get("fugitive")
    if not isinstance(fugitive, dict):
        return data, 0

    refrigerants = data.get("refrigerants")
    if not isinstance(refrigerants, dict):
        refrigerants = {}

    moved = 0
    new_fugitive = dict(fugitive)
    new_refrigerants = dict(refrigerants)

    for key, value in fugitive.items():
        if not _is_refrigerant_key(key, value):
            continue
        if key in new_refrigerants and not overwrite:
            continue
        new_refrigerants[key] = value
        new_fugitive.pop(key, None)
        moved += 1

    if moved == 0:
        return data, 0

    patched = dict(data)
    patched["fugitive"] = new_fugitive
    patched["refrigerants"] = new_refrigerants
    return patched, moved


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Apply migration writes. Default is dry-run.")
    parser.add_argument("--dry-run", action="store_true", help="Dry-run mode (default).")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite refrigerants keys if already present.")
    parser.add_argument("--region", type=str, default=None)
    parser.add_argument("--country", type=str, default=None)
    parser.add_argument("--city", type=str, default=None)
    args = parser.parse_args()

    do_apply = bool(args.apply)
    db = get_db()

    scanned_docs = 0
    changed_docs = 0
    moved_keys_total = 0

    iter_rows = _traverse_scope1_factor_docs(db)
    # Some projects block collection traversal but allow direct doc reads.
    if args.country == "uae":
        iter_rows = _traverse_direct_uae_docs(db, region_filter=args.region, city_filter=args.city)

    for row in iter_rows:
        region = row["region"]
        country = row["country"]
        city = row["city"]

        if args.region and region != args.region:
            continue
        if args.country and country != args.country:
            continue
        if args.city and city != args.city:
            continue

        scanned_docs += 1
        patched, moved = _migrate_one(row["data"], args.overwrite)
        if moved <= 0:
            continue

        changed_docs += 1
        moved_keys_total += moved
        print(f"[MATCH] {region}/{country}/{city}/{row['scope_node']} moved_keys={moved}")

        if do_apply:
            row["doc_ref"].set(
                {
                    "fugitive": patched.get("fugitive", {}),
                    "refrigerants": patched.get("refrigerants", {}),
                },
                merge=True,
            )
            print("  -> applied")
        else:
            print("  -> dry-run only")

    mode = "APPLY" if do_apply else "DRY-RUN"
    print("\n=== Migration Summary ===")
    print(f"Mode: {mode}")
    print(f"Scanned docs: {scanned_docs}")
    print(f"Changed docs: {changed_docs}")
    print(f"Moved refrigerant keys: {moved_keys_total}")


if __name__ == "__main__":
    main()

