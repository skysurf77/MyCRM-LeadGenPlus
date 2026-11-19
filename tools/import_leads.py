"""
import_leads.py — Import de leads scrapés (CSV/JSON) vers Supabase.

Couche WAT (Tools). Normalise les colonnes (mapping tolérant Apify/Serper),
calcule le score via compute_score.py, déduplique sur place_id et upsert.

Usage :
    python tools/import_leads.py chemin/fichier.csv
    python tools/import_leads.py chemin/fichier.json --batch-name "Resto Lyon"
    python tools/import_leads.py fichier.csv --dry-run   # n'écrit rien, affiche le bilan
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from compute_score import compute_score, load_config

# Mapping tolérant — aligné sur app/api/import/route.ts
ALIASES: dict[str, list[str]] = {
    "name": ["name", "title", "companyname", "nom", "entreprise"],
    "category": ["category", "categoryname", "type", "categorie", "secteur"],
    "address": ["address", "street", "adresse", "fulladdress"],
    "city": ["city", "ville"],
    "postal_code": ["postal_code", "postalcode", "zip", "cp", "code_postal"],
    "phone": ["phone", "phonenumber", "telephone", "tel"],
    "website": ["website", "site", "url", "web"],
    "google_maps_url": ["google_maps_url", "mapsurl", "url_maps", "googleurl", "maps_url"],
    "place_id": ["place_id", "placeid", "cid", "fid", "google_place_id"],
    "rating": ["rating", "note", "stars", "averagerating", "totalscore"],
    "reviews_count": ["reviews_count", "reviewscount", "reviews", "userratingcount",
                      "nb_avis", "avis", "reviewcount"],
}


def pick(row: dict, aliases: list[str]) -> Optional[str]:
    lower = {str(k).lower().strip(): v for k, v in row.items()}
    for a in aliases:
        v = lower.get(a)
        if v is not None and str(v).strip() != "":
            return str(v).strip()
    return None


def to_number(v: Optional[str]):
    if v is None:
        return None
    try:
        return float(str(v).replace(",", "."))
    except ValueError:
        return None


def read_rows(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8-sig")
    if path.suffix.lower() == ".json":
        data = json.loads(text)
        if isinstance(data, dict):
            data = data.get("results") or data.get("data") or []
        return list(data)
    return list(csv.DictReader(text.splitlines()))


def normalize(rows: list[dict], cfg: dict) -> tuple[list[dict], list[str]]:
    valid: list[dict] = []
    errors: list[str] = []
    seen: set[str] = set()

    for i, row in enumerate(rows, start=1):
        name = pick(row, ALIASES["name"])
        if not name:
            errors.append(f"Ligne {i} : nom manquant.")
            continue
        place_id = pick(row, ALIASES["place_id"])
        if place_id:
            if place_id in seen:
                errors.append(f"Ligne {i} : doublon de place_id ({place_id}).")
                continue
            seen.add(place_id)

        rating = to_number(pick(row, ALIASES["rating"]))
        reviews = to_number(pick(row, ALIASES["reviews_count"]))
        website = pick(row, ALIASES["website"])
        phone = pick(row, ALIASES["phone"])
        category = pick(row, ALIASES["category"])

        score = compute_score({
            "rating": rating,
            "reviews_count": int(reviews) if reviews is not None else None,
            "website": website,
            "phone": phone,
            "category": category,
        }, cfg)

        valid.append({
            "name": name,
            "category": category,
            "address": pick(row, ALIASES["address"]),
            "city": pick(row, ALIASES["city"]),
            "postal_code": pick(row, ALIASES["postal_code"]),
            "phone": phone,
            "website": website,
            "gbp_url": pick(row, ALIASES["google_maps_url"]),
            "google_place_id": place_id,
            "rating": rating,
            "reviews_count": int(reviews) if reviews is not None else None,
            "lead_score": score["lead_score"],
            "lead_tier": score["lead_tier"],
            "score_breakdown": score["score_breakdown"],
        })

    return valid, errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Import de leads vers Supabase")
    parser.add_argument("file", help="Fichier CSV ou JSON")
    parser.add_argument("--batch-name", default=None)
    parser.add_argument("--dry-run", action="store_true", help="N'écrit rien, affiche le bilan")
    args = parser.parse_args()

    path = Path(args.file)
    if not path.exists():
        print(f"Fichier introuvable : {path}", file=sys.stderr)
        return 1

    cfg = load_config()
    rows = read_rows(path)
    valid, errors = normalize(rows, cfg)

    dist = Counter(v["lead_tier"] for v in valid)
    print(f"Lignes lues      : {len(rows)}")
    print(f"Lignes valides   : {len(valid)}")
    print(f"Lignes ignorées  : {len(errors)}")
    print(f"Répartition tiers: {dict(sorted(dist.items()))}")
    for e in errors[:10]:
        print(f"  - {e}")

    if args.dry_run:
        print("\n[dry-run] Aucune écriture effectuée.")
        return 0

    if not valid:
        print("Rien à importer.", file=sys.stderr)
        return 1

    # Import réel
    from supabase_client import SupabaseClient

    client = SupabaseClient()
    batch_name = args.batch_name or f"Import {datetime.now():%Y-%m-%d %H:%M}"
    batch = client.insert("scrape_batches", {
        "name": batch_name,
        "source": "google_maps",
        "rows_count": len(valid),
    })
    batch_id = batch[0]["id"]

    for v in valid:
        v["batch_id"] = batch_id

    client.upsert("companies", valid, on_conflict="google_place_id")
    print(f"\nImport terminé — campagne « {batch_name} » ({len(valid)} entreprises).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
