# PLAN — MyCRM LeadGenPlus

> Document de référence de l'architecture et de l'avancement.
> À jour au **19 novembre 2026** — les 3 phases prévues sont livrées.

---

## 1. Le projet en une page

Le **client final** vend aux commerces locaux une solution clé en main pour
obtenir plus d'avis Google. **MyCRM LeadGenPlus** est le CRM interne qui pilote cette
prospection B2B : il importe des fiches d'établissements scrapées sur Google Maps /
Google Business Profiles, les **qualifie automatiquement** par un score de
« potentiel d'amélioration », puis les fait avancer jusqu'à la vente.

**Le fil conducteur du produit : un filtrage unifié.** `companies` est l'entité
racine. Contacts, opportunités et tâches se filtrent *via* l'entreprise liée, donc
un filtre « ville = Lyon » ou « tier = A » cascade sur les 5 onglets, et les filtres
suivent l'utilisateur d'un onglet à l'autre (les liens de la barre latérale
embarquent la query string).

| | |
|---|---|
| **Stack** | Next.js 16 (App Router, TypeScript) · React 19 · Tailwind · Radix · TanStack Table · Zustand · Zod 4 |
| **Données** | Supabase — Postgres + Auth (email/mot de passe + lien magique) + RLS |
| **Exécution déterministe** | Python dans `tools/` (framework WAT, cf. `CLAUDE.md`) |
| **Déploiement visé** | Vercel (app) + Supabase Cloud (base) |
| **Thème** | Fond blanc · bleu clair « confiance » · corail/orange pour les CTA |

---

## 2. Mise en route (ordre d'exécution SQL)

Dans le **SQL Editor** de Supabase, dans cet ordre :

