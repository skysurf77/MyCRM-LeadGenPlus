# Workflow — Scoring « potentiel d'amélioration »

## Objectif
Attribuer à chaque entreprise un score de qualification (0-100) et un tier (A/B/C/D)
reflétant son **potentiel à bénéficier du système de génération d'avis Google
commercialisé**. Plus une entreprise locale a de marge de progression (tout en étant
active et joignable), plus elle est une cible prioritaire.

## Source de vérité
- Config des poids/seuils : `tools/scoring_config.json` (UNIQUE source).
- Implémentation Python : `tools/compute_score.py` (couche WAT).
- Implémentation TypeScript (app) : `lib/scoring.ts` — doit rester identique.

> ⚠️ Ne jamais coder un seuil en dur. Modifier `scoring_config.json`, les deux
> implémentations le liront. Après toute modification, relancer l'auto-test.

## Composantes (poids par défaut)
| Composante | Poids | Logique |
|---|---|---|
| Note Google | 30 | Sweet spot 3,5–4,4 = max ; note parfaite ou très basse = faible |
| Nombre d'avis | 30 | Peu d'avis (< 50) = fort potentiel ; 0 avis = signalé |
| Présence web | 25 | Site + tél = max ; aucun = quasi disqualifiant (plafond) |
| Catégorie | 15 | Secteurs porteurs (liste `priority_keywords`) = max |

Tiers : A ≥ 75, B ≥ 50, C ≥ 25, D < 25 (ou disqualifié faute de présence web).

## Vérification
```bash
python tools/compute_score.py --self-test
```
Les 5 cas (A/B/C/D) doivent tous passer. Tester un cas ad hoc :
```bash
python tools/compute_score.py --rating 3.9 --reviews 22 --website x --category restaurant
```

## Pour recalibrer
1. Ajuster `tools/scoring_config.json` (poids, seuils, `priority_keywords`, `tiers`).
2. `python tools/compute_score.py --self-test` (adapter les cas si la sémantique change).
3. Régénérer le seed : `python tools/generate_seed_sql.py` et vérifier la répartition.
4. Vérifier que `lib/scoring.ts` reste aligné (même logique).

## Leçons apprises
- Une entreprise active (site + tél) dans un secteur porteur a un **plancher** de
  40 points : elle n'est jamais en tier D sauf disqualification. C'est voulu :
  D est réservé aux fiches sans aucun moyen de contact.
- L'arrondi « half-to-even » de Python est répliqué dans `lib/scoring.ts`
  (`roundHalfEven`) pour éviter toute divergence de tier à la frontière (ex. 74,5).
