"""
generate_seed_sql.py — Génère supabase/seed.sql à partir de tools/data/seed_leads.csv.

Couche WAT (Tools). Lit le CSV de démo, calcule score/tier/breakdown via
compute_score.py (source de vérité), regroupe les commerces en 3 campagnes
(scrape_batches) par famille de secteur, et émet un seed.sql idempotent.

Usage :
    python tools/generate_seed_sql.py
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

from compute_score import _normalize, compute_score, load_config

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = Path(__file__).with_name("data") / "seed_leads.csv"
OUT_PATH = ROOT / "supabase" / "seed.sql"

# Campagnes de démo (UUID fixes -> seed idempotent).
BATCHES = {
    "restauration": {
        "id": "a1111111-1111-4111-8111-111111111111",
        "name": "Campagne Restauration — Nov 2026",
        "category": "Restauration",
        "keywords": ["restaurant", "pizzeria", "boulangerie", "patisserie",
                     "traiteur", "boucherie", "bar", "cafe", "primeur"],
    },
    "beaute": {
        "id": "a2222222-2222-4222-8222-222222222222",
        "name": "Campagne Beauté & Bien-être — Nov 2026",
        "category": "Beauté & Bien-être",
        "keywords": ["coiffeur", "institut", "barbier", "salle de sport",
                     "fitness", "kine", "osteo", "opticien", "dentiste"],
    },
    "artisans": {
        "id": "a3333333-3333-4333-8333-333333333333",
        "name": "Campagne Artisans & Commerces — Nov 2026",
        "category": "Artisans & Commerces",
        "keywords": ["garage", "plombier", "electricien", "menuisier",
                     "fleuriste", "immobilier", "bijouterie", "auto-ecole",
                     "serrurier", "meuble", "magasin"],
    },
}


def family_for(category: str) -> str:
    norm = _normalize(category)
    for fam, meta in BATCHES.items():
        if any(kw in norm for kw in meta["keywords"]):
            return fam
    return "artisans"  # défaut : commerces


def sql_str(value) -> str:
    if value is None or value == "":
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def sql_num(value) -> str:
    if value is None or value == "":
        return "NULL"
    return str(value)


def main() -> int:
    cfg = load_config()
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    # Comptage par famille pour rows_count.
    counts: dict[str, int] = {k: 0 for k in BATCHES}
    companies_sql: list[str] = []
    tier_dist: dict[str, int] = {"A": 0, "B": 0, "C": 0, "D": 0}

    for r in rows:
        rating = float(r["rating"]) if r["rating"] else None
        reviews = int(r["reviews_count"]) if r["reviews_count"] else None
        company = {
            "rating": rating,
            "reviews_count": reviews,
            "website": r.get("website"),
            "phone": r.get("phone"),
            "category": r.get("category"),
        }
        res = compute_score(company, cfg)
        tier_dist[res["lead_tier"]] += 1

        fam = family_for(r["category"])
        counts[fam] += 1
        batch_id = BATCHES[fam]["id"]
        breakdown_json = json.dumps(res["score_breakdown"], ensure_ascii=False)

        companies_sql.append(
            "  (" + ", ".join([
                sql_str(r["name"]),
                sql_str(r["category"]),
                sql_str(r["address"]),
                sql_str(r["city"]),
                sql_str(r["postal_code"]),
                sql_str(r["phone"]),
                sql_str(r["website"]),
                sql_str(r["google_maps_url"]),
                sql_str(r["place_id"]),
                sql_num(rating),
                sql_num(reviews),
                str(res["lead_score"]),
                sql_str(res["lead_tier"]),
                sql_str(breakdown_json) + "::jsonb",
                sql_str(batch_id) + "::uuid",
            ]) + ")"
        )

    lines: list[str] = []
    lines.append("-- =====================================================================")
    lines.append("-- seed.sql — Données de démonstration MyCRM LeadGenPlus (30 commerces)")
    lines.append("-- GÉNÉRÉ par tools/generate_seed_sql.py — NE PAS éditer à la main.")
    lines.append(f"-- Répartition des tiers : {tier_dist}")
    lines.append("-- =====================================================================")
    lines.append("")
    lines.append("-- Campagnes de scraping (batches)")
    lines.append("insert into public.scrape_batches (id, name, source, category, rows_count) values")
    batch_values = []
    for fam, meta in BATCHES.items():
        batch_values.append(
            f"  ({sql_str(meta['id'])}::uuid, {sql_str(meta['name'])}, 'google_maps', "
            f"{sql_str(meta['category'])}, {counts[fam]})"
        )
    lines.append(",\n".join(batch_values))
    lines.append("on conflict (id) do nothing;")
    lines.append("")
    lines.append("-- Entreprises")
    lines.append(
        "insert into public.companies\n"
        "  (name, category, address, city, postal_code, phone, website,\n"
        "   gbp_url, google_place_id, rating, reviews_count,\n"
        "   lead_score, lead_tier, score_breakdown, batch_id) values"
    )
    lines.append(",\n".join(companies_sql))
    lines.append(
        "on conflict (google_place_id) do update set\n"
        "  lead_score = excluded.lead_score,\n"
        "  lead_tier = excluded.lead_tier,\n"
        "  score_breakdown = excluded.score_breakdown;"
    )
    lines.append("")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text("\n".join(lines), encoding="utf-8")

    print(f"seed.sql généré : {OUT_PATH}")
    print(f"  Commerces : {len(rows)}")
    print(f"  Par campagne : {counts}")
    print(f"  Répartition des tiers : {tier_dist}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
