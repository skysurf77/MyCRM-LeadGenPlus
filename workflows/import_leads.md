# Workflow — Import de leads scrapés

## Objectif
Importer des fiches d'établissements (Google Business Profiles / Google Maps) depuis
un fichier CSV ou JSON, les normaliser, les scorer et les enregistrer dans le CRM
en évitant les doublons.

## Trois voies d'import
1. **Depuis l'app** (recommandé pour l'utilisateur) : bouton « Importer des leads »
   → modale. Appelle `POST /api/import`. Déduplique, score, crée une campagne.
2. **En ligne de commande** (couche WAT, pour automatisation/batch) :
   `python tools/import_leads.py <fichier> [--batch-name "..."] [--dry-run]`.
3. **API machine-to-machine** pour le moteur externe `LeadGenEngine` :
   `POST /api/leads/import` (voir section dédiée plus bas).

Les voies 1 et 2 partagent exactement la même logique de mapping et de scoring.

## Schéma d'entrée standard (champs canoniques)
`name, category, address, city, postal_code, phone, website, google_maps_url,
place_id, rating, reviews_count, latitude, longitude`

- Seul **`name`** est obligatoire.
- **`place_id`** sert à la déduplication (upsert). Sans lui, pas de dédup possible.
- Modèles téléchargeables : `public/templates/leads_template.{csv,json}`
  (aussi exposés dans la modale d'import).

## Mapping tolérant
Les alias de colonnes courants (Apify, Serper, exports divers) sont absorbés
automatiquement — voir `ALIASES` dans `app/api/import/route.ts` et
`tools/import_leads.py` (gardés synchronisés). Exemples : `title`→name,
`totalScore`→rating, `reviewsCount`→reviews_count, `placeId`→place_id.

## Déduplication
- Intra-fichier : deux lignes avec le même `place_id` → la 2e est ignorée (signalée).
- Base : upsert `on_conflict = google_place_id`. Un ré-import **met à jour** la fiche
  (données rafraîchies + score recalculé) **sans écraser** le travail commercial
  (statut, notes, propriétaire ne sont pas dans le payload d'import).

## Procédure (CLI)
```bash
# 1. Vérifier d'abord sans rien écrire
python tools/import_leads.py .tmp/leads.csv --dry-run

# 2. Importer pour de vrai (nécessite .env avec clés Supabase)
python tools/import_leads.py .tmp/leads.csv --batch-name "Restaurants Lyon — Nov 2026"
```

## Sécurité (checklist secure.md)
- Route API : authentification requise + rate limiting (configurable via `.env`).
- Écritures faites avec la clé **service role** (serveur uniquement), jamais exposée.
- Validation du corps avec Zod ; taille max 20 000 lignes.

## Voie 3 — API d'ingestion LeadGenEngine

`POST /api/leads/import` — ingestion du modèle complet de prospection Google
Business Profile (audit des avis, benchmark local, angle de vente, accroche IA).
Schéma créé par `supabase/migrations/0004_leadgen_schema.sql`.

**Authentification** : header `x-api-key`, comparé à `LEADGEN_API_KEY` en temps
constant. Pas de session utilisateur (le middleware exclut déjà `/api`).
Si `LEADGEN_API_KEY` n'est pas défini côté serveur, la route répond **503** —
jamais « on laisse passer ».

**Entrée** : un tableau JSON racine, ou `{ "leads": [...] }`. Chaque élément est
`{ company: {...}, contact?: {...} }`. Dans `company`, seuls `place_id` et `name`
sont requis. Plafond : **500 leads par requête**, rate limit réglé par
`LEADGEN_RATE_LIMIT_MAX` / `LEADGEN_RATE_LIMIT_WINDOW_SECONDS`.

**Sortie** : `{ inserted, updated, errors, skipped, contacts_inserted,
contacts_updated, batchName }`.

### Règles de fusion (à connaître avant de brancher le moteur)
- La **déduplication reste sur `companies.google_place_id`** : le payload envoie
  `place_id`, la route le mappe. Aucune seconde colonne d'identifiant Google.
- **Fusion non destructive** : un champ absent ou `null` dans le payload *conserve*
  la valeur déjà en base. Un ré-scraping partiel n'efface donc jamais un SIREN ou
  un benchmark déjà connu. `lifecycle_status`, `notes` et `owner_id` ne sont
  jamais touchés — le travail commercial est intouchable.
- **Scoring** : si le payload fournit `lead_score` **et** `lead_tier`, ils sont
  retenus tels quels ; sinon le CRM recalcule avec le barème maison
  (`tools/scoring_config.json`). Le détail jsonb `score_breakdown` n'est écrit que
  dans le second cas, pour ne jamais afficher de barres incohérentes avec un
  score externe. L'explication textuelle du moteur va dans `score_breakdown_text`.
- **Contacts** : dédup sur `(company_id, email)` puis repli sur le nom, e-mails
  normalisés en minuscules. La route fait un **select puis update/insert**, et non
  un upsert (voir la leçon 42P10 ci-dessous). Un contact sans e-mail n'est inséré
  que s'il n'existe pas déjà une personne du même nom sur la fiche.
- `batch_id` n'est posé que sur les **nouvelles** fiches : l'attribution de
  campagne d'origine est préservée lors des relances de scraping.

## Leçons apprises
- Toujours lancer `--dry-run` sur un nouveau format de scraper pour vérifier le
  mapping avant d'écrire en base.
- Les `reviews_count` arrivent parfois en flottant ou avec séparateur — ils sont
  convertis et arrondis à l'entier.
- **Postgres ≥ 11 : `add column ... default` rétro-remplit les lignes existantes.**
  Ajouter `source text default 'LeadGenEngine_Apify_GMaps'` en une seule
  instruction aurait étiqueté les 30 commerces de seed et tous les imports CSV
  comme venant de LeadGenEngine. Il faut ajouter la colonne **sans** défaut, puis
  `alter column ... set default` dans une seconde instruction : l'existant reste
  `null`, seules les nouvelles lignes portent le défaut.
- **`add column if not exists` est silencieux sur un conflit de type.** La colonne
  `score_breakdown` existait déjà en `jsonb` ; demander un `score_breakdown text`
  n'aurait produit aucune erreur et aucune colonne. Toujours vérifier
  `information_schema.columns` avant d'ajouter une colonne qu'on croit absente.
- **PostgREST refuse un upsert dont les objets n'ont pas les mêmes clés**
  (`All object keys must match`). Les lignes sont donc normalisées sur une liste
  de colonnes fixe (`COMPANY_COLUMNS`) avant l'appel.
- **Un index unique PARTIEL ne peut pas servir de cible à un upsert PostgREST.**
  Vécu sur `uniq_contacts_company_email` (`where email is not null`) :
  `upsert(..., { onConflict: "company_id,email" })` échouait systématiquement en
  `42P10 there is no unique or exclusion constraint matching the ON CONFLICT
  specification`. Postgres n'infère un index partiel que si le prédicat de
  l'index est répété dans la requête (`ON CONFLICT (...) WHERE email is not
  null`), ce que PostgREST ne sait pas émettre. Deux solutions : un index
  **total**, ou — retenu ici — un **select puis update/insert explicite**, qui
  garde l'index partiel comme simple garde-fou d'intégrité.
  Sonde de diagnostic rapide, sans rien écrire (un `company_id` inexistant
  renvoie `42P10` si l'index est en cause, `23503` s'il fonctionne) :
  ```bash
  curl -s -X POST "$SUPABASE_URL/rest/v1/contacts?on_conflict=company_id,email" \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates" \
    --data '{"company_id":"00000000-0000-4000-8000-000000000000","email":"x@y.invalid"}'
  ```
- **Toujours renvoyer le message d'erreur Postgres dans `errors`.** La première
  version rapportait un « Contact non enregistré » générique : impossible de
  diagnostiquer. Cette route est machine-to-machine et authentifiée par clé, le
  détail technique y est utile (il reste hors de l'UI).