| # | Fichier | Contenu |
|---|---|---|
| 1 | `supabase/migrations/0001_init.sql` | Schéma, enums, index, RLS, triggers |
| 2 | `supabase/seed.sql` | 30 commerces de démo (tiers A14 / B7 / C6 / D3) |
| 3 | `supabase/migrations/0002_phase2.sql` | Champs d'enrichissement, MRR, contact rattaché |
| 4 | `supabase/seed_phase2.sql` | 23 contacts + 12 opportunités |
| 5 | `supabase/migrations/0003_phase3.sql` | Types de tâche, priorité, clôture auto |
| 6 | `supabase/seed_phase3.sql` | 16 tâches (échéances relatives à aujourd'hui) |
| 7 | `supabase/migrations/0004_leadgen_schema.sql` | Modèle complet LeadGenEngine (audit avis, benchmark, outreach IA) |

> ⚠️ **L'étape 5 doit être exécutée seule**, puis l'étape 6 dans une seconde
> exécution. Postgres interdit d'utiliser une valeur d'enum (`linkedin`, `demo`)
> dans la transaction qui vient de l'ajouter.

Tous les scripts sont **idempotents** : les rejouer ne crée jamais de doublon
(UUID déterministes `uuid5`, `on conflict do nothing`, garde-fous `not exists`).

Ensuite : remplir `.env.local` (cf. `.env.example`), puis `npm install && npm run dev`.

> 🪤 **Piège vécu** : modifier `.env.local` sans **enregistrer** le fichier, ou sans
> **redémarrer** le serveur, produit une erreur « Failed to fetch » au login.
> Next ne relit `.env.local` qu'au démarrage.

---

## 3. Arborescence

```
MyCRM/
│
├─ app/                                 # Next.js App Router
│  ├─ (app)/                            # Groupe protégé (auth requise)
│  │  ├─ layout.tsx                     # Garde-fou auth + Sidebar + Topbar
│  │  ├─ companies/page.tsx             # Onglet 1 — Entreprises
│  │  ├─ contacts/page.tsx              # Onglet 2 — Contacts
│  │  ├─ pipeline/page.tsx              # Onglet 3 — Pipeline
│  │  ├─ tasks/page.tsx                 # Onglet 4 — Tâches
│  │  └─ analytics/page.tsx             # Onglet 5 — Analytics
│  ├─ api/import/route.ts               # Import CSV/JSON (auth + rate limit + Zod)
│  ├─ auth/confirm/route.ts             # Callback du lien magique
│  ├─ login/page.tsx                    # Connexion / inscription
│  ├─ layout.tsx                        # Racine HTML + polices
│  ├─ page.tsx                          # Redirection vers /companies
│  └─ globals.css                       # Tokens de thème + tokens de dataviz
│
├─ components/
│  ├─ Sidebar.tsx                       # Navigation (conserve les filtres actifs)
│  ├─ Topbar.tsx                        # Email de l'utilisateur + déconnexion
│  ├─ FilterBar.tsx                     # ⭐ Barre de filtre unique, partagée
│  ├─ FacetFilter.tsx                   # Multi-sélection avec comptes
│  ├─ RangeFilter.tsx                   # Plage min/max (note, avis, score)
│  ├─ TierBadge.tsx                     # Pastille A/B/C/D + score
│  ├─ EnrichmentBadge.tsx               # Pastille de statut d'enrichissement
│  ├─ providers.tsx                     # TanStack Query
│  ├─ ui/{button,input}.tsx             # Primitives shadcn-like
│  │
│  ├─ companies/
│  │  ├─ CompaniesView.tsx              # Orchestrateur de l'onglet
│  │  ├─ CompaniesTable.tsx             # TanStack Table + édition inline
│  │  ├─ CompanyDrawer.tsx              # ⭐ Tiroir 360° (score, contacts, pipeline, tâches)
│  │  ├─ CompanyContactsPanel.tsx       # Bloc « Contacts » du tiroir
│  │  ├─ CompanyTasksPanel.tsx          # Bloc « Tâches & rappels » du tiroir
│  │  └─ ImportModal.tsx                # Upload + modèles CSV/JSON téléchargeables
│  │
│  ├─ contacts/
│  │  ├─ ContactsView.tsx               # Orchestrateur + filtre d'enrichissement
│  │  ├─ ContactsTable.tsx              # Table triable, coordonnées cliquables
│  │  └─ ContactDrawer.tsx              # Création / édition (réutilisé par le 360°)
│  │
│  ├─ pipeline/
│  │  ├─ PipelineView.tsx               # Kanban + drag & drop + totaux MRR
│  │  ├─ DealCard.tsx                   # Carte : entreprise, tier, contact, MRR
│  │  └─ DealDrawer.tsx                 # Édition d'une opportunité
│  │
│  ├─ tasks/
│  │  ├─ TasksView.tsx                  # Groupes d'urgence + tiroir de contexte
│  │  ├─ TaskRow.tsx                    # Ligne : case à cocher, contexte, échéance
│  │  └─ TaskDrawer.tsx                 # Création / édition (réutilisé par le 360°)
│  │
│  └─ analytics/
│     ├─ AnalyticsView.tsx              # KPIs + 6 graphiques, calculés en direct
│     ├─ StatTile.tsx                   # Carte de KPI
│     ├─ BarList.tsx                    # Barres classées, série unique
│     └─ ChartCard.tsx                  # Cadre + bascule « vue tableau »
│
├─ lib/
│  ├─ types.ts                          # ⭐ Types du domaine + libellés FR
│  ├─ filters.ts                        # ⭐ Prédicats de filtrage + (dé)sérialisation URL
│  ├─ scoring.ts                        # Miroir TS de compute_score.py
│  ├─ tasks.ts                          # Urgence, dates relatives, helpers
│  ├─ utils.ts                          # cn(), formats fr-FR (nombre, note, euros)
│  └─ supabase/{client,server,admin}.ts # Navigateur · serveur · service_role
│
├─ store/useFilters.ts                  # ⭐ Store Zustand + synchro URL
├─ proxy.ts                             # Rafraîchit la session, protège les routes (ex-middleware.ts)
│
├─ supabase/
│  ├─ migrations/000{1,2,3}_*.sql       # Schéma par phase
│  └─ seed*.sql                         # Données de démo (générées, ne pas éditer)
│
├─ tools/                               # WAT — exécution déterministe (Python)
│  ├─ compute_score.py                  # ⭐ Source de vérité du scoring (--self-test)
│  ├─ scoring_config.json               # ⭐ Pondérations et seuils, configurables
│  ├─ import_leads.py                   # Import CLI (--dry-run)
│  ├─ supabase_client.py                # Client REST stdlib
│  ├─ generate_seed_sql.py              # → seed.sql
│  ├─ generate_seed_phase2_sql.py       # → seed_phase2.sql
│  ├─ generate_seed_phase3_sql.py       # → seed_phase3.sql
│  └─ data/                             # Sources des seeds (CSV + JSON)
│
├─ workflows/                           # WAT — SOP en Markdown
│  ├─ planning_phase.md · scoring.md · import_leads.md
│
├─ public/templates/leads_template.{csv,json}   # Modèles d'import téléchargeables
├─ CLAUDE.md · GTM.md · secure.md               # Doctrine maison
└─ README.md · PLAN.md                          # Mise en route · ce document
```

⭐ = pièce structurante, à lire en premier pour comprendre le projet.

---

## 4. Modèle de données

```
profiles ──┐
           ├─< scrape_batches ──< companies ──┬──< contacts ──┐
auth.users ┘                      (racine)    │               │
                                              ├──< deals ──────┤ (primary_contact_id)
                                              └──< tasks ──────┘ (contact_id)
                                                    └── deal_id
```

| Table | Rôle | Clés notables |
|---|---|---|
| `profiles` | Miroir de `auth.users`, créé par trigger à l'inscription | — |
| `scrape_batches` | Campagnes de scraping | — |
| `companies` | **Entité racine du filtrage** | `google_place_id` UNIQUE (déduplication, y compris pour l'API LeadGenEngine) |
| `contacts` | Décideurs + matière de prospection | `ai_icebreaker`, `last_negative_review`, `email_verification_status` ; unique partiel `(company_id, email)` |
| `deals` | Opportunités du pipeline | `mrr`, index unique partiel : 1 affaire ouverte / entreprise |
| `tasks` | Relances commerciales | `priority`, `completed_at` (trigger) |
| `activities` | Journal (créée, pas encore exploitée) | — |

**RLS** activée sur toutes les tables, policy `team_all` : tout utilisateur
authentifié de l'équipe lit et écrit ; l'accès anonyme est refusé partout.
La granularité par personne reste possible plus tard sans migration de schéma.

---

## 5. Récapitulatif des phases livrées

### Phase 1 — Le cœur *(17 nov. 2026)*

**Onglet Entreprises + import + scoring + filtrage unifié.**

- Table type HubSpot (tri, édition inline du statut) et **tiroir latéral** avec le
  détail du score en barres.
- **Import CSV/JSON** : mapping tolérant des alias de colonnes (Apify, Serper),
  déduplication sur `place_id`, création automatique d'une campagne.
  La modale expose deux **modèles téléchargeables** prêts à réimporter.
- **Scoring « potentiel d'amélioration »** (0–100 → tiers A/B/C/D) depuis une
  configuration unique `tools/scoring_config.json`, répliquée en Python
  (source de vérité) et en TypeScript. Critères pondérés : note Google
  (sweet spot 3,5–4,4 = fort potentiel), nombre d'avis, présence web
  (ni site ni téléphone = quasi disqualifiant), catégorie porteuse.
- **Filtrage unifié** : store Zustand synchronisé à l'URL → liens partageables.
- **Seed de 30 commerces français** couvrant toute l'échelle des tiers.
- **Auth** multi-utilisateurs, RLS, en-têtes de sécurité, rate limiting sur l'API.

*Décisions structurantes* : le scoring vit dans un seul fichier de config ;
l'arrondi « moitié au pair » est répliqué en TS pour que Python et TypeScript ne
divergent jamais sur une frontière de tier.

### Phase 2 — Relation & vente *(17 nov. 2026)*

**Onglet Contacts, Pipeline Kanban, liaison 360°.**

- **Contacts** : table triable des décideurs, branchée sur le filtrage unifié via
  l'entreprise liée. Champs pensés pour l'automatisation n8n / Apify —
  `enrichment_status`, `last_negative_review`, `ai_icebreaker`, `enriched_at`.
  Filtre « Enrichissement » injecté dans la barre partagée.
- **Pipeline** : Kanban à 6 colonnes, **drag & drop HTML5 natif** (aucune
  librairie), déplacement optimiste avec rollback. Chaque carte porte entreprise,
  tier, contact et MRR ; chaque colonne affiche son total.
- **Vue 360°** dans `CompanyDrawer` : contacts avec leur accroche IA, ajout d'un
  contact en tiroir imbriqué, et bouton **« Envoyer dans le Pipeline »** qui crée
  l'opportunité en rattachant le décideur.
- **Seed** : 23 contacts (accroches rédigées d'après le profil réel de chaque
  commerce) + 12 opportunités réparties sur les 6 étapes, 1 998 €/mois cumulés.

*Décisions structurantes* : les 6 étapes réutilisent l'enum `deal_stage` de
`0001` — seuls les libellés FR changent, aucune migration d'enum. Le MRR a sa
colonne dédiée `deals.mrr` (et non `amount`) pour lever toute ambiguïté côté n8n.
`enrichment_status` garde ses 4 valeurs, `echec` est libellé « Introuvable ».

### Phase 3 — Pilotage *(19 nov. 2026)*

**Onglet Tâches, onglet Analytics.**

- **Tâches** : quatre sections repliables — *En retard · Aujourd'hui · À venir ·
  Terminées* — branchées sur le filtrage unifié. Case à cocher instantanée,
  6 types d'action, priorité, raccourcis d'échéance, assignation à un collègue.
  Chaque ligne nomme son entreprise et **ouvre sa fiche 360° en un clic**, pour
  avoir tout le contexte d'appel sous les yeux sans quitter la liste.
- **Bloc « Tâches & rappels »** dans `CompanyDrawer`, avec création de rappel en
  un clic (« Rappeler demain / dans 3 jours / dans 1 semaine »).
- **Analytics** : 5 KPIs (entreprises, contacts enrichis, MRR en cours, MRR signé,
  taux de closing) et 6 graphiques — entonnoir de conversion, tier, statut de
  prospection, campagne, catégorie, ville. Tout est recalculé en direct contre la
  barre de filtre unique.
- **Seed** : 16 tâches réparties sur les quatre niveaux d'urgence.

*Décisions structurantes* : graphiques **faits main** (divs Tailwind), zéro
librairie. La palette des pastilles de tier **échoue** les tests de séparation
daltonisme en usage graphique (corail A ↔ ambre B à ΔE 13,7, sous le seuil de 15) :
les badges restent donc des **libellés de ligne** et les barres portent une teinte
unique, avec des tokens dédiés `--chart-*` validés en mode clair **et** sombre.
Chaque graphique a un **jumeau « vue tableau »** : aucune valeur n'est accessible
par la seule couleur. Les échéances du seed sont écrites en `current_date ± N`
pour rester réalistes quel que soit le jour d'exécution.

---

## 6. Conventions transverses

**Framework WAT** (`CLAUDE.md`) — l'IA orchestre, le code Python exécute.
Tout ce qui est déterministe (scoring, import, génération de seed) vit dans
`tools/` et se teste hors de l'app. Les SOP vivent dans `workflows/`.

**Filtrage unifié** — un seul store (`store/useFilters.ts`), un seul jeu de
prédicats (`lib/filters.ts` : `matchesCompany` / `matchesContact` / `matchesDeal` /
`matchesTask`). Ajouter un onglet = écrire un prédicat qui délègue à
`matchesCompanyFacets`, rien d'autre.

**Sécurité** (`secure.md`) — secrets uniquement dans `.env*` (jamais committés,
`.env.example` avec des valeurs factices) ; clé `service_role` côté serveur
exclusivement ; RLS partout ; validation Zod et rate limiting sur l'API d'import ;
en-têtes de sécurité dans `next.config.js` ; messages d'erreur génériques côté UI.

**Dataviz** — une seule teinte par graphique (la longueur porte déjà la
magnitude), jamais de rampe de valeur sur des catégories nominales, jamais de
double axe, texte toujours en tokens d'encre et jamais en couleur de donnée.

---

## 7. Reste à faire

| Sujet | État |
|---|---|
| **Upgrades majeurs de sécurité** | **Fait** le 19 nov. 2026 : Next 14.2.35 → 16.4.6, React 18.3 → 19.3, zod 3 → 4, Zustand 4 → 5, eslint 8 → 9, postcss 8.4 → 8.5. `npm audit` : **0 vulnérabilité**. Migrations réelles : `cookies()` en `await` dans `lib/supabase/server.ts` + les 8 appelants, `z.record(clé, valeur)` (zod 4 exige deux arguments), et `middleware.ts` → `proxy.ts` (convention renommée en Next 16). |
| **Tarif réel** | `DEFAULT_MRR = 149` dans `lib/types.ts` est un placeholder, à remplacer par le vrai prix de l'abonnement vendu. |
| **Automatisation n8n / Apify** | Les champs sont en place (`enrichment_status`, `last_negative_review`, `ai_icebreaker`, `enriched_at`) mais aucun workflow n'est encore branché. Une SOP `workflows/enrichment_contacts.md` reste à rédiger. |
| **Ingestion LeadGenEngine** | Schéma, route `POST /api/leads/import` (clé d'API, fusion non destructive) et affichage dans la fiche 360° **livrés** le 19 nov. 2026. Migration appliquée et `LEADGEN_API_KEY` renseignée ; test de bout en bout OK. Reste à brancher le moteur externe et à reporter la clé dans les variables Vercel. Voir `workflows/import_leads.md` (voie 3). |
| **Accès équipe** | L'inscription en self-service est **fermée** (19 nov. 2026) : la policy `team_all` donne tout à tout utilisateur authentifié, une inscription ouverte aurait publié le fichier de prospection. À maintenir côté Supabase (« Allow new users to sign up » = OFF). Si l'équipe grandit : liste blanche de domaine ou cloisonnement par `owner_id` (changement de modèle). |
| **Table `activities`** | Créée dès `0001` mais pas encore exploitée — socle d'un journal d'échanges par entreprise. |
| **Drag & drop tactile** | Le Kanban utilise le DnD HTML5 natif : pas de support tablette. `@dnd-kit` si le besoin apparaît. |
| **Déploiement** | Préparé le 19 nov. 2026 : procédure complète dans `README.md` § 4 (variables Vercel, URLs Supabase, contrôles post-déploiement). Reste à pousser sur GitHub et à importer dans Vercel. |
