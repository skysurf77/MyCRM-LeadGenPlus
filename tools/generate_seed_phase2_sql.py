"""
generate_seed_phase2_sql.py — Génère supabase/seed_phase2.sql.

Couche WAT (Tools). Lit tools/data/seed_phase2.json et émet un SQL idempotent
qui peuple `contacts` et `deals` en les rattachant aux 30 commerces déjà
présents (référencés par leur `google_place_id`, clé stable de déduplication).

Les UUID sont dérivés de façon déterministe (uuid5) depuis la clé `key` :
rejouer le seed ne crée jamais de doublon.

Usage :
    python tools/generate_seed_phase2_sql.py
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = Path(__file__).with_name("data") / "seed_phase2.json"
OUT_PATH = ROOT / "supabase" / "seed_phase2.sql"

# Espace de noms dédié : garantit des UUID stables et sans collision.
# /!\ Valeur GELÉE : les UUID du seed déjà en base en dépendent. Ne pas modifier,
#     sinon une régénération produirait des doublons de démonstration.
NAMESPACE = uuid.UUID("cd3debd7-adfa-5e00-960e-82befb7d398f")

VALID_ENRICHMENT = {"a_enrichir", "en_cours", "enrichi", "echec"}
VALID_STAGES = {
    "to_contact",
    "outreach_sent",
    "demo_call",
    "proposal_sent",
    "closed_won",
    "closed_lost",
}


def det_uuid(key: str) -> str:
    return str(uuid.uuid5(NAMESPACE, key))


def sql_str(value) -> str:
    if value is None or value == "":
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def sql_bool(value) -> str:
    return "true" if value else "false"


def sql_num(value) -> str:
    if value is None or value == "":
        return "NULL"
    return str(value)


def build_contact_sql(c: dict) -> str:
    """Un INSERT ... SELECT : n'insère rien si l'entreprise est absente."""
    cid = det_uuid("contact:" + c["key"])
    enrichment = c["enrichment_status"]
    if enrichment not in VALID_ENRICHMENT:
        raise ValueError(f"enrichment_status invalide pour {c['key']} : {enrichment}")

    # Un contact « enrichi » porte une date de passage d'enrichissement.
    enriched_at = "now() - interval '3 days'" if enrichment == "enrichi" else "NULL"

    values = ", ".join([
        f"{sql_str(cid)}::uuid",
        "co.id",
        sql_str(c["first_name"]),
        sql_str(c["last_name"]),
        sql_str(c["title"]),
        sql_str(c["email"]),
        sql_str(c["phone"]),
        sql_str(c["linkedin_url"]),
        sql_bool(c["is_decision_maker"]),
        f"{sql_str(enrichment)}::enrichment_status",
        sql_str(c["last_negative_review"]),
        sql_str(c["ai_icebreaker"]),
        enriched_at,
    ])

    return (
        "insert into public.contacts\n"
        "  (id, company_id, first_name, last_name, title, email, phone,\n"
        "   linkedin_url, is_decision_maker, enrichment_status,\n"
        "   last_negative_review, ai_icebreaker, enriched_at)\n"
        f"select {values}\n"
        "from public.companies co\n"
        f"where co.google_place_id = {sql_str(c['place_id'])}\n"
        "on conflict (id) do nothing;"
    )


def build_deal_sql(d: dict) -> str:
    did = det_uuid("deal:" + d["key"])
    stage = d["stage"]
    if stage not in VALID_STAGES:
        raise ValueError(f"stage invalide pour {d['key']} : {stage}")

    contact_ref = "NULL"
    if d.get("contact_key"):
        contact_uuid = det_uuid("contact:" + d["contact_key"])
        # Sous-requête : NULL si le contact n'a pas pu être créé.
        contact_ref = (
            f"(select ct.id from public.contacts ct "
            f"where ct.id = {sql_str(contact_uuid)}::uuid)"
        )

    values = ", ".join([
        f"{sql_str(did)}::uuid",
        "co.id",
        sql_str(d["title"]),
        f"{sql_str(stage)}::deal_stage",
        sql_num(d["mrr"]),
        contact_ref,
        f"{sql_str(d['expected_close_date'])}::date"
        if d["expected_close_date"]
        else "NULL",
        sql_str(d["lost_reason"]),
    ])

    return (
        "insert into public.deals\n"
        "  (id, company_id, title, stage, mrr, primary_contact_id,\n"
        "   expected_close_date, lost_reason)\n"
        f"select {values}\n"
        "from public.companies co\n"
        f"where co.google_place_id = {sql_str(d['place_id'])}\n"
        # Garde-fou : ne recrée pas d'opportunité si l'entreprise en a déjà une
        # (évite aussi le conflit avec l'index unique uniq_deals_company_open).
        "  and not exists (select 1 from public.deals dd where dd.company_id = co.id)\n"
        "on conflict (id) do nothing;"
    )


def main() -> int:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    contacts = data["contacts"]
    deals = data["deals"]

    # Contrôles de cohérence avant génération.
    keys = [c["key"] for c in contacts]
    if len(keys) != len(set(keys)):
        raise ValueError("Clés de contact en double dans seed_phase2.json")
    known = set(keys)
    for d in deals:
        if d.get("contact_key") and d["contact_key"] not in known:
            raise ValueError(f"Opportunité {d['key']} : contact inconnu {d['contact_key']}")

    stage_dist: dict[str, int] = {s: 0 for s in VALID_STAGES}
    enrich_dist: dict[str, int] = {s: 0 for s in VALID_ENRICHMENT}
    for c in contacts:
        enrich_dist[c["enrichment_status"]] += 1
    for d in deals:
        stage_dist[d["stage"]] += 1
    total_mrr = sum(d["mrr"] or 0 for d in deals)

    lines: list[str] = [
        "-- =====================================================================",
        "-- seed_phase2.sql — Contacts & Pipeline de démonstration (Phase 2)",
        "-- GÉNÉRÉ par tools/generate_seed_phase2_sql.py — NE PAS éditer à la main.",
        "--",
        "-- Pré-requis : 0001_init.sql, 0002_phase2.sql et seed.sql déjà exécutés.",
        f"-- {len(contacts)} contacts · {len(deals)} opportunités · "
        f"{total_mrr} €/mois cumulés",
        f"-- Enrichissement : {enrich_dist}",
        f"-- Étapes du pipeline : {stage_dist}",
        "-- Idempotent : rejouable sans créer de doublon.",
        "-- =====================================================================",
        "",
        "-- ---------------------------------------------------------------------",
        "-- Contacts (décideurs rattachés aux commerces par google_place_id)",
        "-- ---------------------------------------------------------------------",
    ]
    lines.extend(build_contact_sql(c) + "\n" for c in contacts)

    lines.extend([
        "-- ---------------------------------------------------------------------",
        "-- Opportunités du pipeline",
        "-- ---------------------------------------------------------------------",
    ])
    lines.extend(build_deal_sql(d) + "\n" for d in deals)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text("\n".join(lines), encoding="utf-8")

    print(f"seed_phase2.sql généré : {OUT_PATH}")
    print(f"  Contacts   : {len(contacts)}  {enrich_dist}")
    print(f"  Opportunités : {len(deals)}  {stage_dist}")
    print(f"  MRR cumulé : {total_mrr} €/mois")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
