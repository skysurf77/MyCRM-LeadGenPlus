# Workflow — Phase de planification (démarrage de projet)

> Référencé par `CLAUDE.md`. À lire avant de démarrer tout nouveau chantier.

## Objectif
Aboutir à un plan approuvé **avant** d'écrire du code : brief, architecture,
stack, périmètre et critères de vérification.

## Étapes
1. **Comprendre l'intention** — lire la demande, les fichiers de doctrine
   (`CLAUDE.md`, `secure.md`, `GTM.md`) et explorer l'existant dans `tools/` et
   `workflows/` avant de proposer du neuf.
2. **Poser les questions structurantes** — stack, format d'import, règles métier
   (ex. scoring), auth/déploiement, périmètre/phasage. Ne pas présumer.
3. **Rédiger le plan** — contexte, décisions validées, modèle de données,
   architecture, phasage, fichiers critiques, checklist sécurité, vérification.
4. **Faire approuver** — ne passer à l'exécution qu'une fois le plan validé.

## Contexte du projet MyCRM LeadGenPlus
- Plan approuvé : voir `README.md` et le plan de session.
- Stack : Next.js + Supabase (Postgres/Auth/RLS) ; outils d'import/scoring en
  Python dans `tools/` (respect WAT).
- Construction **par phases** :
  - Phase 1 (faite) : Entreprises + Import + Scoring + Filtrage unifié + seed.
  - Phase 2 : Contacts + Pipeline.
  - Phase 3 : Tâches + Analytics.

## Rappel WAT
- L'IA orchestre ; les scripts `tools/*.py` exécutent (déterministe, testable).
- Chaque échec → corriger l'outil, vérifier, puis mettre à jour le workflow.
