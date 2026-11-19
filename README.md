# MyCRM LeadGenPlus — Génération de leads B2B (avis Google)

CRM interne pour importer, qualifier, segmenter et travailler des commerces locaux
scrapés (Google Business Profiles / Google Maps), afin de leur proposer une solution
de génération d'avis Google.

**Stack :** Next.js 14 (App Router, TypeScript) · Tailwind · Supabase (Postgres,
Auth, RLS) · outils d'import/scoring en Python (framework WAT).

---

## Phase 1 — livré
- Onglet **Entreprises** : table type HubSpot (tri, édition inline du statut),
  drawer latéral de détail avec détail du score.
- **Import CSV/JSON** avec modèles téléchargeables + déduplication sur `place_id`.
- **Scoring « potentiel d'amélioration »** (0-100, tiers A/B/C/D), configurable.
- **Filtrage unifié** (ville, catégorie, campagne, tier, plages note/avis/score),
  synchronisé à l'URL (liens partageables), prêt à cascader sur les autres onglets.
- **Seed de 30 commerces** de démo (A14 / B7 / C6 / D3).
- Auth multi-utilisateurs (mot de passe + lien magique), RLS activée.

Onglets Contacts / Pipeline / Tâches / Analytics : placeholders (Phases 2-3).

---

## Prérequis
- Node.js 18+ et npm
- Python 3.9+ (pour les outils `tools/`)
- Un projet Supabase (gratuit) : https://supabase.com

## 1. Configuration Supabase
1. Créer un projet sur https://supabase.com.
2. Dans **Project Settings → API**, récupérer :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (secret) → `SUPABASE_SERVICE_ROLE_KEY`
3. Copier `.env.example` en `.env.local` et renseigner ces valeurs.
   (Pour les outils Python, les mêmes valeurs peuvent être dans `.env`.)

