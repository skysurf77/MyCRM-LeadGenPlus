"""
compute_score.py — Scoring « potentiel d'amélioration » pour MyCRM LeadGenPlus.

Couche WAT (Tools) : source de vérité déterministe du score de qualification.
Le même algorithme est répliqué en TypeScript (lib/scoring.ts) pour l'app,
les deux lisant tools/scoring_config.json. Modifier la config, pas le code.

Principe : une entreprise locale a d'autant plus à gagner (= score élevé) qu'elle
a un fort potentiel de progression sur ses avis Google : note moyenne (sweet spot),
peu d'avis, mais entreprise active (site/téléphone) dans un secteur porteur.

Usage :
    python tools/compute_score.py --self-test
    python tools/compute_score.py --rating 3.9 --reviews 22 --website x --category restaurant
"""

from __future__ import annotations

import argparse
import json
import sys
import unicodedata
from pathlib import Path
from typing import Any, Optional

CONFIG_PATH = Path(__file__).with_name("scoring_config.json")


def load_config(path: Path = CONFIG_PATH) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _normalize(text: Optional[str]) -> str:
    """minuscule + sans accents, pour comparer les catégories de façon robuste."""
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    return text.lower().strip()


def _rating_factor(rating: Optional[float], cfg: dict[str, Any]) -> float:
    if rating is None or rating <= 0:
        return cfg["null_factor"]
    if rating >= cfg["excellent_threshold"]:
        return cfg["excellent_factor"]
    if rating >= cfg["high_threshold"]:
        return cfg["high_factor"]
    if rating >= cfg["sweet_spot_threshold"]:
        return cfg["sweet_spot_factor"]
    if rating >= cfg["low_threshold"]:
        return cfg["low_factor"]
    return cfg["very_low_factor"]


def _reviews_factor(reviews: Optional[int], cfg: dict[str, Any]) -> float:
    if reviews is None:
        return cfg["zero_factor"]
    if reviews <= 0:
        return cfg["zero_factor"]
    if reviews < cfg["few_threshold"]:
        return cfg["few_factor"]
    if reviews < cfg["medium_threshold"]:
        return cfg["medium_factor"]
    return cfg["many_factor"]


def _web_factor(has_website: bool, has_phone: bool, cfg: dict[str, Any]) -> float:
    if has_website and has_phone:
        return cfg["both_factor"]
    if has_website or has_phone:
        return cfg["one_factor"]
    return cfg["none_factor"]


def _category_factor(category: Optional[str], cfg: dict[str, Any]) -> float:
    norm = _normalize(category)
    if norm and any(kw in norm for kw in cfg["priority_keywords"]):
        return cfg["priority_factor"]
    return cfg["other_factor"]


def _tier(score: int, cfg: dict[str, Any]) -> str:
    if score >= cfg["A"]:
        return "A"
    if score >= cfg["B"]:
        return "B"
    if score >= cfg["C"]:
        return "C"
    return "D"


def compute_score(company: dict[str, Any], config: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    """
    Calcule le score (0-100), le tier (A/B/C/D) et le détail par composante.

    `company` accepte : rating (float), reviews_count (int),
    website (str|None), phone (str|None), category (str|None).
    """
    cfg = config or load_config()
    w = cfg["weights"]

    rating = company.get("rating")
    reviews = company.get("reviews_count")
    has_website = bool((company.get("website") or "").strip())
    has_phone = bool((company.get("phone") or "").strip())
    category = company.get("category")

    rating_f = _rating_factor(rating, cfg["rating"])
    reviews_f = _reviews_factor(reviews, cfg["reviews"])
    web_f = _web_factor(has_website, has_phone, cfg["web_presence"])
    cat_f = _category_factor(category, cfg["category"])

    rating_pts = w["rating"] * rating_f
    reviews_pts = w["reviews"] * reviews_f
    web_pts = w["web_presence"] * web_f
    cat_pts = w["category"] * cat_f

    raw_score = rating_pts + reviews_pts + web_pts + cat_pts

    # Porte de disqualification : aucune présence web -> plafonnement.
    disqualified = False
    wp = cfg["web_presence"]
    if wp.get("disqualify_if_none") and not has_website and not has_phone:
        disqualified = True
        raw_score = min(raw_score, wp["disqualified_score_cap"])

    score = max(0, min(100, round(raw_score)))
    tier = _tier(score, cfg["tiers"])

    breakdown = {
        "rating": {"factor": round(rating_f, 3), "points": round(rating_pts, 1), "weight": w["rating"]},
        "reviews": {"factor": round(reviews_f, 3), "points": round(reviews_pts, 1), "weight": w["reviews"]},
        "web_presence": {"factor": round(web_f, 3), "points": round(web_pts, 1), "weight": w["web_presence"]},
        "category": {"factor": round(cat_f, 3), "points": round(cat_pts, 1), "weight": w["category"]},
        "disqualified": disqualified,
    }

    return {"lead_score": score, "lead_tier": tier, "score_breakdown": breakdown}


# --------------------------------------------------------------------------
# Auto-test — cf. plan, étape de vérification 2
# --------------------------------------------------------------------------

def _self_test() -> int:
    cfg = load_config()
    cases = [
        # (libellé, company, tier attendu)
        ("Fort potentiel (sweet spot, peu d'avis, actif, secteur porteur)",
         {"rating": 3.9, "reviews_count": 18, "website": "https://x.fr", "phone": "0102030405", "category": "Restaurant"}, "A"),
        ("Potentiel moyen (bonne note, avis moyens, secteur porteur)",
         {"rating": 4.6, "reviews_count": 90, "website": "https://x.fr", "phone": "0102030405", "category": "Coiffeur"}, "B"),
        ("Faible potentiel (note parfaite, beaucoup d'avis, secteur non prioritaire, 1 seul signal web)",
         {"rating": 4.9, "reviews_count": 200, "website": "https://x.fr", "phone": None, "category": "Magasin de meubles"}, "C"),
        ("Disqualifié (aucune présence web)",
         {"rating": 3.8, "reviews_count": 12, "website": None, "phone": None, "category": "Restaurant"}, "D"),
        ("Note basse mais entreprise établie et active (beaucoup d'avis)",
         {"rating": 2.6, "reviews_count": 180, "website": "https://x.fr", "phone": "0102030405", "category": "Garage"}, "B"),
    ]

    failures = 0
    print("=== Auto-test du scoring MyCRM LeadGenPlus ===")
    for label, company, expected in cases:
        res = compute_score(company, cfg)
        ok = res["lead_tier"] == expected
        flag = "OK " if ok else "ECHEC"
        if not ok:
            failures += 1
        print(f"[{flag}] {label}")
        print(f"        score={res['lead_score']} tier={res['lead_tier']} (attendu {expected})")

    print("-" * 50)
    if failures:
        print(f"{failures} cas en échec.")
        return 1
    print("Tous les cas passent.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Scoring potentiel d'amélioration (MyCRM LeadGenPlus)")
    parser.add_argument("--self-test", action="store_true", help="Lance la batterie de tests")
    parser.add_argument("--rating", type=float, default=None)
    parser.add_argument("--reviews", type=int, default=None)
    parser.add_argument("--website", type=str, default=None)
    parser.add_argument("--phone", type=str, default=None)
    parser.add_argument("--category", type=str, default=None)
    args = parser.parse_args()

    if args.self_test:
        return _self_test()

    company = {
        "rating": args.rating,
        "reviews_count": args.reviews,
        "website": args.website,
        "phone": args.phone,
        "category": args.category,
    }
    print(json.dumps(compute_score(company), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
