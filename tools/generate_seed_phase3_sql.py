"""
generate_seed_phase3_sql.py — Génère supabase/seed_phase3.sql.

Couche WAT (Tools). Lit tools/data/seed_phase3.json et émet un SQL idempotent
qui peuple `tasks`, rattachées aux commerces (par `google_place_id`) et aux
contacts créés par seed_phase2.sql (par UUID déterministe).

Les échéances sont écrites en `current_date + N` : la démo reste réaliste
(tâches en retard / aujourd'hui / à venir) quel que soit le jour d'exécution.

Usage :
    python tools/generate_seed_phase3_sql.py
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = Path(__file__).with_name("data") / "seed_phase3.json"
PHASE2_PATH = Path(__file__).with_name("data") / "seed_phase2.json"
OUT_PATH = ROOT / "supabase" / "seed_phase3.sql"

# Espaces de noms : phase 2 pour retrouver les contacts, phase 3 pour les tâches.
# /!\ Valeurs GELÉES : les UUID du seed déjà en base en dépendent. Ne pas modifier,
#     sinon une régénération produirait des doublons de démonstration.
NS_PHASE2 = uuid.UUID("cd3debd7-adfa-5e00-960e-82befb7d398f")
NS_PHASE3 = uuid.UUID("2001ef62-fecd-5ddb-a487-a9d226ccd11d")

VALID_TYPES = {"call", "email", "linkedin", "follow_up", "demo", "other"}
VALID_PRIORITIES = {"basse", "normale", "haute"}
VALID_STATUS = {"todo", "done"}


def sql_str(value) -> str:
    if value is None or value == "":
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def due_expr(offset: int) -> str:
    if offset == 0:
        return "current_date"
    sign = "+" if offset > 0 else "-"
    return f"current_date {sign} {abs(offset)}"


def build_task_sql(t: dict) -> str:
    tid = str(uuid.uuid5(NS_PHASE3, "task:" + t["key"]))

    if t["type"] not in VALID_TYPES:
        raise ValueError(f"type invalide pour {t['key']} : {t['type']}")
    if t["priority"] not in VALID_PRIORITIES:
        raise ValueError(f"priorité invalide pour {t['key']} : {t['priority']}")
    if t["status"] not in VALID_STATUS:
        raise ValueError(f"statut invalide pour {t['key']} : {t['status']}")

    contact_ref = "NULL"
    if t.get("contact_key"):
        cid = str(uuid.uuid5(NS_PHASE2, "contact:" + t["contact_key"]))
        # Sous-requête : NULL si seed_phase2.sql n'a pas été exécuté.
        contact_ref = (
            f"(select ct.id from public.contacts ct "
            f"where ct.id = {sql_str(cid)}::uuid)"
        )

    # Le trigger sync_task_completed_at remplit completed_at pour les tâches
    # déjà terminées ; on laisse la colonne à sa valeur par défaut.
    values = ", ".join([
        f"{sql_str(tid)}::uuid",
        sql_str(t["title"]),
        f"{sql_str(t['type'])}::task_type",
        f"{sql_str(t['priority'])}::task_priority",
        due_expr(t["due_offset"]),
        f"{sql_str(t['status'])}::task_status",
        "co.id",
        contact_ref,
    ])

    return (
        "insert into public.tasks\n"
        "  (id, title, type, priority, due_date, status, company_id, contact_id)\n"
        f"select {values}\n"
        "from public.companies co\n"
        f"where co.google_place_id = {sql_str(t['place_id'])}\n"
        "on conflict (id) do nothing;"
    )


def main() -> int:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    tasks = data["tasks"]

    keys = [t["key"] for t in tasks]
    if len(keys) != len(set(keys)):
        raise ValueError("Clés de tâche en double dans seed_phase3.json")

    # Cohérence avec la phase 2 : les contacts référencés doivent exister.
    phase2 = json.loads(PHASE2_PATH.read_text(encoding="utf-8"))
    known_contacts = {c["key"] for c in phase2["contacts"]}
    for t in tasks:
        if t.get("contact_key") and t["contact_key"] not in known_contacts:
            raise ValueError(f"Tâche {t['key']} : contact inconnu {t['contact_key']}")

    overdue = sum(1 for t in tasks if t["status"] == "todo" and t["due_offset"] < 0)
    today = sum(1 for t in tasks if t["status"] == "todo" and t["due_offset"] == 0)
    upcoming = sum(1 for t in tasks if t["status"] == "todo" and t["due_offset"] > 0)
    done = sum(1 for t in tasks if t["status"] == "done")
    type_dist: dict[str, int] = {}
    for t in tasks:
        type_dist[t["type"]] = type_dist.get(t["type"], 0) + 1

    lines: list[str] = [
        "-- =====================================================================",
        "-- seed_phase3.sql — Tâches de démonstration (Phase 3)",
        "-- GÉNÉRÉ par tools/generate_seed_phase3_sql.py — NE PAS éditer à la main.",
        "--",
        "-- Pré-requis : 0001_init.sql, seed.sql, 0002_phase2.sql, seed_phase2.sql",
        "-- et 0003_phase3.sql déjà exécutés (ce dernier dans une exécution séparée,",
        "-- car il ajoute des valeurs d'enum utilisées ici).",
        "--",
        f"-- {len(tasks)} tâches : {overdue} en retard · {today} aujourd'hui · "
        f"{upcoming} à venir · {done} terminées",
        f"-- Types : {type_dist}",
        "-- Les échéances sont relatives à current_date : toujours réalistes.",
        "-- Idempotent : rejouable sans créer de doublon.",
        "-- =====================================================================",
        "",
    ]
    lines.extend(build_task_sql(t) + "\n" for t in tasks)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text("\n".join(lines), encoding="utf-8")

    print(f"seed_phase3.sql généré : {OUT_PATH}")
    print(f"  Tâches : {len(tasks)}")
    print(f"  En retard {overdue} · Aujourd'hui {today} · À venir {upcoming} · Terminées {done}")
    print(f"  Types : {type_dist}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