## 2. Base de données
Dans le **SQL Editor** de Supabase, exécuter dans l'ordre :
1. `supabase/migrations/0001_init.sql` (schéma, enums, RLS, triggers)
2. `supabase/seed.sql` (30 commerces de démo)
3. `supabase/migrations/0002_phase2.sql` (champs d'enrichissement, MRR, contact rattaché)
4. `supabase/seed_phase2.sql` (23 contacts + 12 opportunités de démo)
5. `supabase/migrations/0003_phase3.sql` (types de tâche, priorité, clôture auto)
6. `supabase/seed_phase3.sql` (16 tâches de démo, échéances relatives à aujourd'hui)

> Tous les scripts sont **idempotents** : les rejouer ne crée pas de doublon.
> Si la base tourne déjà avec une phase précédente, n'exécutez que les étapes manquantes.
>
> ⚠ **Exécutez l'étape 5 seule**, puis l'étape 6 dans une seconde exécution :
> Postgres interdit d'utiliser une valeur d'enum (`linkedin`, `demo`) dans la
> transaction qui vient de l'ajouter.

> **Les comptes se créent à la main**, l'application n'a pas d'inscription
> en self-service (voir *Sécurité* plus bas) : **Authentication → Users →
> Add user**, en cochant « Auto Confirm User » pour éviter l'e-mail de
> confirmation en développement.

## 3. Lancer l'app
```bash
npm install
npm run dev
```
Ouvrir http://localhost:3000 → se connecter avec le compte créé à l'étape 1
→ onglet **Entreprises**.

---

## 4. Mise en ligne (Vercel)

La base est déjà hébergée (Supabase Cloud) : il ne reste qu'à déployer le front.

### 4.1 Pousser le code sur GitHub
Le dépôt doit être **privé** : il contient le barème de scoring et la logique
commerciale. Les secrets, eux, ne partent jamais — `.gitignore` exclut
`.env`, `.env*.local`, `credentials.json` et `token.json`.

```bash
git add -A
git commit -m "Initial"
git remote add origin git@github.com:<compte>/<depot>.git
git push -u origin main
```

### 4.2 Importer le projet dans Vercel
**New Project → Import Git Repository**. Vercel détecte Next.js seul :
aucun réglage de build à toucher (`next build`, sortie `.next`).

### 4.3 Variables d'environnement (Settings → Environment Variables)
À renseigner pour **Production** *et* **Preview** avant le premier déploiement.

| Variable | Où la trouver | Obligatoire |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | oui |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon` `public` | oui |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` | oui |
| `LEADGEN_API_KEY` | générée (voir `.env.example`) | si LeadGenEngine est branché |
| `IMPORT_RATE_LIMIT_MAX` / `_WINDOW_SECONDS` | — | non (défauts : 20 / 600) |
| `LEADGEN_RATE_LIMIT_MAX` / `_WINDOW_SECONDS` | — | non (défauts : 60 / 600) |

`SUPABASE_URL` (sans préfixe) ne sert qu'aux outils Python en local : inutile sur Vercel.

> La `service_role` contourne la RLS. Elle n'est lue que par `lib/supabase/admin.ts`
> (serveur uniquement) et ne doit jamais recevoir le préfixe `NEXT_PUBLIC_`, qui
> l'exposerait au navigateur.

### 4.4 Déclarer le domaine côté Supabase
Sans cette étape, les liens magiques et les e-mails de confirmation renvoient
vers `localhost` et la connexion échoue en production.

**Supabase → Authentication → URL Configuration :**
- *Site URL* : `https://<votre-domaine>`
- *Redirect URLs* : ajouter `https://<votre-domaine>/auth/confirm`
  (et l'URL de preview Vercel si vous utilisez les déploiements de preview).

**Supabase → Authentication → Sign In / Providers :**
- **« Allow new users to sign up » = OFF.** Obligatoire, voir *Sécurité*.

### 4.5 Contrôles après déploiement
```bash
# 1. Une page protégée doit rediriger vers /login (307), jamais afficher de données
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}
" https://<domaine>/companies

# 2. L'API d'ingestion doit refuser une requête sans clé (401)
curl -s -o /dev/null -w "%{http_code}
" -X POST https://<domaine>/api/leads/import   -H "Content-Type: application/json" --data '[]'

# 3. Les en-têtes de sécurité doivent être présents
curl -s -D - -o /dev/null https://<domaine>/login | grep -i "content-security-policy"
```
Puis, dans le navigateur : connexion, les 5 onglets, et une fiche entreprise
ouverte dans le drawer.

### 4.6 Limites connues en serverless
Les rate limits des routes `/api/import` et `/api/leads/import` sont **en
mémoire du processus**. Sur Vercel, chaque instance a son propre compteur et
une instance froide repart de zéro : la protection reste utile contre une
boucle accidentelle, mais ne constitue pas un rempart contre un abus
délibéré. Pour un vrai plafond, il faudra un compteur partagé (table Postgres
ou Upstash Redis). L'authentification, elle, n'est pas concernée.

## Outils WAT (Python)
```bash
# Auto-test du scoring
python tools/compute_score.py --self-test

# Régénérer le seed depuis le CSV de démo
python tools/generate_seed_sql.py

# Régénérer le seed Phase 2 (contacts + pipeline) depuis tools/data/seed_phase2.json
python tools/generate_seed_phase2_sql.py

# Régénérer le seed Phase 3 (tâches) depuis tools/data/seed_phase3.json
python tools/generate_seed_phase3_sql.py

# Importer un fichier de leads (dry-run = sans écriture)
python tools/import_leads.py chemin/fichier.csv --dry-run
python tools/import_leads.py chemin/fichier.csv --batch-name "Resto Lyon"
```

## Structure
```
app/            # Pages Next.js (App Router) + route API d'import
components/     # UI (table, drawer, filtres, modale d'import)
lib/            # scoring, filtres, clients Supabase, types
store/          # filtre unifié (Zustand)
supabase/       # migrations SQL + seed
tools/          # WAT — scoring, import, génération seed (Python)
workflows/      # SOP (scoring, import, planification)
public/templates/  # modèles d'import CSV/JSON
```

## Sécurité
Secrets uniquement dans `.env*` (jamais committés). RLS activée. Clé service role
côté serveur uniquement. Rate limiting + validation sur l'API d'import. En-têtes de
sécurité dans `next.config.js`. Voir `secure.md` pour les checklists QA/Sécurité.

### Pourquoi l'inscription est fermée
La policy RLS `team_all` (`0001_init.sql`) accorde à **tout utilisateur
authentifié** un accès complet en lecture et écriture à l'ensemble des données
de prospection. C'est volontaire — le CRM est mono-équipe — mais cela implique
que *créer un compte = tout voir*. L'inscription en self-service est donc
fermée à deux niveaux :

1. **Côté Supabase** (ce qui l'applique réellement) : « Allow new users to
   sign up » désactivé. Les comptes sont créés dans **Authentication → Users**.
2. **Côté application** : la page de connexion n'expose aucun formulaire
   d'inscription, et le lien magique passe `shouldCreateUser: false` — sans
   cette option, `signInWithOtp` crée le compte des e-mails inconnus et
   rouvrirait la porte.

Si l'équipe doit un jour grandir sans administration manuelle, les deux pistes
sont une liste blanche de domaine (trigger Postgres sur `auth.users`) ou un
cloisonnement par `owner_id` dans la RLS — ce dernier étant un changement de
modèle de données, pas un réglage.
